# ARCHITECTURE · Learning Companion

## 1. 总体架构
系统采用 Electron 三层架构：

1. Main Process
   - 本地数据库（SQLite + Drizzle）
   - 文件与本地配置管理
   - 与 AI 调度的桥接
   - Provider 配置的安全存储与受控 IPC
2. Preload
   - 安全暴露有限 API
   - 承接设置与本地数据访问的受控 bridge
3. Renderer
   - React + shadcn/ui 页面与交互
   - Zustand 维护业务状态，并通过 preload 从 main 侧加载 / 保存

## 2. 核心模块
### 2.1 用户画像模块
负责：
- 问答建档
- 结构化画像
- 画像更新
- 画像手动修正

### 2.2 学习目标模块
负责：
- 新建目标
- 管理目标
- 目标状态跟踪

### 2.3 规划引擎
负责：
- 基于画像和目标生成学习计划
- 计划重排
- 任务节奏调整

### 2.4 对话模块
负责：
- 规划问答
- 用户意图提取
- 对画像、目标、计划的变更映射、结构化 action preview、审核状态与应用状态

### 2.5 任务与复盘模块
负责：
- 日/周任务
- 完成率
- 推迟与失败记录
- 复盘建议

## 3. 数据实体建议
- UserProfile
- LearningGoal
- LearningPlan
- PlanStage
- PlanTask
- ConversationSession
- ReflectionEntry
- ProviderConfig
- ModelRouting

## 4. 前端状态分层（当前阶段）
Renderer 先按以下状态切分：
1. profile：用户画像、偏好、风险与影响解释
2. goals：目标列表、主目标、状态与成功标准
3. plan drafts：按目标归属的阶段计划草案、阶段任务与当前激活目标
4. conversation：当前会话、消息流、建议动作、action preview、审核状态与应用状态
5. settings：主题、启动页、Provider 列表、用途路由策略

这样做的目的：
- 先把产品语义稳定下来
- 让页面骨架不再只是静态文案
- 为后续 SQLite / Drizzle 落库提供清晰实体映射

## 5. 关键设计原则
1. 画像优先于计划
2. 计划优先于单次任务
3. 对话修改应作用于已有计划，而不是每次推翻重来
4. 本地数据优先，接口调用可扩展
5. 页面先服务 C 端用户决策，不服务后台管理统计
6. 模型调用通过 Provider 抽象层进入，不让页面直接依赖具体厂商

## 6. 当前已落地的数据与存储边界
### 6.1 SQLite + Drizzle 基础结构
当前采用“结构化实体为真源 + 受限快照补位”的过渡方案：
1. `app_snapshots`
   - 仅保存尚未结构化的对话会话态：`conversation.title / tags / messages / suggestions / actionPreviews`
   - 作为兼容层与回退层，承接对话审核轨迹与会话上下文，不再冗余保存整份 `AppState`
2. `user_profiles`
   - 规范化保存用户画像主体字段
   - `strengths / blockers / planImpact` 先以 JSON 文本列承载
3. `learning_goals`
   - 规范化保存目标列表与状态
4. `learning_plans`
   - 仅保存 `active_goal_id`，代表当前主目标
5. `learning_plan_drafts`
   - 按 `goal_id` 保存每个目标的独立计划草案摘要与标题
   - `basis` 当前先以 JSON 文本列承载
6. `plan_stages`
   - 保存某个草案下的阶段列表，使用 `draft_id + sort_order` 维护顺序
7. `plan_tasks`
   - 保存某个草案下的任务项，使用 `draft_id + sort_order` 维护顺序
   - 额外记录 `status_note` 与 `status_updated_at`，承接完成 / 跳过 / 延后等真实执行信号
8. `provider_secrets`
   - 单独保存 Provider secret
   - 不让 renderer 直接读取明文 secret
9. `app_settings`
   - 规范化保存主题、启动页等设置项
10. `provider_configs`
   - 规范化保存 Provider 的 label / endpoint / model / enabled / auth / capability / health
11. `model_routing`
   - 保存 capability 到 Provider 的真实路由关系
12. `ai_request_logs`
   - 结构化保存 capability 调用的 Provider、模型、状态、耗时、时间戳和错误摘要
   - 不保存 prompt、对话正文或 suggestion 明细，避免扩大敏感内容落库范围
13. `reflection_entries`
   - 结构化保存 `daily / weekly / stage` 三个复盘周期的手动输入
   - 当前保存偏差说明、难度匹配、时间分配、自评、复盘结论和后续动作

当前主进程会在 `load/save` 时把 `profile / goals / plan drafts / reflection.entries / settings` 同步到规范化表，并把 `conversation` 的会话态写回 `app_snapshots`；`dashboard / reflection` 会在 hydrate 时根据 `plan_tasks` 的真实执行状态派生摘要，并叠加 `reflection_entries` 的手动输入；其中首页首屏会进一步把这些信号整理成 `priorityAction` 与 `riskSignals`，直接回答“现在先做什么”和“当前主要风险是什么”。这意味着 `app_snapshots` 已不再承担整份 Zustand 状态兜底，只保留仍未拆表的对话域。`profile_extraction` 与 `plan_adjustment` 现都会显式携带 `reflection` 上下文，让复盘结果真正进入建议生成链路。

### 6.2 Provider 接入边界
当前把模型层分成三层：
1. Provider Config
   - 记录厂商、endpoint、model、auth、enabled、healthStatus
   - renderer 仅看到 `keyPreview` / `hasSecret` / `updatedAt` 等安全字段
2. Routing Policy
   - 记录不同用途由哪个 Provider 承担
3. AI Service
   - 统一接收业务请求，例如 `plan_generation` / `profile_extraction` / `plan_adjustment`
   - 当前已具备 capability route 解析、Provider 前置校验、手动健康检查、错误归一化、adapter 抽象、真实业务入口接入，以及最小请求日志记录

### 6.3 Bridge 边界
Preload 当前暴露：
- `loadAppState`
- `saveAppState`
- `loadUserProfile`
- `saveUserProfile`
- `upsertLearningGoal`
- `removeLearningGoal`
- `setActiveGoal`
- `saveLearningPlanDraft`
- `updatePlanTaskStatus`
- `saveReflectionEntry`
- `regenerateLearningPlanDraft`
- `runProfileExtraction`
- `generatePlanAdjustmentSuggestions`
- `applyAcceptedConversationActionPreviews`
- `listProviderConfigs`
- `upsertProviderConfig`
- `saveProviderSecret`
- `clearProviderSecret`
- `runProviderHealthCheck`
- `getAiRuntimeSummary`
- `getAiObservability`

这意味着当前已经具备十四类真实交互：
1. 用户画像关键字段通过 `saveUserProfile` 写入本地 SQLite
2. 目标关键字段通过 `upsertLearningGoal` 完成新建 / 编辑，并落到 `learning_goals`
3. 目标切换通过 `setActiveGoal` 持久化 `active_goal_id`，并让计划页直接读取该目标对应的独立草案
4. 目标删除通过 `removeLearningGoal` 同步清理 `learning_goals`、目标关联计划草案与版本快照，并处理 active goal 回退
5. 计划页通过 `saveLearningPlanDraft` 支持草案手动保存
6. 计划页通过 `updatePlanTaskStatus` 支持对单个任务执行开始 / 完成 / 跳过 / 延后，并立即刷新首页与复盘输入
7. 复盘页通过 `saveReflectionEntry` 按日 / 周 / 阶段写入结构化复盘输入，并立即刷新建议区与后续 AI 上下文
8. 计划页通过 `regenerateLearningPlanDraft` 走 `plan_generation`，并在重生成前归档快照
9. 对话页通过 `runProfileExtraction` 走 `profile_extraction`，并同时携带当前对话与结构化复盘上下文，把模型返回 suggestions 回流到 action preview
10. 计划页通过 `generatePlanAdjustmentSuggestions` 走 `plan_adjustment`，并把当前草案、画像约束与复盘反馈一并交给模型，再把调整建议回流到对话预览
11. 对话页通过 `applyAcceptedConversationActionPreviews` 把已接受且可执行的 preview 写入画像、目标、计划实体，并回写最新会话状态
12. 设置页与配置页可通过 `saveAppState` / `upsertProviderConfig` / `getAiRuntimeSummary` 更新路由并直接查看每个 capability 当前命中的 Provider、模型、健康状态和阻塞原因
13. 设置页可通过 `runProviderHealthCheck` 对单个 Provider 触发真实连通性探测，并把结果回写到 `provider_configs.health_status`
14. 设置页可通过 `getAiObservability` 查看 capability 请求总览与最近请求日志，并在真实 capability 调用后立即刷新

当前对话页额外具备一层“先审核、再应用”的结构化映射：
- `conversation.suggestions` 仍保留原始自然语言建议，但现在既可以来自本地 seed，也可以来自 `profile_extraction` / `plan_adjustment`
- `conversation.actionPreviews` 会基于当前目标、计划、画像与 route 配置回填结构化预览
- 当前画像预览已可把学习窗口、时间预算、节奏偏好、阻力因素与计划影响说明解析成可执行 `profile_update`
- `actionPreviews.reviewStatus` 会随用户确认/拒绝保留在快照里
- 已接受且带执行 payload 的 preview 会通过主进程统一应用到结构化实体，再把 preview 标记为 `applied`
- 动作来源标签、建议生成时间、审核时间、写入时间附着在 `actionPreviews` 上，并随 `app_snapshots` 一起持久化；目前仍未单独建表
- capability 调用级日志则已拆到 `ai_request_logs`，与快照解耦，并由设置页展示最小可观测性摘要
- 首页与复盘页的关键摘要现由任务执行状态派生，并叠加 `reflection_entries` 的手动输入，不再只依赖 seed 文案或手写快照
- 首页会把这些派生结果进一步整理为单条优先动作和结构化风险提醒，UI 不再只展示平铺字符串数组

当前仍未覆盖：目标排序、计划版本回滚、`reflection_summary` 的业务接入，以及更细粒度的调用 tracing / metrics。
