---
title: '用 xacro 搭建机器人 URDF 模型：从底盘到总装'
description: '记录使用 xacro 分模块搭建机器人底盘、传感器与轮子的完整流程'
pubDate: 2026-10-02
category: tech
tags: ['ros', 'urdf', 'xacro']
---

# 用 xacro 搭建机器人 URDF 模型：从底盘到总装

URDF 是 ROS 中描述机器人模型的标准格式，但直接写 URDF 有明显的不足：尺寸全部硬编码、重复结构只能复制粘贴、一个模型只能塞进一个大文件。xacro 作为 URDF 的预处理语言，通过属性、宏和文件包含解决了这三个问题，适合用来搭建结构稍复杂的机器人。

下面按照"先准备、后底盘、再传感器和轮子、最后总装"的顺序，完整走一遍搭建流程。

## 一、准备

首先创建一个 `ament_cmake` 功能包，并在包下新建 `urdf` 文件夹，用来存放后续所有模型文件。

```xml
<!-- common_inertia.xacro：惯性计算文件，定义 box_inertia、cylinder_inertia 等宏 -->
<?xml version="1.0"?>
<robot xmlns:xacro="http://ros.org/wiki/xacro">

  <!-- 长方体惯性：m质量 w宽(x) h高(z) d深(y) -->
  <xacro:macro name="box_inertia" params="m w h d">
    <inertial>
      <mass value="${m}"/>
      <inertia ixx="${(m/12)*(h*h+d*d)}" ixy="0.0" ixz="0.0"
               iyy="${(m/12)*(w*w+d*d)}" iyz="0.0"
               izz="${(m/12)*(w*w+h*h)}"/>
    </inertial>
  </xacro:macro>

  <!-- 圆柱体惯性：m质量 r半径 h高（圆柱轴线沿z） -->
  <xacro:macro name="cylinder_inertia" params="m r h">
    <inertial>
      <mass value="${m}"/>
      <inertia ixx="${(m/12)*(3*r*r+h*h)}" ixy="0.0" ixz="0.0"
               iyy="${(m/12)*(3*r*r+h*h)}" iyz="0.0"
               izz="${(m/2)*(r*r)}"/>
    </inertial>
  </xacro:macro>

</robot>
```

需要说明的是，每个 link 都要声明惯性张量。与其每次手算，不如把常见几何体的惯性公式封装成宏，集中放在一个文件里，之后每写一个 link 直接调用对应宏即可。

## 二、创建底盘本体

接下来在 `base.urdf.xacro` 中创建底盘。一个 link 需要同时包含三部分信息：外观 `<visual>`、碰撞 `<collision>` 和惯性 `<inertial>`。

```xml
<!-- base.urdf.xacro -->
<?xml version="1.0"?>
<robot xmlns:xacro="http://ros.org/wiki/xacro">

  <!-- 引入惯性计算工具 -->
  <xacro:include filename="$(find my_robot_description)/urdf/common_inertia.xacro"/>

  <xacro:macro name="base_xacro" params="length width height mass wheel_radius">

    <!-- 虚拟部件：地面锚点 -->
    <link name="base_footprint"/>

    <!-- 把底盘抬到"轮子刚好贴地"的高度 -->
    <joint name="base_joint" type="fixed">
      <parent link="base_footprint"/>
      <child link="base_link"/>
      <origin xyz="0 0 ${height/2 + wheel_radius}" rpy="0 0 0"/>
    </joint>

    <!-- 底盘：外观+碰撞+惯性一次写完 -->
    <link name="base_link">
      <visual>
        <origin xyz="0 0 0" rpy="0 0 0"/>
        <geometry>
          <box size="${length} ${width} ${height}"/>
        </geometry>
        <material name="body_blue">
          <color rgba="0.2 0.5 0.9 1"/>
        </material>
      </visual>
      <collision>
        <origin xyz="0 0 0" rpy="0 0 0"/>
        <geometry>
          <box size="${length} ${width} ${height}"/>
        </geometry>
      </collision>
      <xacro:box_inertia m="${mass}" w="${length}" h="${height}" d="${width}"/>
    </link>

  </xacro:macro>
</robot>
```

有两点需要注意：一是自闭合标签（如 origin）末尾要带 `/`；二是 collision 只关心几何形状，把 visual 里的 origin 和 geometry 复制过来即可，不需要材质。

## 三、虚拟部件贴地

底盘建好之后，模型的根 link 并不在地面上，需要借助一个虚拟部件调整整体高度。做法是：

1. 创建一个空 link `base_footprint`，作为锚点固定在地面上；
2. 用 fixed 关节连接，parent 为 `base_footprint`，child 为底盘；
3. origin 的 z 值设为"底盘高度的一半 + 轮子半径"，使轮子刚好贴地。

```xml
<!-- 虚拟部件贴地 -->
<link name="base_footprint"/>

<joint name="base_footprint_joint" type="fixed">
  <parent link="base_footprint"/>
  <child link="base_link"/>
  <origin xyz="0 0 底盘高度/2+轮子半径" rpy="0 0 0"/>
</joint>
```

这个高度值不是固定的，取决于具体机器人的底盘高度和轮子尺寸。

## 四、传感器部件

相机、激光雷达、IMU 等传感器，每个单独建一个文件，例如 `camera.urdf.xacro`。写法和底盘完全一致：link 中写齐 visual、collision、inertial，再用 fixed 关节固定到底盘上。

```xml
<!-- camera.urdf.xacro -->
<?xml version="1.0"?>
<robot xmlns:xacro="http://ros.org/wiki/xacro">
  <xacro:include filename="$(find my_robot_description)/urdf/common_inertia.xacro"/>

  <!-- 相机：小方块，装在底盘前上方 -->
  <xacro:macro name="camera_xacro">
    <link name="camera_link">
      <visual>
        <geometry><box size="0.03 0.08 0.03"/></geometry>
        <material name="black"><color rgba="0.1 0.1 0.1 1"/></material>
      </visual>
      <collision>
        <geometry><box size="0.03 0.08 0.03"/></geometry>
      </collision>
      <xacro:box_inertia m="0.05" w="0.03" h="0.03" d="0.08"/>
    </link>
    <joint name="camera_joint" type="fixed">
      <parent link="base_link"/>
      <child link="camera_link"/>
      <origin xyz="0.10 0 0.05" rpy="0 0 0"/>
    </joint>
  </xacro:macro>

  <!-- 雷达：扁圆柱，装在底盘顶部中央 -->
  <xacro:macro name="laser_xacro">
    <link name="laser_link">
      <visual>
        <geometry><cylinder radius="0.04" length="0.04"/></geometry>
        <material name="gray"><color rgba="0.5 0.5 0.5 1"/></material>
      </visual>
      <collision>
        <geometry><cylinder radius="0.04" length="0.04"/></geometry>
      </collision>
      <xacro:cylinder_inertia m="0.2" r="0.04" h="0.04"/>
    </link>
    <joint name="laser_joint" type="fixed">
      <parent link="base_link"/>
      <child link="laser_link"/>
      <origin xyz="0 0 0.08" rpy="0 0 0"/>
    </joint>
  </xacro:macro>

  <!-- IMU：虚拟部件，只要惯性，不要外观 -->
  <xacro:macro name="imu_xacro">
    <link name="imu_link">
      <xacro:box_inertia m="0.01" w="0.02" h="0.01" d="0.02"/>
    </link>
    <joint name="imu_joint" type="fixed">
      <parent link="base_link"/>
      <child link="imu_link"/>
      <origin xyz="0 0 0.02" rpy="0 0 0"/>
    </joint>
  </xacro:macro>

</robot>
```

关节 origin 描述的是传感器相对底盘的安装位置，不同传感器按实际安装位置填写。

## 五、轮子（用宏复用）

四个轮子结构完全相同，只是名称和位置不同，正好用宏来参数化：定义一次，调用四次。

```xml
<!-- wheel.urdf.xacro -->
<?xml version="1.0"?>
<robot xmlns:xacro="http://ros.org/wiki/xacro">
  <xacro:include filename="$(find my_robot_description)/urdf/common_inertia.xacro"/>

  <!-- 参数化轮子：传名字和安装位置就能造一个 -->
  <xacro:macro name="wheel_xacro" params="wheel_name xyz">
    <link name="${wheel_name}_link">
      <visual>
        <geometry><cylinder radius="0.032" length="0.02"/></geometry>
        <material name="dark"><color rgba="0.2 0.2 0.2 1"/></material>
      </visual>
      <collision>
        <geometry><cylinder radius="0.032" length="0.02"/></geometry>
      </collision>
      <xacro:cylinder_inertia m="0.05" r="0.032" h="0.02"/>
    </link>
    <joint name="${wheel_name}_joint" type="continuous">
      <parent link="base_link"/>
      <child link="${wheel_name}_link"/>
      <!-- 轮子圆柱默认轴线沿z（立着），绕x转90°放平当轮轴 -->
      <origin xyz="${xyz}" rpy="1.5708 0 0"/>
      <axis xyz="0 0 1"/>
    </joint>
  </xacro:macro>

</robot>
```

轮子的关节类型为 continuous，可以连续转动。另外，圆柱体几何默认轴向是 z 方向，即轮轴朝上，需要在 origin 的 rpy 中绕相应轴旋转 90°，让轮轴水平。

## 六、总装文件

所有部件完成后，新建主文件 `robot.urdf.xacro`，先 include 引入各个部件文件，再依次调用对应的宏。

```xml
<!-- robot.urdf.xacro -->
<?xml version="1.0"?>
<robot name="my_robot" xmlns:xacro="http://ros.org/wiki/xacro">

  <!-- 引入所有部件 -->
  <xacro:include filename="$(find my_robot_description)/urdf/base.urdf.xacro"/>
  <xacro:include filename="$(find my_robot_description)/urdf/sensors.urdf.xacro"/>
  <xacro:include filename="$(find my_robot_description)/urdf/wheel.urdf.xacro"/>

  <!-- 底盘：长0.24 宽0.16 高0.06 重1.5kg，轮子半径0.032 -->
  <xacro:base_xacro length="0.24" width="0.16" height="0.06" mass="1.5" wheel_radius="0.032"/>

  <!-- 传感器 -->
  <xacro:camera_xacro/>
  <xacro:laser_xacro/>
  <xacro:imu_xacro/>

  <!-- 四个轮子：只改名字和位置 -->
  <xacro:wheel_xacro wheel_name="left_front"  xyz="0.08 0.09 -0.03"/>
  <xacro:wheel_xacro wheel_name="left_rear"   xyz="-0.08 0.09 -0.03"/>
  <xacro:wheel_xacro wheel_name="right_front" xyz="0.08 -0.09 -0.03"/>
  <xacro:wheel_xacro wheel_name="right_rear"  xyz="-0.08 -0.09 -0.03"/>

</robot>
```

至此整个模型的框架就搭好了。把各部分代码补充完整后，可以先用 xacro 命令将总装文件展开为纯 URDF 检查，再放入 RViz 中可视化验证。

## 总结

这套搭建流程的核心是模块化：每个部件单独成文件，重复结构抽象成宏，惯性计算集中管理。后续调整模型时，只需要修改对应文件或宏参数，不需要在大段重复代码中搜索修改。