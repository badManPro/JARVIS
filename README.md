# Learning Companion

一个面向所有人的、本地优先的学习规划桌面客户端。

核心理念：通过对话逐步建立用户画像，再基于画像生成个性化学习计划，并在执行中持续修正。

## 当前阶段
当前判断：
- 当前阶段：`Phase 4 / 首发领域深做（已完成）`
- 当前进度估算：约 `90%`
- 当前唯一下一任务：`Phase 5 / Task 1 / 为计划生成和状态流转补强反馈动画`

已完成：
- 更细化的页面信息架构文档
- Electron + React + TypeScript 客户端最小骨架
- Tailwind / shadcn/ui 基础配置
- 首页 / 学习计划 / 目标 / 对话 / 用户画像 / 复盘 / 日历 / 设置 八个页面的最小导航与内容骨架
- Zustand 驱动的前端状态层，并已通过 preload bridge 从 SQLite 初始化
- SQLite + Drizzle 的本地持久化基础（app snapshot + provider secret）
- 面向 C 端客户端优先的界面原则文档
- 多模型 Provider 抽象、路由策略与设置入口文档
- Provider 配置安全存储基础接口（renderer 不直接拿到明文 secret）
- 目标页已具备真实“创建 / 编辑 / 删除 / 设为当前目标 / 本地持久化 / 重启回填”链路
- 学习计划已升级为“按目标保存独立计划草案”，切换当前目标会切换到对应 plan payload
- 学习计划页已支持阶段/任务手动编辑、本地保存、重新生成确认、版本快照归档与版本对比视图
- 对话页已支持把自然语言建议映射为结构化 action preview，并在逐条确认后批量写回画像、目标、计划实体
- 对话动作已支持记录来源标签，以及建议生成 / 审核 / 写入时间
- Main 侧已接入统一 AI service、OpenAI-compatible provider adapter 与 capability route 解析
- 设置相关数据已拆到 `app_settings` / `provider_configs` / `model_routing`，不再只靠 snapshot 承接
- 设置页已支持展示 AI runtime 摘要，直接看到每个 capability 当前会命中哪个 Provider、是否具备执行前置条件
- 对话页已支持通过 `profile_extraction` 从当前对话提取结构化建议，并直接回流到 action preview 审核链路
- 学习计划页已支持通过 `plan_generation` 真实重生成草案，并通过 `plan_adjustment` 生成调整建议回流到对话预览
- 设置页已支持对单个 Provider 执行真实健康检查，runtime 摘要会区分配置阻塞、健康 warning 和正常 ready 状态
- Main 侧会把 Provider 的网络 / 认证 / endpoint 失败归一化为用户可理解提示，并在真实 capability 调用成功 / 失败后回写最近健康状态
- Main 侧已新增 `ai_request_logs` 请求日志，设置页可查看请求总数、成功 / 失败统计、每个 capability 最近状态与最近请求列表
- 学习计划页已支持对单个任务执行“开始 / 完成 / 跳过 / 延后”，并把状态原因与最近流转时间写入本地
- 首页现会基于真实任务执行与复盘输入展示结构化“今日优先动作”和“风险提醒”，并把复盘摘要与补充动作下沉为辅助信息
- 复盘页已支持日 / 周 / 阶段周期切换、结构化输入表单、本地保存与建议区；手动输入会落到 `reflection_entries`
- SQLite 初始化现已切换为显式 schema migration runner，并通过 `PRAGMA user_version` 管理数据库版本升级
- Main 存储层现会在 load/save 路径执行关键一致性检查，自动修复 stale plan snapshot 引用和指向缺失 provider 的 route
- `LearningGoal` 现已具备结构化 `role / scheduleWeight`，目标集合会在 load/save 时自动修正为唯一主目标
- 学习路径页现可明确区分主目标 / 副目标，并展示后续日历调度会使用的目标权重
- 首页 / 今日页 / 学习路径页现会展示统一的“主目标优先占位、副目标补位”调度预览，并把延期候选数量暴露给后续日历排程
- `plan_generation` / `daily_plan_generation` prompt 现会显式携带主副目标调度上下文，确保粗版路径和今日细版都优先服务当前主目标的连续推进
- `dashboard.scheduling` 现会派生真实 `weeklyPlan / delayedPlacements`，把主目标延期步骤塞回主线连续块，把副目标延期步骤塞回对应补位窗口，并在冲突时顺延到更合适的后续日期
- 日历页现已直接消费共享周排程结果，展示每天剩余的主线 / 补位时间、延期补回落点，以及“系统为什么这样安排”的解释区
- `LearningGoal` 已新增 `domain`，目标现在支持 `通用 / 编程 / 乐器 / 健身` 领域归类，编程与乐器目标会自动走领域推断或手动覆盖
- 粗版计划、今日计划 fallback 与 AI prompt 现已接入编程领域执行规则，优先输出官方文档入口、可运行代码结果与“文档 -> 示例 -> 运行验证”的任务原子
- 路径页与目标编辑页现已展示并可编辑目标领域，编程目标的路径摘要与今日资源建议会和通用目标明显区分
- 目标领域现已支持 `通用 / 编程 / 乐器 / 健身`，其中乐器目标会自动识别吉他 / 钢琴 / 鼓等常见关键词，健身目标会自动识别力量训练 / 跑步 / 自重 / 瑜伽等常见方向
- 粗版计划、今日计划 fallback 与 AI prompt 现已接入乐器领域执行规则，优先输出“调音 / 热身 -> 节拍器慢练 -> 分段重复 -> 录音回听”的任务原子
- 粗版计划、今日计划 fallback 与 AI prompt 现已接入健身领域执行规则，优先输出“热身 / 动作标准 -> 主训练组 -> 记录组数 / 次数 / 重量 / 配速 / RPE -> 收操拉伸 -> 恢复安排”的任务原子
- 路径页与目标编辑页现已展示正式领域标签，健身选项不再停留在待细化占位

## 技术栈
- Electron
- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui（基础配置就绪）
- Zustand（已纳入依赖，待接入业务状态）

## 目录结构
```text
learning-companion/
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ INFORMATION-ARCHITECTURE.md
│  ├─ MODEL-PROVIDERS.md
│  ├─ MVP.md
│  ├─ PRD.md
│  ├─ PRODUCT-PRINCIPLES.md
│  └─ TECH-STACK.md
├─ public/
├─ src/
│  ├─ main/                 # Electron Main Process
│  ├─ preload/              # 安全桥接层
│  └─ renderer/
│     ├─ components/        # 基础 UI 组件
│     ├─ layouts/           # 应用布局
│     ├─ lib/               # 工具函数
│     ├─ pages/             # 页面元数据与页面骨架
│     └─ styles/            # 全局样式
├─ components.json          # shadcn/ui 配置
├─ index.html
├─ package.json
├─ postcss.config.cjs
├─ tailwind.config.ts
├─ tsconfig.json
├─ tsconfig.electron.json
└─ vite.config.ts
```

## 关键文档入口
- 页面信息架构：`docs/INFORMATION-ARCHITECTURE.md`
- 产品定位与范围：`docs/PRD.md`
- C 端客户端优先原则：`docs/PRODUCT-PRINCIPLES.md`
- 多模型 Provider 抽象与设置入口：`docs/MODEL-PROVIDERS.md`
- 当前技术与模块边界：`docs/ARCHITECTURE.md` / `docs/TECH-STACK.md`
- 实施路线图与阶段规则：`docs/IMPLEMENTATION-ROADMAP.md`

目前已明确以下页面的职责、关键区块与核心交互：
1. 首页
2. 学习计划
3. 目标
4. 对话
5. 用户画像
6. 复盘
7. 日历
8. 设置

## 本地开发
### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发环境
```bash
npm run dev
```

该命令会先把 `better-sqlite3` 重建到 Electron ABI，再等待 renderer / main 就绪并启动应用；退出时会自动尝试恢复 Node ABI，避免后续 `npm run build` / `node --test` 被开发态运行污染。

### 3. 构建
```bash
npm run build
```

### 4. 生成 unpacked app（本机 smoke check）
```bash
npm run package
```

### 5. 生成 macOS installer
```bash
npm run dist
```

### 6. 生成 Windows installer
当前仓库已补 `electron-builder` 的 Windows 目标，但推荐在 GitHub Actions 的 Windows runner 上产出：

```bash
npm run dist:win
```

### 7. 发布到 GitHub Releases
- 推送 `v*` tag 后，`.github/workflows/release.yml` 会在 macOS runner 生成 `.dmg/.zip`，在 Windows runner 生成 `.exe/.zip`，然后把产物上传到对应的 GitHub Release。
- 也可以手动触发 `Release` workflow，并传入一个 tag；这种路径会创建或更新同名 draft release。
- 本机目前只验证了 macOS 打包链路；Windows 打包以 CI 产物为准，更适合在 GitHub Actions 上执行。

## 当前骨架包含什么
- Electron 主进程窗口初始化
- preload 安全暴露最小 API，并提供本地数据 / Provider 配置 bridge
- renderer 应用壳层与左侧导航
- Zustand 业务状态层：profile / goals / plan drafts / conversation / settings
- SQLite + Drizzle 基础存储：`app_snapshots` 保存对话会话快照，`app_settings` / `provider_configs` / `model_routing` 保存设置运行时，`provider_secrets` 单独保存 Provider secret
- `learning_plan_drafts` + `plan_stages` + `plan_tasks` 已承接按目标归属的计划草案结构
- 八个页面的真实内容骨架与跨页面上下文展示
- 设置页中的多模型 Provider 列表与路由策略展示（仅显示 masked key preview / hasSecret）
- 对话页中的建议动作预览卡片，会基于当前状态把字符串建议回填为结构化 action preview，并支持“审核后统一应用”到真实实体
- 可继续扩展为更细粒度实体表、迁移脚本与统一 AI 调度流程

## 当前存储实现说明
- 数据库位置：Electron `app.getPath('userData')/learning-companion.sqlite`
- SQLite schema version：启动时会按 `PRAGMA user_version` 执行有序迁移，当前通过显式 migration runner 管理版本升级
- 当前落库策略：以结构化表作为画像 / 目标 / 计划 / 复盘 / 设置的真源，`app_snapshots` 仅保留未结构化的对话会话态
- Provider secret 单独存于 `provider_secrets`，renderer 仅获取 `keyPreview`、`hasSecret`、`updatedAt` 等安全字段
- 应用偏好、Provider 基础配置和 capability route 已拆到 `app_settings`、`provider_configs`、`model_routing` 并可在重启后回填
- `ai_request_logs` 会结构化保存 capability 调用的 Provider、模型、状态、耗时和错误摘要，不保存 prompt / 对话正文
- `reflection_entries` 会结构化保存日 / 周 / 阶段复盘的偏差说明、难度判断、时间分配、自评、复盘结论与后续动作
- 用户画像、目标、设置页的关键字段已经可以通过 renderer → preload → main → SQLite 真实保存并在重启后回填
- 计划相关数据已拆为：`learning_plans.active_goal_id` 保存当前主目标，`learning_plan_drafts` 保存各目标草案，`plan_stages` / `plan_tasks` 保存对应阶段与任务
- `learning_goals` 现会额外保存 `role / schedule_weight`，并与 `learning_plans.active_goal_id` 共同承接主副目标边界
- `plan_tasks` 现会额外保存 `status_note` / `status_updated_at`，用于承接任务完成 / 跳过 / 延后等真实执行信号
- 目标页已支持“设为当前目标”，计划页会直接切换到该目标对应的独立草案内容，而不是仅做展示映射
- 点击“重新生成计划”前，会先把当前草案归档到 `learning_plan_snapshots`、`plan_snapshot_stages`、`plan_snapshot_tasks`，并可在计划页直接选择历史快照做版本对比
- 删除目标时，会同步清理它的计划草案与版本快照；如果删的是当前主目标，会自动回退到剩余目标中的第一项，没有剩余目标时则回到空状态
- 对话相关数据目前仍主要保留在 `app_snapshots`，但范围已收敛为会话标题、消息、suggestions 与 action preview 审核轨迹；主进程加载时会基于这些 suggestions 回填结构化 `actionPreviews`，并支持把已接受且可执行的预览写回结构化实体表
- `conversation.actionPreviews` 已补齐来源标签与时间线元数据（建议生成 / 审核 / 写入），并随应用快照一起持久化
- 主进程现在会在结构化状态装载时修复 `learning_plan_snapshots.draft_id` 等关键计划引用，并在 route 指向缺失 provider 时回退到稳定默认值
- Main 侧统一 AI service 已具备 route 解析、Provider 前置校验、runtime 摘要和 adapter 抽象，并已接到 `profile_extraction` / `plan_generation` / `plan_adjustment` 的真实业务入口
- 对话建议提取和计划调整建议统一回流到 `conversation.suggestions`，继续复用现有 action preview 的审核与应用边界
- Provider 健康状态现可由设置页手动检查，并会随着真实 capability 调用成功 / 失败自动回写到 `provider_configs.health_status`
- 设置页现可查看最小可观测性摘要，包括总请求数、成功 / 失败统计、每个 capability 最近请求状态和最近请求列表
- 复盘页现提供独立 `saveReflectionEntry` 链路，用户可按日 / 周 / 阶段分别编辑复盘输入，并立即刷新建议区与计划调整上下文
- `profile_extraction` / `plan_adjustment` 现都会显式消费结构化 `reflection` 上下文，画像建议可直接产出学习窗口、时间预算、节奏偏好、阻力因素与计划影响的结构化预览
- 首页首屏现会把 `plan_tasks` 与 `reflection_entries` 派生成单条优先动作和结构化风险卡，明确展示“现在做什么 / 为什么做 / 当前主要风险 / 建议处理动作”
- 删除目标、保存/重排计划草案、重生成计划、批量应用 action preview 等复合写路径现统一走 SQLite 事务；任一步持久化失败都会整体回滚，不再留下半完成状态
- `docs/RELEASE-READINESS.md` 已补齐 Phase 6 的自动预检矩阵、手测路径、打包/安装检查结果与剩余发布限制说明
- 已接入 `electron-builder`，当前可生成 macOS arm64 的 unpacked app、ZIP 和 DMG，并完成 DMG 内容与基础签名校验
- 关键链路集成测试现已覆盖“对话建议审核后写回 profile / goal / plan”与“执行/复盘反馈进入 plan adjustment request”两条闭环，并修复了双引号建议里的新增任务标题解析
- 空数据库首次启动现已进入真实空状态，不再自动写入示例画像、目标、计划和对话
- 首页、侧栏和对话页现已补齐首启 onboarding 与空状态入口，用户可直接跳到画像 / 目标 / 计划 / 设置页完成第一次初始化
- 今日细版计划现已升级为带 `id / status / statusNote / statusUpdatedAt` 的步骤级执行结构
- 今日页现已围绕 `todayPlan.steps` 工作，支持 `开始 / 完成 / 延期 / 跳过`
- 完成当前步骤后会自动切到下一步，延期步骤会自动进入“明天候选区”
- 日历页现会把主目标连续块、副目标补位和延期补回并入同一周视图，解释系统如何安排这一周
- 今日步骤状态现已通过 renderer → preload → main → SQLite 持久化，并在重启后恢复
- 当前尚未提供版本回滚、目标排序、`reflection_summary` 业务接入以及更细粒度的 tracing / metrics

## 下一步建议
1. `Phase 5 / Task 1`：为关键状态流转补强反馈和轻动效
2. `Phase 6 / Task 1`：接入桌面角色反馈层的最小容器
3. `Release Track / Task 1`：回归、打包和发布准备

## 当前推荐下一任务
- `Phase 5 / Task 1`：为关键状态流转补强反馈和轻动效
