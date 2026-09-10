---
title: 'python学习笔记'
description: '记录python学习过程的笔记'
pubDate: 2026-09-10
tags: ['python']
---
# Python 复习笔记

## 一、对象模型（核心心智模型）
- **变量是标签不是盒子**：对象是实物（有 id/type/值），变量是命名空间里指向对象的名字；`b = a` 是贴同一标签，不复制；`del` 删名字不删对象
- **两个动作**：原地修改（受可变/不可变限制）vs 重新绑定（永远允许）；不可变对象（int/str/tuple）没有原地修改，"改动" = 新对象 + 重新贴标签
- `is` 比对象身份（id），`==` 比值（可被 `__eq__` 重载）；`is` 用于 None / 布尔判断
- None 是单例，与 0/""/[]/{} 无关（后者只是布尔假值集合）

## 二、基础语法
- int 无大小限制；无独立字符类型；布尔 `True/False` 大写
- 字符串：`+` 拼接、`*` 重复、f-string `f"{x}"`
- 运算：`//` 整除向下取整、`**` 幂；逻辑用 `and/or/not`（and/or **返回操作数本身**，非布尔值）
- `input()` 返回字符串，计算前需 `int()/float()` 转换
- 多变量赋值 / 直接交换：`a, b = b, a`
- `in` 判元素是否在容器内

## 三、流程控制
- 条件表达式：`A if 条件 else B`
- `match/case` 类似 switch
- `for x in 可迭代对象`；`range(start, stop, step)` 左闭右开
- `for...else`：循环没被 break 才执行 else
- `enumerate(x)` 同时拿索引和元素

## 四、函数
- 无 return / 空 return → 返回 None；可返回多值（本质是元组）
- 函数体首行字符串 = docstring（`help()` / `__doc__` 查看）
- 参数顺序：**位置 → 默认 → \*args（收多余位置参数为元组）→ \*\*kwargs（收关键字参数为字典）**
- `lambda`：单表达式匿名函数，不能写多行语句
- 参数传递：不可变对象在函数内改不影响外部；可变对象原地修改会影响外部（同一对象）

## 五、数据结构

**列表**
- 增：`append(x)` 末尾 / `insert(i, x)` 指定位置 / `extend(列表)` 合并
- 改：`lst[i] = x`
- 删：`remove(值)` 按值删第一个 / `del lst[i]` 按索引删 / `pop()` 删末尾并返回
- 推导式：`[表达式 for x in 序列 if 条件]`
- 切片 `[start:stop:step]` 左闭右开，`[::-1]` 反转

**元组**
- 单元素必须 `(5,)`；不可变；可解包，`*` 收集剩余

**字典**
- 增改：`d[k] = v`
- 删：`del d[k]` / `d.pop(k, 默认值)`
- 遍历：`for k, v in d.items()`
- 推导式 `{k:v for ...}`，常用于反转字典

**字符串**
- 不可变；`"".join(列表)` 高效拼接；`strip()` 去空格；`replace()` 替换
- `split(",")` 切分成列表；`list(s)` 转字符列表

## 六、文件与异常
- 推荐 `with open(...) as f:`（自动关闭）；加 `encoding="utf-8"` 防中文乱码
- 模式：`r` 只读（不存在报错）/ `w` 覆盖写（不存在创建）/ `a` 追加 / `x` 独占创建（存在则报错）
- 读取：
  1. `read()` 整个内容（小文件）
  2. `readlines()` 行列表（带换行符）
  3. `for line in f` 逐行（**大文件推荐，省内存**）
- `write()` 不自动加换行
- 异常结构：`try / except / else（无异常才执行）/ finally（必执行）`
- `raise` 主动抛出，让错误尽早暴露；自定义异常继承 `Exception`
- 常见异常：ValueError（值不合法）/ TypeError（类型不对）/ IndexError（索引越界）/ FileNotFoundError（文件不存在）/ NameError（未定义变量）

## 七、模块
- `import math`
- `import numpy as np`
- `from math import sqrt, pi`
- `from math import sqrt as sq`
- 目录下放 `__init__.py` 标志为包

## 八、面向对象
- `class` 定义；实例方法第一参数 `self`
- `__init__` 内 `self.x=` 是实例属性；类体内直接定义的是类属性（所有实例共享，用于计数 / 默认配置）
- 三种方法：
  - 实例方法：访问实例属性
  - `@classmethod`（参数 `cls`）：操作类属性 / **替代构造方法**（如 `from_string` 实现多种创建方式）
  - `@staticmethod`：无 self/cls，类命名空间里的普通函数
- 特殊方法（双下划线）：`__init__` 创建时触发、`__str__` 被 print/str 触发；默认继承 object（不重写 `__str__` 会打印 `<__main__.Foo object at 0x...>`）
- 继承 `class Dog(Animal)`；重写后调父类用 `super().方法()`
- 多态 / 鸭子类型：只关心有没有方法，不关心类型
- `isinstance` 考虑继承关系，`type()` 不考虑

## 九、迭代器 / 生成器 / 装饰器
- 迭代器：实现迭代协议；**一次性**，遍历完耗尽，需重新 `iter()`；列表可反复遍历是因为每次 for 新建迭代器
- 生成器：`yield` 代替 return，**惰性求值**；生成器表达式 `(i**2 for i in range(100))`，只遍历一次时用
- 装饰器：接收函数、返回新函数；`@log` 等价于 `函数 = log(函数)`
- 写装饰器加 `@functools.wraps(func)`，否则被装饰函数的 `__name__/__doc__` 会变成 wrapper

## 十、标准库速记
- **json**：
  - `dumps/loads` 处理字符串（Python 对象 ↔ JSON 字符串）
  - `dump/load` 读写文件
  - `ensure_ascii=False` 显示中文；`indent=2` 美化
- **datetime**：`strptime("%Y%m%d %H:%M")` 字符串解析为时间
- **类型注解**：变量 `x: int = 值`；函数参数 `x: int`、返回值 `-> int`（仅提示，不强制运行时检查）

---

## 重点复习标记
- 变量标签模型（对象层 vs 名字层）
- `is` vs `==`（身份 vs 值，对照实验）
- 可变 vs 不可变（原地修改 vs 重新绑定）
- 装饰器 `@wraps` 的作用
- None 是单例，与空容器无关
