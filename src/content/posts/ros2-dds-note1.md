---
title: '第二篇博客'
description: '为什么发布者和订阅者不需要知道对方存在？'
pubDate: 2026-09-22
category: tech       
tags: ['ros']
---

# 为什么发布者和订阅者不需要知道对方存在？

## 起因

照教程写了最小的发布订阅，核心就两行：

```python
# 发布者
self.pub = self.create_publisher(String, 'chatter', 10)

# 订阅者
self.create_subscription(String, 'chatter', self.on_msg, 10)
```

跑起来能通。可仔细一想：两个节点，发布者没写"发给谁"，订阅者也没写"从谁那收"，两边代码里都没提对方一个字，数据却过去了。

我一开始的反应是：那它到底是怎么找到对方的？于是顺着"话题通信靠什么"一路查下去——DDS、发现机制、组播、端点交换……查了一大圈。

但查完之后我发现，DDS 回答的全是"怎么找"，而我的困惑根本不在"找"上。我真正卡住的是： 为什么我们的代码里可以不提对方？ 按惯性思维，通信就该有明确的对象，比如：函数调用要写函数名，python用import 模块名调用模块。在这里，"对方"却从必填项变成了可选项。

于是问题被修正为： **不需要知道对方存在"这个设计，为什么是成立的**

这篇就记录一下我想通这个问题的过程。

## 第一个搞明白的点：两边依赖的是一份"契约"，不是对方

两边共同写的东西只有三样：

- **话题名**（chatter）
- **消息类型**（String）
- **QoS**（那个 10，是 KEEP_LAST depth=10 的简写）

就这三样，没了。没有对方的 IP、名字、数量、启动顺序——什么都没有。

这让我想到一个类比：广播电台在 98.5 FM 播节目，它不需要知道有谁在听、几个人在听、听众什么时候开收音机。它只管在一个约定的频率上、用约定的格式发信号。听众想听就调到 98.5 FM。双方约定的只是"频率 + 内容格式"，不需要认识对方。

ROS2 里的"频率 + 格式"就是那三样东西：话题名 + 消息类型 + QoS。我把它叫**契约**，双方只认契约，不认人。

## 第二个搞明白的点：为什么"只认契约"就够了

光有契约还不够，得有人替你把契约兑现。如果没人管，那发布者就只是在往一个没人听的话题上发消息，订阅者就是在空等。

替你兑现的就是 DDS。ROS2 的话题通信采用的是DDS。节点启动后，DDS 在背后干了一些事，我简单理了一下：

1. 在网络上发布自己的信息，同时看别人的；
2. 发现彼此后，交换详细信息：我有哪些发布者/订阅者、话题名、类型、QoS；
3. 各自在本地判断"对得上暗号吗"——话题名一致、类型一致、QoS 兼容；
4. 对上了就直连传数据，不经过任何中间人。

关键在于：这些事全是 DDS 干的，节点的代码里一行都没写。发布者只负责"往契约上发"，订阅者只负责"从契约上收"，中间的找人、对暗号、建连接，DDS 全包了。

所以"不需要知道对方存在"能成立，靠的是两件事叠在一起：

- **契约是双方唯一的依赖**——代码里只要写"话题名 + 类型 + QoS"；
- **DDS 是契约的担保人**——运行时替你把契约变成实际的连接。

缺任何一项都不行：有契约没人担保，消息就飘在空中；有人担保但契约没写对，也连不上。

## 动手验证

为验证想法，我做了两个实验。

### 实验一：订阅者想什么时候来就什么时候来

发布者加个定时器，顺便打印当前订阅者数量：

```python
# talker.py
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class Talker(Node):
    def __init__(self):
        super().__init__('talker')
        self.pub = self.create_publisher(String, 'chatter', 10)
        self.count = 0
        self.timer = self.create_timer(1.0, self.tick)

    def tick(self):
        msg = String(data=f'tick {self.count}')
        self.count += 1
        self.pub.publish(msg)
        self.get_logger().info(f'发布: {msg.data} | 订阅者数量: {self.pub.get_subscription_count()}')


def main():
    rclpy.init()
    rclpy.spin(Talker())


if __name__ == '__main__':
    main()
```

```python
# listener.py
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class Listener(Node):
    def __init__(self):
        super().__init__('listener')
        self.create_subscription(String, 'chatter', self.on_msg, 10)

    def on_msg(self, msg):
        self.get_logger().info(f'收到: {msg.data}')


def main():
    rclpy.init()
    rclpy.spin(Listener())


if __name__ == '__main__':
    main()
```

两个终端运行：

```bash
# 终端 1
source /opt/ros/humble/setup.bash   # 按你的发行版调整
python3 talker.py

# 终端 2，想什么时候起就什么时候起
source /opt/ros/humble/setup.bash
python3 listener.py
```

时间线：

```
# 只开终端 1
[INFO] 发布: tick 0 | 订阅者数量: 0
[INFO] 发布: tick 1 | 订阅者数量: 0

# 终端 2 启动后一两秒
[INFO] 发布: tick 7 | 订阅者数量: 1
# 终端 2 开始打印：收到: tick 7 ...

# Ctrl-C 掉终端 2
[INFO] 发布: tick 15 | 订阅者数量: 0
```

订阅者数量：`0 → 1 → 0` 就是关键：

- 开头是 0：发布者启动时订阅者不存在，它照样发；
- 变成 1：订阅者来了，DDS 自动对接上了，发布者什么都没改；
- 变回 0：订阅者走了，发布者继续发。

从头到尾，发布者能不能正常工作，从来不依赖订阅者是否存在。

### 实验二：契约对不上，认识也没用

实验一证明"不依赖对方存在"。那反过来：如果 DDS 都帮两边认识了，但契约对不上，能通吗？

我故意让发布端用 Twist，订阅端只改变消息类型：

```python
# sensor_pub.py —— 故意用 Twist发布
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist



class SensorPub(Node):
    def __init__(self):
        super().__init__('sensor_pub')
  
        self.pub = self.create_publisher(Twist, 'sensor', 10)
        self.timer = self.create_timer(1.0, self.tick)

    def tick(self):
        msg = Twist()
        msg.linear.x = 0.5 
        self.pub.publish(msg)
        self.get_logger().info(f'发布 Twist | 订阅者数量: {self.pub.get_subscription_count()}')


def main():
    rclpy.init()
    rclpy.spin(SensorPub())
  
if __name__ == '__main__':
    main()
```

```python
# sensor_sub.py —— 关键：话题名照抄 'sensor'，但类型故意用 String 去收 Twist
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class Listener(Node):
    def __init__(self):
        super().__init__('listener')
        self.create_subscription(String, 'sensor', self.on_msg, 10)

    def on_msg(self, msg):
        self.get_logger().info(f'收到: {msg.data}')


def main():
    rclpy.init()
    rclpy.spin(Listener())

if __name__ == '__main__':
    main()
```

现象特别迷惑：

- `sensor_pub` 永远打印 `订阅者数量: 0`，没有任何报错；
- 但 `ros2 topic list` 能看到 `/sensor`——说明话题已经发出去了；
- `ros2 topic info /sensor -v` 能看到两端Topic type不一致：Publisher 是`geometry_msgs/msg/Twist` 、Subscription 是 `std_msgs/msg/String`。

对照前面说的四件事：DDS 的第 1、2 步**成功了**，但第 3 步对暗号**没过**。

这个实验反过来证明了：**契约是唯一的依赖**。就算 DDS 把两边拉到面前认识了，契约对不上，照样不通信。认识不等于能对话。

## 代价

搞明白之后我回头看，"不需要知道对方存在"这个设计的好处很明显：写代码简单、组件随便加减。但它有个让人不太舒服的副作用——

平时调试，报错信息是起点。而 DDS 匹配失败连个异常都不给你，就是静默不通信。你只能靠工具反推：

- `ros2 topic info <话题> -v`：把两端摆出来对表。

## 总结

写完这篇我最大的收获是想通了这件事的逻辑链：

> 双方的代码只写了契约（话题名 + 消息类型 + QoS），没写对方是谁；DDS 在运行时把契约变成实际的连接。所以"不需要知道对方存在"不是因为不关心，而是契约把"对方是谁"这件事抽象掉了，最后让DDS兜底。

一句话：不是"不需要知道"，而是"契约让知道变得不必要"。
