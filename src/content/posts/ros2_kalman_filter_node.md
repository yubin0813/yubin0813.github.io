---
title: 'ROS2 实战：从零实现一个卡尔曼滤波节点'
description: 'ROS2与卡尔曼滤波'
pubDate: 2026-10-23
category: tech       
tags: ['ROS2','卡尔曼滤波']
---



> 本文使用 Python 和 ROS2，从零实现一个最小的卡尔曼滤波节点。不需要摄像头、IMU 或真实机器人，只需要已安装好的 ROS2 环境。

## 目录

- [一、为什么机器人需要卡尔曼滤波？](#一为什么机器人需要卡尔曼滤波)
- [二、先理解卡尔曼滤波在做什么](#二先理解卡尔曼滤波在做什么)
- [三、创建 ROS2 工作空间](#三创建-ros2-工作空间)
- [四、编写模拟传感器节点](#四编写模拟传感器节点)
- [五、编写卡尔曼滤波节点](#五编写卡尔曼滤波节点)
- [六、配置 ROS2 功能包](#六配置-ros2-功能包)
- [七、运行我们的卡尔曼滤波节点](#七运行我们的卡尔曼滤波节点)
- [八、如何判断滤波有没有效果？](#八如何判断滤波有没有效果)
- [九、总结](#十总结)

## 一、为什么机器人需要卡尔曼滤波？

刚开始学习 ROS2 时，我们通常会学习如何创建节点、发布 Topic，以及订阅其他节点发布的数据。

但当我们真正开始做机器人项目时，会遇到一个新问题：

**传感器测出来的数据，真的可靠吗？**

假设机器人停在某个位置不动，我们通过传感器读取它的位置，得到以下数据：

```text
10.2
9.8
10.1
9.9
10.3
9.7
```

可以发现，虽然机器人实际上没有移动，但测量值却一直在变化。

这是因为真实传感器会受到测量噪声、环境变化和硬件误差等因素影响。

如果我们直接把这些数据交给控制节点，机器人就可能对测量值的波动做出不必要的响应。

那么，有没有办法利用连续的测量数据，得到更加稳定、合理的估计值？

**这就是我们今天要学习的卡尔曼滤波。**

完成后，我们将拥有两个 ROS2 节点：

- `sensor_simulator`：模拟传感器，持续发布带有噪声的位置数据。
- `kalman_filter`：订阅传感器数据，进行滤波，再发布估计结果。

## 二、先理解卡尔曼滤波在做什么

在编写代码之前，我们先理解卡尔曼滤波的基本思想。

假设机器人正在运动，我们希望知道它当前的位置。

我们可以通过两种方式获取信息。

**第一种：根据之前的状态进行预测。**

例如，机器人上一时刻的位置是 10 米，按照当前运动模型，预测它下一时刻仍然接近 10 米。

**第二种：读取传感器的测量值。**

传感器这次测量得到 10.8 米，但由于存在噪声，这个结果不一定准确。

我们既不能完全相信预测，也不能完全相信测量。

卡尔曼滤波的核心思想就是：**根据预测和测量的不确定性，综合两者的信息，得到当前状态的估计值。**

它的基本流程如下：

1. 根据上一时刻的估计值，预测当前状态。
2. 接收传感器测量值。
3. 计算预测值与测量值之间的差异。
4. 根据卡尔曼增益，决定如何修正预测值。
5. 输出当前估计值，为下一次预测做准备。

这里需要注意：**卡尔曼滤波并不是简单地对最近几个数据求平均**，而是会根据模型和噪声参数调整预测与测量各自的影响。

## 三、创建 ROS2 工作空间

接下来，我们开始编写代码。

本文使用 ROS2 Python 客户端 `rclpy`，并通过 `std_msgs/msg/Float64` 传递一维位置数据。

ROS2 官方教程也采用相似的 Publisher、Subscriber 和 Python 包结构来介绍节点通信。

打开终端，创建工作空间和功能包：

```bash
mkdir -p ~/ros2_ws/src
cd ~/ros2_ws/src

ros2 pkg create kalman_demo \
  --build-type ament_python \
  --dependencies rclpy std_msgs
```

进入功能包：

```bash
cd ~/ros2_ws/src/kalman_demo
```

接下来，我们需要创建两个 Python 节点。

最终目录结构如下：

```text
ros2_ws/
└── src/
    └── kalman_demo/
        ├── package.xml
        ├── setup.py
        ├── setup.cfg
        ├── resource/
        │   └── kalman_demo
        └── kalman_demo/
            ├── __init__.py
            ├── sensor_simulator.py
            └── kalman_filter.py
```

其中，`sensor_simulator.py` 负责模拟传感器，`kalman_filter.py` 负责执行卡尔曼滤波。

## 四、编写模拟传感器节点

首先创建文件：

```text
~/ros2_ws/src/kalman_demo/kalman_demo/sensor_simulator.py
```

写入以下代码：

```python
import random

import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64


class SensorSimulator(Node):

    def __init__(self):
        super().__init__('sensor_simulator')

        self.publisher = self.create_publisher(
            Float64,
            '/sensor_position',
            10
        )

        self.true_position = 10.0

        self.timer = self.create_timer(
            0.1,
            self.timer_callback
        )

    def timer_callback(self):
        msg = Float64()

        # 模拟传感器噪声
        msg.data = self.true_position + random.gauss(0, 1.0)

        self.publisher.publish(msg)

        self.get_logger().info(
            f'Sensor: {msg.data:.3f}'
        )


def main(args=None):
    rclpy.init(args=args)

    node = SensorSimulator()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

### 4.1 这段代码做了什么？

我们重点看三个地方。

**第一，创建发布者。**

```python
self.publisher = self.create_publisher(
    Float64,
    '/sensor_position',
    10
)
```

这里创建了一个 Publisher，用于向 `/sensor_position` 发布数据。

消息类型是 `Float64`，也就是一个 64 位浮点数。

这和我们之前学习的 ROS2 发布者没有本质区别。

**第二，模拟传感器噪声。**

```python
msg.data = self.true_position + random.gauss(0, 1.0)
```

我们假设真实位置始终是 10 米，然后叠加一个随机噪声。

`random.gauss(0, 1.0)` 表示从均值为 0、标准差为 1 的高斯分布中生成随机数。

因此，传感器发布的数值会围绕 10 米上下波动。

这里的噪声是人为模拟的，并不代表真实传感器一定服从这个分布。

**第三，定时发布数据。**

```python
self.timer = self.create_timer(
    0.1,
    self.timer_callback
)
```

每隔 0.1 秒调用一次回调函数，也就是理论上每秒发布约 10 次数据。

到这里，我们就拥有了一个可以持续提供带噪声数据的 ROS2 节点。

## 五、编写卡尔曼滤波节点

现在进入本文的核心部分。

创建文件：

```text
~/ros2_ws/src/kalman_demo/kalman_demo/kalman_filter.py
```

写入以下代码：

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64


class KalmanFilterNode(Node):

    def __init__(self):
        super().__init__('kalman_filter')

        # 估计的初始位置
        self.x = 0.0

        # 初始估计的不确定性
        self.p = 1.0

        # 过程噪声
        self.q = 0.01

        # 测量噪声
        self.r = 1.0

        self.subscription = self.create_subscription(
            Float64,
            '/sensor_position',
            self.sensor_callback,
            10
        )

        self.publisher = self.create_publisher(
            Float64,
            '/filtered_position',
            10
        )

    def sensor_callback(self, msg):

        # 1. 预测
        x_pred = self.x
        p_pred = self.p + self.q

        # 2. 计算卡尔曼增益
        k = p_pred / (p_pred + self.r)

        # 3. 使用测量值修正预测
        self.x = x_pred + k * (msg.data - x_pred)

        # 4. 更新估计的不确定性
        self.p = (1.0 - k) * p_pred

        # 5. 发布滤波结果
        output = Float64()
        output.data = self.x

        self.publisher.publish(output)

        self.get_logger().info(
            f'Raw: {msg.data:.3f}, '
            f'Filtered: {self.x:.3f}'
        )


def main(args=None):
    rclpy.init(args=args)

    node = KalmanFilterNode()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

这就是我们的卡尔曼滤波节点。

它订阅原始位置数据，在回调函数中执行滤波计算，最后把估计结果发布到另一个 Topic。

### 5.1 先认识四个参数

在理解公式之前，我们先看看代码中的四个变量。

| 参数       | 含义                                   |
| ---------- | -------------------------------------- |
| `self.x` | 当前的位置估计值                       |
| `self.p` | 当前估计值的不确定性                   |
| `self.q` | 过程噪声，描述模型预测中引入的不确定性 |
| `self.r` | 测量噪声，描述传感器测量的不确定性     |

这里使用的是一个一维、线性、随机游走模型。

我们假设每次预测时，位置在短时间内保持不变：

```python
x_pred = self.x
```

由于模型本身可能存在误差，预测的不确定性会增加：

```python
p_pred = self.p + self.q
```

接着，我们就可以使用新的测量值修正预测。

### 5.2 卡尔曼增益是什么？

核心公式如下：

$$
K=\frac{P^-}{P^-+R}
$$

在代码中：

```python
k = p_pred / (p_pred + self.r)
```

其中，`p_pred` 是预测后的不确定性，`r` 是测量噪声的方差。

我们可以先用直觉理解：

- 如果预测非常不可靠，而测量比较可靠，就应该更多地参考测量。
- 如果预测非常可靠，而测量噪声很大，就应该更多地保留预测结果。

**卡尔曼增益就是用来决定修正幅度的。**

### 5.3 如何更新位置？

位置更新公式为：

$$
x=x^-+K(z-x^-)
$$

其中：

- $x^-$：预测的位置。
- $z$：传感器测量值。
- $z-x^-$：测量与预测之间的差异。
- $K$：卡尔曼增益。

对应代码：

```python
self.x = x_pred + k * (msg.data - x_pred)
```

假设预测位置是 10 米，传感器测量值是 12 米，而卡尔曼增益为 0.2。

那么：

$$
x=10+0.2(12-10)=10.4
$$

最终估计值为 10.4 米。

注意，这里的数值只是为了说明公式，不是程序某次运行的固定输出。

### 5.4 为什么还要更新不确定性？

代码最后还有一步：

```python
self.p = (1.0 - k) * p_pred
```

这是测量更新之后的不确定性计算。

在当前的一维模型下，成功融合测量后，估计的不确定性通常会降低。

下一次收到传感器数据时，滤波器会使用更新后的 `x` 和 `p` 继续计算。

这也是卡尔曼滤波和固定权重平滑方法的一个重要区别：**它会持续维护状态估计及其不确定性，并据此计算后续的卡尔曼增益。**

## 六、配置 ROS2 功能包

节点代码写完了，但还不能直接使用 `ros2 run` 启动，因为 ROS2 需要知道如何找到这两个 Python 程序。

打开 `setup.py`，将内容修改为：

```python

    entry_points={
        'console_scripts': [
            'sensor_simulator = kalman_demo.sensor_simulator:main',
            'kalman_filter = kalman_demo.kalman_filter:main',
        ],
    },
```

它将终端中的命令映射到 Python 文件里的 `main()` 函数，因此我们之后可以直接运行：

```bash
ros2 run kalman_demo sensor_simulator
```

以及：

```bash
ros2 run kalman_demo kalman_filter
```



## 七、运行我们的卡尔曼滤波节点

现在开始运行实验。

### 7.1 编译功能包

回到工作空间根目录：

```bash
cd ~/ros2_ws

colcon build
```

编译成功后，在当前终端执行：

```bash
source install/setup.bash
```

如果你的 ROS2 环境尚未加载，还需要先按照自己的 ROS2 发行版加载系统环境，例如：

```bash
source /opt/ros/<你的发行版>/setup.bash
```

请把占位符替换成实际安装的发行版名称。

### 7.2 启动模拟传感器

打开第一个终端：

```bash
source /opt/ros/<你的发行版>/setup.bash
source ~/ros2_ws/install/setup.bash

ros2 run kalman_demo sensor_simulator
```

正常情况下，你会看到类似下面的输出：

```text
Sensor: 10.523
Sensor: 9.341
Sensor: 10.186
Sensor: 8.927
Sensor: 10.672
```

每次运行得到的数值都可能不同，因为噪声是随机生成的。

### 7.3 启动卡尔曼滤波器

再打开第二个终端：

```bash
source /opt/ros/<你的发行版>/setup.bash
source ~/ros2_ws/install/setup.bash

ros2 run kalman_demo kalman_filter
```

这时，卡尔曼滤波节点会接收模拟传感器发布的数据，并输出类似下面的结果：

```text
Raw: 10.523, Filtered: 5.261
Raw: 9.341, Filtered: 6.626
Raw: 10.186, Filtered: 7.535
Raw: 8.927, Filtered: 7.882
Raw: 10.672, Filtered: 8.438
```

以上仅为格式示例，实际结果会受到随机数据影响。

刚启动时，估计值可能距离真实位置比较远，因为我们把初始估计设成了 0 米。

随着数据不断到来，估计值会逐渐接近 10 米。

### 7.4 查看 Topic

我们还可以使用之前学过的 ROS2 命令查看通信情况。

查看当前 Topic：

```bash
ros2 topic list
```

查看原始传感器数据：

```bash
ros2 topic echo /sensor_position
```

查看滤波后的数据：

```bash
ros2 topic echo /filtered_position
```

查看滤波后的位置发布频率：

```bash
ros2 topic hz /filtered_position
```


## 八、如何判断滤波有没有效果？

我们可以观察两个 Topic 的数据：

- `/sensor_position`：围绕真实位置 10 米上下波动。
- `/filtered_position`：通常更加平稳，并逐渐接近 10 米。

但要注意，**数据看起来更平稳，并不意味着结果一定更准确。**

如果我们把参数设置得不合理，滤波器可能会响应太慢，甚至在真实位置快速变化时产生明显滞后。

对于机器人而言，我们需要在**平滑程度**与**响应速度**之间做权衡。

### 8.1 尝试修改测量噪声 r

先尝试将：

```python
self.r = 1.0
```

修改为：

```python
self.r = 10.0
```

重新编译并启动节点。

测量噪声参数越大，滤波器通常越不愿意相信新的测量值，估计结果会更多地依赖之前的状态预测。

在当前这个静止位置的例子里，估计结果可能会显得更平滑，但面对真实的位置变化时，也可能反应更慢。

### 8.2 尝试修改过程噪声 q

再尝试将：

```python
self.q = 0.01
```

修改为：

```python
self.q = 1.0
```

过程噪声越大，模型预测的不确定性增长得越快，滤波器通常会更重视新测量值。

这样估计结果可能更快跟随测量变化，但也可能保留更多测量噪声。

> 注意：`q` 和 `r` 都应与实际系统的噪声特性相匹配，不应仅凭数值大小判断它们是否合理。

## 九、总结

这次实验，我们完成了三个目标：

1. 理解卡尔曼滤波的基本流程：预测、测量更新和状态估计。
2. 编写了一个能够订阅传感器数据、执行滤波并发布结果的 ROS2 节点。
3. 学会了使用 `ros2 topic` 观察数据，并通过调整 `q` 和 `r` 理解滤波参数的影响。

对于刚学完 ROS2 的同学来说，这个实验最重要的意义并不是掌握了多少数学公式，而是**理解了如何把一个算法封装进节点，并通过 Topic 与其他模块配合**。
