---
title: 'Python语法学习'
description: '记录从零基础学python的过程和其中的知识点。'
pubDate: 2026-09-10
category: tech
tags: ['python']
---

变量为标签而不是盒子
python的int没有大小限制，没有单独的字符类型
字符串支持用+拼接，用*重复，布尔值首字母大写
print（f"{x},{y}"）
类型转换，int（）。input()输出的为字符串，需要用类型转换成整数或者浮点数才能用公式计算。
//整除向下取整，**为幂运算，用and,or,not替代，&&,||,!；and和or返回的是操作数本身而不是布尔值。
python可以一行给多个变量赋值，利用这个可以直接交换两个变量的值，而不需要临时变量。
is比较是否为同一个对象（内存地址是否相同）一般用于None和布尔值
in判断某个元素是否在一个容器里

条件表达式：值A if 条件 else 值B：条件为真取A，否则取B
match/case，相当于其他语言的switch
for 变量 in 可迭代对象:
range(1,6,2)从1开始，步长为2，到5结束，左闭右开。
for...else,当for循环没遇到break时，执行else。
enumerate(x)同时获取索引和元素。

函数用return返回结果，不写return和只写return就返回None
函数可以直接返回多个值
函数体第一行如果是字符串，例："""123abc"""，会作为函数的文档:用help(函数名)，函数名.__doc__可查看。
调用时按顺序传参叫位置参数，按参数名传参叫关键字参数,参数可以设置默认值，不传参就用默认值:
不确定要传多少个参数时用*args，表示把多余的位置参数都收进args这个元组里。**kwargs收集多余的关键字参数成字典。
Lambda，用于写单个表达式，而不能写多行语句。
普通位置参数 → 默认参数 → *args → **kwargs
不可变对象，例如int，在函数中修改不能改变其原本的值。
可变对象，例如列表，在函数中修改会改变原本的值

列表：
nums = [1, 2, 3]
# 增
nums.append(4)          # 末尾添加：[1, 2, 3, 4]
nums.insert(0, 0)       # 指定位置插入：[0, 1, 2, 3, 4]
nums.extend([5, 6])     # 合并另一个列表：[0, 1, 2, 3, 4, 5, 6]
# 改
nums[0] = 100           # 按索引修改
# 删
nums.remove(100)        # 按值删除第一个匹配项
del nums[0]             # 按索引删除
popped = nums.pop()     # 删除末尾并返回它
列表推导式：[表达式 for 变量 in 序列 if 条件]
切片：
用[start:stop:step]取一段子列表，遵循左闭右开[::-1]为反转1
元组：
单元素元组必须加(5,)，元组不可修改，元组可以解包到多个变量，可以用*收集剩余元素。

字典：
person = {"name": "Alice"}

# 增/改：直接赋值
person["age"] = 25        # 新增
person["name"] = "Bob"    # 修改已有键

# 删
del person["age"]         # 删除指定键
age = person.pop("age", None)  # 删除并返回值，键不存在返回默认值
# 遍历键值对（最常用）
for key, value in person.items():
    print(f"{key}: {value}")
字典推导式与列表推导式相似:{键表达式：值表达式 for 变量 in 可迭代对象}也可以加条件常见用途为反转字典。

字符串:
字符串不可修改，任何修改都是创建一个新的字符串。
字符串拼接用"".join(["","",""])效率高。
用strip()去掉前后空格，replace("原字符","新字符")替换字符或去掉空格。
可用split（","）将字符串按”,“分割为列表,将列表转换为字符串用“分隔符”.join(列表名)拼接，将字符串转换为字符列表可用list("字符串")。

文件读写：
用with语句会在代码块结束时自动关闭文件，推荐写法with open（“文件名”，“r/w/a/x”）as f:
open()第二个参数“r”只读，文件不存在时报错，"w"写入（覆盖），文件不存在时创建,"a"追加，文件不存在时创建,"x"独占创建，文件已存在时报错。
文件读取的三种方式：
1.read（），直接返回整个文件内容（一个字符串），用于小文件。
2.readlines（）返回所有行组成的每行末尾带换行符。适合需要随机访问某几行的场合，但同样会一次性加载全部内容。
3.用for循环遍历文件对象一次只读一行到内存。这是处理大文件的推荐方式——无论文件多大，内存占用都很小
写入文件：
.write()不会自动加换行符
用open打开时在最后一个参数加上，encoding="utf-8"就可以避免绝大多数跨平台中文乱码问题。

异常处理：try：expect else： finally：是try完整结构，其中try报错来到expect，没报错来到else，最后不管有没有报错都需要经过finally
raise重新抛出异常和主动抛出异常，目的是让错误尽早暴露
自定义异常：当异常类型不足时，可编写一个Exception的子类自定义异常。
常见异常 ValueError,TypeError,IndexError,FileNotFoundError,NameError，分别代表值不合法，类型不对，索引越界，文件不存在，使用未定义变量。

模块：
# 形式一：导入整个模块，当模块和主函数在同一个文件夹，导入标准库时用这个
import math
print(math.sqrt(16))   # 4.0

# 形式二：导入模块并起别名
import numpy as np
print(np.array([1, 2, 3]))

# 形式三：从模块导入特定名字，当模块在另一个文件夹时用这个
from math import sqrt, pi
print(sqrt(16))        # 不需要 math. 前缀
print(pi)

# 形式四：从模块导入并起别名
from math import sqrt as square_root
print(square_root(16))
要在包里放__init__.py,同时这个文件也标志着一个目录是包

面向对象：
面向对象的核心是把数据和处理数据的行为组织在一起，比如创建一个对象为狗，然后狗的属性有体重，速度，饭量等，然后狗还有狗的叫声，跑步姿势等方法，这些全部放在狗这个对象里。Python 用 class 定义类
每个方法第一个参数必须是self，它指向调用该方法的实例本身。
实例属性：在__init__里用self.xxx =定义的是实例属性
类属性：在类体里，不在方法里，所有实例共享，一般用于和整个类相关的数据，如实例技术，配置默认值
方法：
实例方法：访问实例属性。
类方法：用@classmethod，第一个参数是类本身，约定叫cls。用途为操作类属性。提供替代构造方法（如 from_string），用不同方式创建实例。这是类方法最常见的应用场景——一个类需要多种创建方式时，用类方法比给 __init__ 塞一堆参数更清晰。
静态方法：用 @staticmethod 装饰，没有 self 也没有 cls，相当于放在类命名空间里的普通函数：
特殊方法：以双下划线开头和结尾的方法。它们有特定的触发场景，如init创建实例时自动触发，str调用print()和str（）时自动触发。

继承与多态：
继承：class Dog(Animal)表示Dog继承了Animal，子类自动拥有父类的方法和属性
子类可以对方法重写，如果重写后要调用父类方法需要用super().方法名
多态：
鸭子类型：如果一只鸟走起来像鸭子、叫起来像鸭子，那它就是鸭子。
只关心有没有特定的方法，不关心是谁。

isinstance 判断类型会考虑继承关系，type不会考虑
所有类隐式继承object自定义类如果不重写这些方法，就用 object 的默认实现——比如 print(对象) 会输出类似 <__main__.Foo object at 0x...>，这就是默认的 __str__。
迭代器是实现了两个方法的对象：
迭代器是一次性的，遍历完就耗尽，不会回到开头，想再遍历要用 iter() 重新获取新的迭代器。列表本身可以被反复遍历，是因为每次 for 都新建一个迭代器。
生成器：用yield替代return，最大的特点为惰性求值，值在需要时才生成。
生成器表达式：(i ** 2 for i in range(100))，只遍历一次时用生成器

装饰器：
把通用的横切逻辑（日志、计时、权限检查等）从函数里抽出来，复用到多个函数上。
主要是用于接收函数，返回新函数的函数
@log等价于函数 = 装饰器log（函数），log返回wrapper
被装饰的函数__name__等属性会变成wrapper,用 functools.wraps 保留原函数信息，@wraps(func) 把原函数的名字、文档字符串等复制到 wrapper 上。写装饰器时养成加 @wraps 的习惯

json：
dumps：dump string，Python 对象 → JSON 字符串。
loads：load string，JSON 字符串 → Python 对象。
ensure_ascii=False：让中文直接显示，不转成 \uXXXX。
indent=2：缩进美化输出，便于人读。
读写json
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
# 读取文件
with open("data.json", "r", encoding="utf-8") as f:
    obj = json.load(f)
datetime：
strptime("%Y%m%d %H:%M")

类型注解：
变量名：类型 = 值
函数：
参数：类型；标注参数
->类型标注返回值
