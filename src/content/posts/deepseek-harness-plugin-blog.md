---
title: '一切皆插件：DeepSeek Harness 为什么重做了 AI Agent 的底盘'
description: 'deepseek harness 与其他agent的区别'
pubDate: 2026-10-11
category: tech
tags: ['deepseek harness']
---



> Agent = Model + Harness。模型决定智能的上限，Harness 决定上限的兑现率。

2026 年 8 月，DeepSeek 以 MIT 协议开源了 DeepSeek Harness，并为它启用了独立的黑鲸品牌——刻意与蓝鲸模型区分。它开源的不是模型，而是模型周围的一切：Agent 的编排层。

## 一、什么是 Harness

把模型比作发动机，Harness 就是方向盘、传动系统和仪表盘。具体包括：项目规则、工具配置、任务拆分与执行顺序、错误重试、上下文管理、测试检查流程。模型负责思考，Harness 负责把思考接入文件系统、终端、浏览器和 API，真正把任务做完。

## 二、为什么这一层值得重做

Composio 做过一组控制变量实验：**同一个 DeepSeek V4-Flash 模型**，放进 8 种不同 Harness，各完成 30 个真实多步任务（Gmail、GitHub、Slack 等）：

- 最佳 Harness 通过 20/30，最差仅 14/30；
- 8 种配置全部能完成的任务只有 6 个；
- 每成功一个任务的成本从 $0.045 到 $0.195，**相差 4.3 倍**。

模型完全相同，差距全部来自 Harness 层。既然如此关键，这一层就不该焊死成黑盒——它的每个决策都应当可替换、可重组。这就是「一切皆插件」的出发点。

## 三、一切皆插件是什么意思

Harness 建在微内核 Cordis 之上。内核只管插件的挂载、卸载和依赖，Agent 的全部能力都是平级插件：

- **模型**：DeepSeek、Claude、GPT 或自研模型，换模型只是改配置；
- **工具 / 技能**：Shell、编辑器、搜索等按需装配；
- **会话**：追加式日志，模型看到的一切都可回放、分叉；
- **沙箱 / 存储**：企业可替换为自有合规边界和内网存储；
- **推理循环 / 调度 / UI**：连 Agent 主循环和界面本身都是插件。

为什么要激进到这个程度？三个原因：

1. **决定任务成败的，恰恰是「非模型」部分**。上一节的实验已经说明：同一模型在不同 Harness 下表现差距悬殊。上下文怎么裁剪、出错重试几次、一次并行调几个工具、结果怎么自检——这些决策既然决定了模型能力的兑现率，就不该焊死，必须每一项都能单独替换、单独调优。
2. **使用 Agent 的场景差异，大到不存在一种通用配置**。跑基准测试只需 bash 和编辑器两件工具；企业内网部署必须换掉沙箱和存储；任务一跑几小时要能中途不重启就换配置；研究者横向对比 GPT、Claude 和自研模型时，要求除模型外一切不变。这些需求在固定产品里只能等厂商发版，在插件体系里只是改一行配置。
3. **能力的增长不该等官方发版**。MIT 协议下，任何人都可以发布新工具、新执行循环、新提示策略，生态自己长出来——这和 Kubernetes 从 Google 内部调度器长成独立基础设施，是同一个剧本。

> **Agent 不再是一个固定产品，而是一个可以自己组装的工作平台。**

两个关键设计：

1. **时空可组合性**：插件之间靠 Services 和 Events 松耦合协作；插件卸载时，它注册的服务、事件和副作用被全部撤销，不留孤儿状态。支持 Agent 连续运行数小时甚至数天的中途热重配。
2. **每次运行可追溯**：系统提示、推理、工具调用、子 Agent 调度全部写入同一条 append-only 事件流（Trajectory 视图）。

运行模式（Standard / Code / Minimal / Creator）也不是四套程序，而是同一内核的四种插件组合。

### 用其他 Agent 对照，就好懂了

Claude Code、Codex、Trae 也支持扩展（MCP、VS Code 插件），但那是给整车加装行车记录仪——车本身动不了。Harness 的意思是连发动机、方向盘、车壳都是标准件，唯一焊死的只有插槽（内核）：

| 你想做的事 | Claude Code / Codex / Trae | DeepSeek Harness |
|---|---|---|
| 换模型 | CC 只能用 Claude、Codex 只能用 OpenAI，模型是产品的一部分 | 模型是适配器插件，配置切换，其余部分不动 |
| 改干活方式（重试策略、并行调几个工具） | 「思考→调工具→观察→再思考」循环是厂商写死的 | Loops 是插件，整个换掉（Minimal / Code 模式就是不同的循环插件） |
| 企业内网合规 | 只能接受厂商的沙箱和审批模型 | 沙箱、存储插件拔下来，换成自有安全边界和内网数据库 |
| 换界面 | UI 就是产品本身 | 连 Web UI 都是插件，可换成 CLI 或自研面板 |
| 接入另一个 Agent | 彼此是竞品，互不相干 | Claude Code、Codex 可作为子 Agent 插件挂进来（rc.8） |

一个完整场景：企业要在内网造自己的 Agent。用 Claude Code 做不到（模型在云端）；在 Harness 里不改框架一行源码，只需把模型插件换成本地微调模型、沙箱插件换成合规策略、存储插件指向内网库、拔掉 Web UI 插件只留 CLI。

## 四、和 Trae 的区别

Trae 是**一体化 AI IDE**：Agent 窗口 + IDE 窗口双形态、IDE/SOLO 双模式、三端同步，内置多模型并支持 API Key 接入，可配置自定义智能体（提示词、MCP Server、工具集），外加 CUE 补全、Git、调试和权限审批。

| 维度 | DeepSeek Harness | Trae |
|---|---|---|
| 本质 | 开源 Agent 运行时（MIT） | 商业 AI IDE / 一体化开发平台 |
| 面向 | 造 Agent 的开发者、私有化团队 | 直接用 AI 交付代码的开发者 |
| 可换边界 | 模型、工具、会话、沙箱、存储、**推理循环、调度、UI** 全可换 | 模型可换、智能体可配置、编辑器可装扩展；核心循环与 UI 固定 |
| 扩展方式 | Cordis 代码级插件，可热卸载 | 配置级智能体 + MCP + VS Code 扩展 |
| 可观测性 | append-only 事件流，可回放/分叉 | 任务进度、diff、审查视图，面向日常体验 |
| 类比 | Agent 时代的 Kubernetes | 一辆调校好的智能整车 |

一句话：**Trae 是「一个成品 Harness」，DeepSeek Harness 是「造 Harness 的 Harness」**。它对标的不是 Cursor、Claude Code 的功能列表，而是这些产品脚下共同的那一层。MCP 让工具可插拔，Cordis 则把边界推进到「内核之外，一切皆插件」。

这不是强弱之分，而是买车与造车的分工。两者还能叠加：Harness rc.8 已支持把 Claude Code、Codex 等成品 Agent 挂为子 Agent 编排。

## 五、和 Claude Code 的区别

Claude Code 是 Anthropic 的**终端原生编程 Agent**：在终端运行，也能从 IDE、Slack、Web 发起和审查任务，可调用 Git 等 CLI 工具和 MCP Server 扩展能力，擅长接手修 Bug、写测试、持续数天的迁移任务。

| 维度 | DeepSeek Harness | Claude Code |
|---|---|---|
| 性质 | 开源 Agent 运行时（MIT） | Anthropic 的成品 Agent 产品 |
| 模型 | 模型是插件，DeepSeek/Claude/GPT/自研随意换 | 深度绑定 Claude 模型 |
| 形态 | Web UI + CLI，四种模式 + Creator 自建模式 | 终端为核心，延伸到 IDE/Slack/Web |
| 内部结构 | 循环、工具、UI 全部可拔换 | Agent 循环是 Anthropic 的固定实现，可加工具但不能换内核 |
| 扩展 | Cordis 代码级插件 | MCP + CLI 工具 |

相同点是都在终端干活、都支持 MCP。不同点是定位：**Claude Code 是一匹装好鞍的马，Harness 是马场和调度系统**。rc.8 起 Claude Code 可以 Profile Bundle 形式安装为 Harness 的子 Agent——Harness 负责拆任务和调度，Claude Code 负责某一块具体执行（如前端重构）。

## 六、和 Codex 的区别

Codex（CLI）是 OpenAI **开源的命令行轻量编程 Agent**：本地运行，直接读、改、跑你的代码，源码不外传，带非交互权限模式和沙箱模型，背后是 OpenAI 的推理模型与固定的 agent loop。

| 维度 | DeepSeek Harness | Codex CLI |
|---|---|---|
| 开源的是什么 | 造 Agent 的微内核和插件体系（MIT） | 一个 Agent 产品本身（开源 CLI） |
| 模型 | 模型无关，任意供应商 | 绑定 OpenAI 模型 |
| 能力范围 | Web UI、多模式、子 Agent 编排、长时任务调度 | 专注本地终端的读改跑循环 |
| 多 Agent | 原生调度层，可并行多个子执行器 | rc.8 中可被 Harness 起多个命名实例并行干活 |
| 上手成本 | 面向构建者，概念更多 | 装好即用，单一直接 |

两者都开源、都重权限与沙箱，但抽象层级不同：**Codex 开源的是「一个好用的 Agent」，Harness 开源的是「Agent 跑在上面的那层系统」**，类比 Android 之于手机厂商。rc.8 已支持把 Codex 挂为子 Agent，父任务完成后通过 `reportDelivery` 机制被唤醒，避免阻塞等待。

## 七、怎么选

- **只想把代码写好、项目交付掉**：用 Trae、Claude Code、Codex 这类成品工具，开箱即用，厂商替你做掉大部分 Harness 决策。
- **要自研 Agent、私有化部署、跨模型做成本基线**：用 Harness，从 `npx @deepseek-ai/dsh web` 或源码开始。
- **不必站队**：Harness 做编排与审计，Claude Code、Codex、Trae 做具体执行，是供应链上的不同环节。

## 参考资料

1. [DeepSeek Harness 官方介绍](https://www.deepseek.com/harness/en/)
2. [DeepThink：Cordis 插件架构深度解析](https://deepthink.ltd/blog/deepseek-harness-open-source-cordis-everything-plugin-2026/)
3. [DeepThink：rc.8 将 Claude Code / Codex 变为子 Agent](https://deepthink.ltd/blog/deepseek-harness-rc8-claude-codex-subagent-2026/)
4. [鱼皮：DeepSeek Harness 首发实测 + 入门教程](https://developer.aliyun.com/article/1755786)
5. [TRAE 官方文档：什么是 TRAE](https://docs.trae.cn/ide_what-is-trae-code)
6. [TRAE 官网](https://www.trae.cn/)
7. [Claude Code 官方产品页（Anthropic）](https://claude.com/product/claude-code?hl=en)
8. [OpenAI Codex CLI 入门文档](https://help.openai.com/en/articles/11096431-openai-codex-cli-getting-started)
