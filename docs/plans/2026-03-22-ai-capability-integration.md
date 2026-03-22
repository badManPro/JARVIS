# AI Capability Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把 `profile_extraction` / `plan_generation` / `plan_adjustment` 接到真实业务入口，让对话建议提取、计划重生成和计划调整建议都通过统一 AI service 执行，并复用现有的结构化预览与本地持久化链路。

**Architecture:** 在 `AppStorageService` 增加三个 capability 入口：对话建议提取、AI 计划重生成、AI 计划调整建议生成。`profile_extraction` 与 `plan_adjustment` 的结果统一回流到 `conversation.suggestions`，继续由 `resolveConversationState` 产出 action previews 并沿用“先审核再应用”边界；`plan_generation` 则替换现有 `createPlanDraft(..., 'regenerated')` 的本地模板重生成逻辑，保留原有快照归档路径。

**Tech Stack:** TypeScript, Electron IPC, React, Zustand, SQLite + Drizzle, Node `node:test`

---

### Task 1: 主进程 capability 入口测试先行

**Files:**
- Modify: `src/main/services/app-storage-service.test.ts`
- Modify: `src/shared/ai-service.ts`
- Test: `dist-electron/src/main/services/app-storage-service.test.js`

**Step 1: Write the failing test**

在 `src/main/services/app-storage-service.test.ts` 增加三组测试：
- `runProfileExtraction` 会调用 `aiService.execute('profile_extraction')`，把返回的 suggestions 写回 `conversation.suggestions`，并生成可审核的 `actionPreviews`
- `regenerateLearningPlanDraft` 改为调用 `aiService.execute('plan_generation')`，仍会先归档快照，再把 AI 返回 draft 写入当前目标草案
- `generatePlanAdjustmentSuggestions` 会基于当前草案和反馈上下文调用 `aiService.execute('plan_adjustment')`，再把文本结果拆成 suggestions 写回对话预览链路

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: FAIL，提示缺少 capability 入口或仍在使用本地模板逻辑

**Step 3: Write minimal implementation**

在 shared/main 层补齐 capability 请求/结果承接类型和主进程入口方法，只做通过测试所需的最小改动。

**Step 4: Run test to verify it passes**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 2: IPC / preload / store 贯通 capability 调用

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/bridge.ts`
- Modify: `src/renderer/store/app-store.ts`

**Step 1: Write the failing test**

此仓库暂无 preload/store 自动化测试框架，本任务以 TypeScript 编译错误作为失败信号：先改调用侧接口，再观察编译缺口。

**Step 2: Run verification to verify it fails**

Run: `npm run build`
Expected: FAIL，提示新增 capability bridge/store 方法未定义

**Step 3: Write minimal implementation**

新增 renderer 可调用的 capability 方法：
- `runProfileExtraction`
- `generatePlanAdjustmentSuggestions`
- 让 `regenerateLearningPlanDraft` 继续保留原入口名，但底层改为 AI 驱动

**Step 4: Run verification to verify it passes**

Run: `npm run build`
Expected: PASS

### Task 3: 对话页与计划页接真实 capability 入口

**Files:**
- Modify: `src/renderer/pages/page-content.tsx`

**Step 1: Write the failing test**

此仓库暂无 renderer 测试框架，本任务改为通过类型检查和行为性验证约束：
- 对话页新增“提取建议”动作
- 计划页“重新生成计划”走 AI 计划生成
- 计划页新增“生成调整建议”动作，并提示结果已回流到对话预览

**Step 2: Run verification to verify gap**

Run: `npm run lint`
Expected: PASS before and after；实现前界面无真实 capability 触发按钮或说明

**Step 3: Write minimal implementation**

把用户触发动作接到 store 新方法，并复用现有 notice / loading / error 展示。

**Step 4: Run verification to verify it passes**

Run: `npm run lint`
Expected: PASS

### Task 4: 文档与阶段推进

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Step 1: Update docs**

把 `Phase 3 / Task 2` 标记为已完成，说明三个 capability 的真实业务入口，并把项目下一任务推进到 `Phase 3 / Task 3`。

**Step 2: Run verification**

Run: `npm run build && npm run lint && node --test dist-electron/src/main/services/ai-service.test.js dist-electron/src/main/services/app-storage-service.test.js dist-electron/src/shared/app-state.test.js`
Expected: PASS
