# IMPLEMENTATION ROADMAP · Learning Companion

## 1. 文档目标
这份路线图把当前项目从“本地 MVP 基础骨架”推进到“可用的学习伴侣桌面客户端”的执行顺序、阶段进度、交付物、验收标准和阶段衔接规则写清楚。

它基于以下事实：
- 产品定位、MVP 范围和实现边界已经明确。
- 本地存储、页面骨架、用户画像编辑、目标管理、Provider 配置已经有真实落地。
- 真实 AI 调用、对话驱动结构化变更、计划精细编辑、复盘闭环和发布准备仍未完成。

## 2. 当前判断

### 当前总进度
- **整体进度估算：55%**
- **当前阶段：Phase 3 已进入 `in_progress`，Task 1（统一 AI Service 接口）已完成，准备进入 Task 2（能力接入）**

> 说明：这个百分比是基于“产品可用闭环”而不是“代码文件数量”估算的。文档、骨架和本地持久化已经完成一部分，但关键用户价值仍集中在后续阶段。

### 已完成的基线
- 产品文档、页面信息架构、产品原则、多 Provider 抽象已写清。
- Electron + React + TypeScript + SQLite/Drizzle 基础栈已跑通。
- 用户画像编辑已具备真实本地保存与重启回填。
- 学习目标已支持创建、编辑、设为当前目标。
- 学习计划已按目标保存独立草案。
- Provider 配置与 secret 已支持安全存储。
- 统一 AI service、Provider adapter、capability route 解析和 runtime 摘要已落到 Main / preload / renderer 设置页。
- 应用偏好、Provider 配置和 route 已拆到结构化表，不再只依赖 snapshot 承接。

### 当前最该做的事情
- **Phase 3 / Task 2：接入 `profile_extraction` / `plan_generation` / `plan_adjustment`。**

这一步会把已经具备 route 解析和 Provider 前置校验的统一 runtime，真正接到画像提取、计划生成与计划调整的业务入口，是 Phase 3 产生真实用户价值的核心步骤。

## 3. 执行总策略
1. 先把本地闭环做实，再接 AI。
2. 先让计划可编辑、可确认、可回滚，再做自动重排。
3. 对话不是单独页面能力，而是画像、目标、计划的结构化动作入口。
4. 优先清理快照兜底依赖，逐步把业务实体归位到结构化表。
5. 每个阶段结束必须明确下一个唯一优先任务，避免并行发散。

## 4. 执行规则

### Rule 1: 同一时刻只允许一个主阶段处于 `in_progress`
- 允许有并行的小修复。
- 不允许同时推动两个主功能阶段。

### Rule 2: 每完成一个阶段，必须显式写出下一个任务
阶段完成时必须同步更新项目进度记录，至少包含以下字段：

```md
- Phase Status: complete
- Completion Summary: 本阶段交付了什么
- Verification: 如何验证通过
- Next Task: 下一阶段 / 任务编号 / 任务标题
```

### Rule 3: 没写 `Next Task`，阶段不算真正完成
- 不能只把状态改成 `complete`。
- 必须指定唯一、可执行、可开始的下一个任务。

### Rule 4: 每个阶段结束至少产生一次可回溯提交
- 阶段性成果必须进入 git。
- commit message 要能反映该阶段的业务价值，而不是只写 `update docs`。

### Rule 5: 任何新能力都要带着验收条件一起开发
- 没有验收条件的任务不允许进入 `in_progress`。
- 验收以用户路径、数据落库、重启回填、错误反馈为主。

## 5. 阶段总览

| Phase | 名称 | 状态 | 进度 | 目标 |
|------|------|------|------|------|
| Phase 0 | 文档与本地基础层 | complete | 100% | 跑通桌面端基础壳、文档、状态层和本地持久化 |
| Phase 1 | 计划编辑与计划生命周期 | complete | 100% | 让计划真正可编辑、可重生、可比较 |
| Phase 2 | 对话驱动结构化动作 | complete | 100% | 让对话能把建议落成可确认动作 |
| Phase 3 | AI Service 与 Provider 运行时接入 | in_progress | 25% | 把 capability route 真的接到模型调用层 |
| Phase 4 | 执行与复盘闭环 | pending | 0% | 让任务执行、复盘、计划调整形成闭环 |
| Phase 5 | 数据层硬化与迁移 | pending | 10% | 降低快照兜底，补齐迁移和一致性保障 |
| Phase 6 | 发布准备与质量收口 | pending | 0% | 完成验收、打包、发布前检查 |

## 6. 分阶段实施方案

### Phase 0 · 文档与本地基础层
- **状态：** complete
- **完成度：** 100%
- **已交付：**
  - PRD / MVP / IA / Provider / Product Principles / Architecture 文档
  - Electron + React + TypeScript 客户端骨架
  - SQLite + Drizzle 基础表与 preload bridge
  - 用户画像真实保存链路
  - 目标创建、编辑、设为当前目标
  - 独立 plan draft 归属结构
  - Provider 配置与 secret 安全存储
- **验收结论：**
  - 项目能构建
  - 页面骨架可展示
  - 关键基础数据能落本地
- **本阶段完成后指定的下一个任务：**
  - **Next Task: Phase 1 / Task 1 / 实现学习计划手动编辑与保存**

### Phase 1 · 计划编辑与计划生命周期
- **状态：** complete
- **完成度：** 100%
- **目标：**
  - 把“计划草案”从只读模板推进为可维护对象。
- **范围：**
  - Task 1: 计划页支持阶段、任务的手动编辑与保存
  - Task 2: 增加“重新生成计划”入口和确认流程
  - Task 3: 增加计划版本快照与版本对比基础能力
  - Task 4: 增加目标删除与关联计划清理策略
- **交付物：**
  - 计划编辑表单和持久化链路
  - 计划版本表或可回放结构
  - 目标删除的安全确认与数据清理规则
- **验收标准：**
  - 用户可以修改阶段和任务内容并保存
  - 重新打开应用后计划仍然回填
  - 用户能看到当前版本与上一版本的关键差异
  - 删除目标后不会留下脏的 active goal / dangling draft
- **依赖：**
  - 已有 `learning_plan_drafts`、`plan_stages`、`plan_tasks`
- **风险：**
  - 当前计划结构由本地规则模板生成，若无版本层，后续 AI 生成会覆盖人工修改
- **本阶段完成后指定的下一个任务：**
  - **Next Task: Phase 2 / Task 1 / 建立对话建议到结构化 action preview 的映射层**

### Phase 2 · 对话驱动结构化动作
- **状态：** complete
- **完成度：** 100%
- **目标：**
  - 把“对话页”从展示消息流推进为真实的业务动作入口。
- **范围：**
  - Task 1: 定义 conversation action schema
  - Task 2: 支持对画像、目标、计划的变更预览
  - Task 3: 支持用户确认后落库
  - Task 4: 记录动作来源与操作时间
- **交付物：**
  - Action preview UI
  - Confirm / reject 流程
  - Conversation action 持久化结构
  - 动作来源标签与建议生成 / 审核 / 写入时间
- **验收标准：**
  - 对话建议不会直接改数据，必须先预览
  - 用户可以单独接受“只改画像”或“只改计划”
  - 结构化变更落库后相关页面立即同步
  - 动作卡片可追踪来源与关键操作时间
- **依赖：**
  - Phase 1 的计划编辑和版本能力
- **风险：**
  - 若没有统一 action schema，后续 AI 接入会把变更逻辑散到多个页面
- **本阶段完成后指定的下一个任务：**
  - **Next Task: Phase 3 / Task 1 / 接入统一 AI Service 与 capability route 执行层**

### Phase 3 · AI Service 与 Provider 运行时接入
- **状态：** in_progress
- **完成度：** 25%
- **目标：**
  - 让 Provider 配置、用途路由和真实模型调用真正连起来。
- **范围：**
  - Task 1: 设计并落地统一 AI service 接口（已完成）
  - Task 2: 接入 `profile_extraction` / `plan_generation` / `plan_adjustment`
  - Task 3: Provider 健康检查与基本错误提示
  - Task 4: 请求日志和最小可观测性
- **交付物：**
  - Main 侧 AI service
  - Provider adapter 层
  - `app_settings` / `provider_configs` / `model_routing` 结构化持久化
  - 设置页 AI runtime 摘要
- **验收标准：**
  - 设置页选择的 route 能影响真实调用目标
  - 至少一条画像提取链路和一条计划生成链路跑通
  - Provider 失败时用户能得到可理解反馈
- **依赖：**
  - Phase 2 的 action schema
  - Phase 5 的部分数据稳定性工作可并行为子任务
- **风险：**
  - 若先接 AI 再补本地结构，很容易把状态更新变成不可追踪副作用
- **当前进展：**
  - Task 1 已完成：统一 AI service、OpenAI-compatible adapter、route 前置校验、runtime 摘要和结构化 settings/provider/route 持久化已落地
  - 当前唯一下一任务：**Phase 3 / Task 2 / 接入 `profile_extraction` / `plan_generation` / `plan_adjustment`**
- **本阶段完成后指定的下一个任务：**
  - **Next Task: Phase 4 / Task 1 / 打通任务执行记录与复盘输入**

### Phase 4 · 执行与复盘闭环
- **状态：** pending
- **完成度：** 0%
- **目标：**
  - 让“计划 -> 执行 -> 复盘 -> 调整”真正闭环。
- **范围：**
  - Task 1: 任务完成、跳过、延后状态流转
  - Task 2: 日 / 周 / 阶段复盘输入
  - Task 3: 复盘结果影响画像与计划的建议生成
  - Task 4: 首页展示今日优先动作与风险提醒
- **交付物：**
  - 任务状态更新链路
  - 复盘表单和摘要卡
  - 首页聚焦任务与风险提醒
- **验收标准：**
  - 用户能完成任务并看到进度变化
  - 用户能提交复盘并看到建议
  - 复盘结果可以成为后续计划调整依据
- **依赖：**
  - Phase 2 action layer
  - Phase 3 AI runtime for richer suggestions
- **风险：**
  - 如果没有执行数据，计划永远只是静态内容
- **本阶段完成后指定的下一个任务：**
  - **Next Task: Phase 5 / Task 1 / 去快照化并补齐迁移与一致性保护**

### Phase 5 · 数据层硬化与迁移
- **状态：** pending
- **完成度：** 10%
- **目标：**
  - 减少 `app_snapshots` 的兜底职责，提升结构化存储的可维护性。
- **范围：**
  - Task 1: 明确 snapshot 与结构化表的最终边界
  - Task 2: 增加迁移脚本与版本管理
  - Task 3: 增加关键数据一致性检查
  - Task 4: 为删除/重排/重生成等高风险动作补事务保护
- **交付物：**
  - schema migration strategy
  - 一致性检查和错误修复策略
  - 更明确的数据读写分层
- **验收标准：**
  - 新旧数据可以稳定迁移
  - 关键实体表不再依赖 snapshot 才能恢复
  - 高风险写操作不会留下半完成状态
- **依赖：**
  - 前面几个阶段的实体结构稳定下来
- **风险：**
  - 如果太早做彻底去快照化，会反复返工
- **本阶段完成后指定的下一个任务：**
  - **Next Task: Phase 6 / Task 1 / 完成端到端验收、打包和发布前检查**

### Phase 6 · 发布准备与质量收口
- **状态：** pending
- **完成度：** 0%
- **目标：**
  - 把项目从“开发态可跑”推进到“可交付演示/内测”状态。
- **范围：**
  - Task 1: 补验收清单与手测路径
  - Task 2: 为关键链路补集成级验证
  - Task 3: Electron 打包与安装体验检查
  - Task 4: 首次启动引导和空状态检查
- **交付物：**
  - 发布前检查清单
  - 最小测试矩阵
  - 构建与打包说明
- **验收标准：**
  - 核心路径可按清单稳定走通
  - 桌面打包产物可安装、可启动、可回填本地数据
  - 演示版具备完整故事线
- **依赖：**
  - 前述功能阶段基本完成
- **本阶段完成后指定的下一个任务：**
  - **Next Task: Release Candidate / 进行最终回归与演示准备**

## 7. 推荐执行顺序
1. 先完成 Phase 1，让计划具备真正可维护性。
2. 再做 Phase 2，把对话变为结构化动作入口。
3. 然后接 Phase 3，让 AI 真正进入业务闭环。
4. 接着做 Phase 4，打通执行与复盘。
5. 最后用 Phase 5 和 Phase 6 做稳定性与交付收口。

## 8. 当前建议的最近三项任务
1. **Phase 3 / Task 2**：接入 `profile_extraction` / `plan_generation` / `plan_adjustment`
2. **Phase 3 / Task 3**：补 Provider 健康检查与基础错误提示
3. **Phase 3 / Task 4**：补请求日志与最小可观测性

## 9. 阶段完成更新模板
每次阶段收尾时，必须按以下格式更新进度文档或路线图状态：

```md
### Phase X: [Title]
- Status: complete
- Completion Summary:
  - [交付点 1]
  - [交付点 2]
- Verification:
  - [验证动作 1]
  - [验证动作 2]
- Risks Left:
  - [残留风险]
- Next Task: Phase Y / Task Z / [下一个唯一优先任务标题]
```

## 10. 本轮路线图交付后的推荐 commit message
`docs: add implementation roadmap and execution rules`
