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
- 对画像与计划的变更映射

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
4. conversation：当前会话、消息流、建议动作
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
当前采用“快照兜底 + 规范化实体表并行”的过渡方案：
1. `app_snapshots`
   - 继续保存当前 Zustand 业务状态快照
   - 作为兼容层与回退层，避免演进期间丢失页面状态
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
8. `provider_secrets`
   - 单独保存 Provider secret
   - 不让 renderer 直接读取明文 secret

当前主进程会在 `load/save` 时同步 `profile / goals / plan drafts` 到规范化表，并继续写回 `app_snapshots` 作为兼容快照；`dashboard / conversation / reflection / settings` 仍主要由快照承接，留待后续继续拆表。

### 6.2 Provider 接入边界
当前把模型层分成三层：
1. Provider Config
   - 记录厂商、endpoint、model、auth、enabled、healthStatus
   - renderer 仅看到 `keyPreview` / `hasSecret` / `updatedAt` 等安全字段
2. Routing Policy
   - 记录不同用途由哪个 Provider 承担
3. AI Service
   - 统一接收业务请求，例如 `plan_generation` / `profile_extraction`

### 6.3 Bridge 边界
Preload 当前暴露：
- `loadAppState`
- `saveAppState`
- `loadUserProfile`
- `saveUserProfile`
- `upsertLearningGoal`
- `listProviderConfigs`
- `upsertProviderConfig`
- `saveProviderSecret`
- `clearProviderSecret`

这意味着当前已经具备三类真实交互：
1. 用户画像关键字段通过 `saveUserProfile` 写入本地 SQLite
2. 目标关键字段通过 `upsertLearningGoal` 完成新建 / 编辑，并落到 `learning_goals`
3. 目标切换通过 `setActiveGoal` 持久化 `active_goal_id`，并让计划页直接读取该目标对应的独立草案
4. 应用偏好 / 路由策略与 Provider 基础配置通过 `saveAppState` / `upsertProviderConfig` 更新，secret 继续走独立安全存储

当前仍未覆盖：目标删除、目标排序、AI 驱动的计划实时重算 / 多版本对比、真正的在线模型调用。
