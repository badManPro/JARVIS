# Learning Companion

一个面向所有人的、本地优先的学习规划桌面客户端。

核心理念：通过对话逐步建立用户画像，再基于画像生成个性化学习计划，并在执行中持续修正。

## 当前阶段
已完成：
- 更细化的页面信息架构文档
- Electron + React + TypeScript 客户端最小骨架
- Tailwind / shadcn/ui 基础配置
- 首页 / 学习计划 / 目标 / 对话 / 用户画像 / 复盘 / 设置 七个页面的最小导航与内容骨架
- Zustand 驱动的前端状态层，并已通过 preload bridge 从 SQLite 初始化
- SQLite + Drizzle 的本地持久化基础（app snapshot + provider secret）
- 面向 C 端客户端优先的界面原则文档
- 多模型 Provider 抽象、路由策略与设置入口文档
- Provider 配置安全存储基础接口（renderer 不直接拿到明文 secret）
- 目标页已具备真实“创建 / 编辑 / 删除 / 设为当前目标 / 本地持久化 / 重启回填”链路
- 学习计划已升级为“按目标保存独立计划草案”，切换当前目标会切换到对应 plan payload
- 学习计划页已支持阶段/任务手动编辑、本地保存、重新生成确认、版本快照归档与版本对比视图
- 对话页已支持把自然语言建议映射为结构化 action preview，并逐条确认/拒绝画像、目标、计划变更预览

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
7. 设置

## 本地开发
### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发环境
```bash
npm run dev
```

### 3. 构建
```bash
npm run build
```

## 当前骨架包含什么
- Electron 主进程窗口初始化
- preload 安全暴露最小 API，并提供本地数据 / Provider 配置 bridge
- renderer 应用壳层与左侧导航
- Zustand 业务状态层：profile / goals / plan drafts / conversation / settings
- SQLite + Drizzle 基础存储：`app_snapshots` 保存当前应用快照，`provider_secrets` 单独保存 Provider secret
- `learning_plan_drafts` + `plan_stages` + `plan_tasks` 已承接按目标归属的计划草案结构
- 七个页面的真实内容骨架与跨页面上下文展示
- 设置页中的多模型 Provider 列表与路由策略展示（仅显示 masked key preview / hasSecret）
- 对话页中的建议动作预览卡片，会基于当前状态把字符串建议回填为结构化 action preview，并保留用户的审核状态
- 可继续扩展为更细粒度实体表、迁移脚本与统一 AI 调度流程

## 当前存储实现说明
- 数据库位置：Electron `app.getPath('userData')/learning-companion.sqlite`
- 当前落库策略：保留 `app_snapshots` 作为应用快照，同时把画像 / 目标 / 计划草案继续拆到结构化表中
- Provider secret 单独存于 `provider_secrets`，renderer 仅获取 `keyPreview`、`hasSecret`、`updatedAt` 等安全字段
- 用户画像、目标、设置页的关键字段已经可以通过 renderer → preload → main → SQLite 真实保存并在重启后回填
- 计划相关数据已拆为：`learning_plans.active_goal_id` 保存当前主目标，`learning_plan_drafts` 保存各目标草案，`plan_stages` / `plan_tasks` 保存对应阶段与任务
- 目标页已支持“设为当前目标”，计划页会直接切换到该目标对应的独立草案内容，而不是仅做展示映射
- 点击“重新生成计划”前，会先把当前草案归档到 `learning_plan_snapshots`、`plan_snapshot_stages`、`plan_snapshot_tasks`，并可在计划页直接选择历史快照做版本对比
- 删除目标时，会同步清理它的计划草案与版本快照；如果删的是当前主目标，会自动回退到剩余目标中的第一项，没有剩余目标时则回到空状态
- 对话相关数据仍主要保留在 `app_snapshots`，但主进程会在加载时把 `conversation.suggestions` 回填为结构化 `actionPreviews`，并保留预览的确认/拒绝状态
- 当前计划草案仍由本地规则模板生成，尚未接入真实 AI Provider 生成 / 重排
- 当前尚未提供已确认 action preview 的实体落库、版本回滚、目标排序等更高阶动作

## 下一步建议
1. 支持用户确认后将结构化动作真正落库
2. 记录动作来源与操作时间
3. 增加统一 AI service，按 capability route 到不同 Provider
4. 继续减少 `app_snapshots` 对业务实体的兜底职责，补充更稳妥的迁移机制

## 当前推荐下一任务
- `Phase 2 / Task 3`：支持用户确认后将结构化动作真正落库
