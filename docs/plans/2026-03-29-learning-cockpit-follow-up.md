# Learning Cockpit Follow-Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在已完成的“学习驾驶舱 + 官方 Codex 登录 + 人物画像增强”基础上，补齐教练入口闭环、高级设置、上下文复盘和路径抽屉，让新信息架构真正形成可长期使用的主路径。

**Architecture:** 当前主路径已经切到 `今日 / 学习路径 / 学习档案 / 设置` 四页，并新增全局教练抽屉。下一阶段不要回退到旧的多 tab 工作台，而是在现有新结构上补齐闭环：教练入口负责首启建档和“我有变化”，今日页负责唯一主动作，学习路径只展示当前阶段和最近任务，复杂配置统一下沉到高级设置。

**Tech Stack:** TypeScript, React, Zustand, Electron main/preload bridge, SQLite/Drizzle, Node test runner, Vite

---

## Current Baseline

以下内容已经完成，不要重复推翻：

- 新一级导航已经收敛为 `today / path / profile / settings`。
- 新壳层已经移除旧版页面 hero、workspace pulse、实现边界和骨架卡片。
- 全局教练抽屉已经存在，并支持：
  - 首次建档的本地问答式输入
  - “我有变化”的全局入口
  - 记录对话消息
  - 在 Codex 已连接时触发画像建议 / 路径调整建议
- `UserProfile` 已扩展人物画像字段：
  - `ageBracket`
  - `gender`
  - `personalityTraits`
  - `mbti`
  - `motivationStyle`
  - `stressResponse`
  - `feedbackPreference`
- SQLite schema 和 migration 已完成增强画像字段升级。
- Codex 登录已改为官方 CLI 登录流，不再依赖复制 `~/.codex/auth.json`。
- Renderer / main / preload / store 已接入：
  - `getCodexAuthStatus`
  - `startCodexLogin`
  - `startCodexDeviceLogin`
  - `logoutCodex`

当前相关核心文件：

- `src/renderer/layouts/app-shell.tsx`
- `src/renderer/pages/dashboard-content.tsx`
- `src/renderer/pages/page-data.ts`
- `src/renderer/store/app-store.ts`
- `src/shared/app-state.ts`
- `src/shared/bridge.ts`
- `src/shared/codex-auth.ts`
- `src/main/services/codex-cli-auth-service.ts`
- `src/main/services/app-storage-service.ts`
- `src/main/services/codex-cli-provider-adapter.ts`

## Guardrails

- 不要恢复旧的 `首页 / 学习计划 / 目标 / 对话 / 用户画像 / 复盘 / 设置` 七页结构。
- 不要把“对话”重新做回一级 tab；它只能是全局入口。
- 不要在默认设置页重新暴露大量 runtime / observability / provider 细节。
- 不要把 `gender` 用作计划强度或任务类型决策依据。
- 不要重新引入依赖 `auth.json` 的 Codex 登录实现。
- 新增前端代码时，优先把 `src/renderer/pages/dashboard-content.tsx` 拆小，不要继续把所有逻辑堆在一个文件里。

---

### Task 1: Extract the dashboard renderer into maintainable slices

**Files:**
- Create: `src/renderer/pages/dashboard/coach-drawer.tsx`
- Create: `src/renderer/pages/dashboard/today-page.tsx`
- Create: `src/renderer/pages/dashboard/path-page.tsx`
- Create: `src/renderer/pages/dashboard/profile-page.tsx`
- Create: `src/renderer/pages/dashboard/settings-page.tsx`
- Modify: `src/renderer/pages/dashboard-content.tsx`

**Step 1: Split the current dashboard file by responsibility**

- 把当前 `dashboard-content.tsx` 里的五块内容拆成独立组件：
  - `CoachDrawer`
  - `TodayPage`
  - `PathPage`
  - `ProfilePage`
  - `SettingsPage`
- `dashboard-content.tsx` 只保留页面路由分发和统一导出。

**Step 2: Keep all behavior unchanged during extraction**

- 这一步只做结构重组，不改交互。
- 提取后先保证现有功能等价：
  - 首启建档仍可保存本地画像和目标
  - Codex 登录状态仍能显示
  - 今日 / 路径 / 档案 / 设置四页仍可打开

**Step 3: Verify extraction**

Run:
- `npm run lint`
- `npm run build:renderer`

Expected:
- PASS

### Task 2: Finish the coach drawer approval loop

**Files:**
- Modify: `src/renderer/pages/dashboard/coach-drawer.tsx`
- Modify: `src/renderer/store/app-store.ts`

**Step 1: Surface action previews inside the coach drawer**

- 在抽屉中展示 `conversation.actionPreviews`，至少要显示：
  - 标题
  - summary
  - changes
  - 当前 reviewStatus
  - 当前 status

**Step 2: Wire accept / reject / apply actions**

- 复用 store 里现有的：
  - `reviewConversationActionPreview`
  - `applyAcceptedConversationActionPreviews`
- 用户能在抽屉内完成：
  - 接受单条建议
  - 拒绝单条建议
  - 一键应用已接受建议

**Step 3: Close the loop after apply**

- 应用完成后：
  - 刷新当前页面状态
  - 抽屉顶部显示“已写回画像 / 目标 / 路径”的结果文案
  - 如变更影响当前主路径，优先跳转到 `today` 或 `path`

**Step 4: Verify end-to-end behavior**

Run:
- `npm run lint`
- `npm run build`
- `node --test dist-electron/src/**/*.test.js`

Expected:
- PASS
- 手工验证：在 UI 中输入一条变化说明并生成建议后，能在抽屉内完成接受 / 应用闭环

### Task 3: Restore advanced settings without polluting the default settings page

**Files:**
- Create: `src/renderer/pages/dashboard/advanced-settings-panel.tsx`
- Modify: `src/renderer/pages/dashboard/settings-page.tsx`
- Modify: `src/renderer/store/app-store.ts`

**Step 1: Keep the default settings page minimal**

- 默认层只保留：
  - 主题
  - 启动页
  - `连接 Codex`

**Step 2: Move technical controls into a dedicated advanced panel**

- 在“高级设置”里恢复这些能力：
  - Provider 列表
  - Provider 启用 / 基础编辑
  - route 概览
  - 健康检查入口
  - runtime 摘要
  - observability 摘要
- 不要求一次性恢复旧版所有复杂 UI，但至少要把这些功能重新可访问。

**Step 3: Make the Codex card the primary provider entry**

- Codex 卡片应优先展示：
  - 当前连接状态
  - `连接 Codex`
  - `检查连接`
  - `断开连接`
  - `设备码回退`
- 其余 Provider 仍属于高级能力，不应争抢首屏注意力。

**Step 4: Verify settings layering**

Run:
- `npm run lint`
- `npm run build:renderer`

Expected:
- PASS
- 手工验证：默认设置页不暴露旧版大段技术状态，高级设置中仍能触达 runtime / provider 能力

### Task 4: Turn reflection into contextual actions instead of a standalone page

**Files:**
- Create: `src/renderer/pages/dashboard/reflection-sheet.tsx`
- Modify: `src/renderer/pages/dashboard/today-page.tsx`
- Modify: `src/renderer/pages/dashboard/path-page.tsx`
- Modify: `src/renderer/store/app-store.ts`

**Step 1: Add a lightweight reflection entry point after task status changes**

- 当用户在今日页把任务标记为：
  - `done`
  - `delayed`
  - `skipped`
- 立刻提供轻量复盘入口，而不是要求去独立“复盘页”。

**Step 2: Reuse existing reflection persistence**

- 复用当前 store 的 `saveReflectionEntry`。
- 不新增新的持久化模型；先把现有日 / 周 / 阶段复盘能力改成上下文入口。

**Step 3: Make path details progressive**

- `学习路径` 首屏继续只保留：
  - 当前主目标
  - 当前阶段
  - 最近 3-5 个任务
- 以下内容继续下沉到抽屉 / 展开层：
  - 完整路径依据
  - 历史快照
  - 版本对比
  - 历史解释

**Step 4: Verify the new flow**

Run:
- `npm run lint`
- `npm run build:renderer`

Expected:
- PASS
- 手工验证：用户在今日页完成或延后任务后，不需要跳到独立复盘页，也能留下反馈并影响后续路径建议

### Task 5: Final validation and doc sync

**Files:**
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`
- Modify: `docs/INFORMATION-ARCHITECTURE.md`
- Modify: `progress.md`
- Modify: `task_plan.md`
- Modify: `findings.md`

**Step 1: Run full verification**

Run:
- `npm run lint`
- `npm run build`
- `node --test dist-electron/src/**/*.test.js`
- `node --test src/renderer/pages/page-data.test.mjs`

Expected:
- PASS

**Step 2: Sync documentation**

- 在路线图中记录当前驾驶舱重构的真实状态。
- 在 IA 文档中移除旧版七页导航描述，改为四页导航 + 全局教练入口。
- 在 `progress.md` / `task_plan.md` 中把唯一下一任务明确写成：
  - `Task 2 / 完成教练入口确认闭环`

---

## Suggested Execution Order

新会话建议严格按这个顺序做：

1. `Task 1` 先拆组件，避免后续继续往单文件里堆逻辑
2. `Task 2` 先补齐教练闭环，这是新主路径最关键缺口
3. `Task 3` 再恢复高级设置能力
4. `Task 4` 最后补上下文复盘和路径抽屉
5. `Task 5` 收尾验证和文档同步

## Primary Acceptance Criteria

完成这份计划后，应该满足以下结果：

- 新用户第一次打开应用，不理解原始产品结构也能通过教练入口完成建档
- 生成建议后，用户能在教练抽屉内直接完成确认 / 应用闭环
- 设置页默认层只保留基础偏好和 Codex 连接，技术能力全部下沉到高级区
- 复盘不再是独立一级页面，而是任务执行后的上下文动作
- 学习路径默认只展示当前阶段和最近任务，复杂信息通过展开层查看
