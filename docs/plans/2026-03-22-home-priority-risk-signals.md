# Home Priority Risk Signals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 `Phase 4 / Task 4`，让首页首屏明确展示今日优先动作与风险提醒，并由真实任务执行和复盘输入驱动。

**Architecture:** 继续复用现有 `resolveDerivedAppState()` 链路，不新增数据库表。共享层先把执行状态、复盘输入和建议动作整理成更结构化的首页派生字段；renderer 首页再基于这些稳定字段做首屏分层展示，突出单条主动作、风险等级、原因和建议处理动作。

**Tech Stack:** TypeScript, Electron IPC, React, Zustand, SQLite + Drizzle, Node `node:test`

---

### Task 1: 先锁首页派生行为并写失败测试

**Files:**
- Modify: `src/shared/app-state.ts`
- Modify: `src/shared/app-state.test.ts`

**Step 1: Write the failing tests**

先补共享层失败测试，覆盖以下行为：
- 首页会派生单条“今日优先动作”，而不只是泛化 `todayFocus`
- 首页会派生结构化风险提醒，至少包含风险标题、原因和建议动作
- `updatePlanTaskStatus()` 与 `saveReflectionEntry()` 之后，首页优先动作 / 风险提醒会同步变化

**Step 2: Run tests to verify they fail**

Run: `npm run build:main && node --test dist-electron/src/shared/app-state.test.js`
Expected: FAIL，提示首页派生字段不存在或断言不成立

**Step 3: Write minimal implementation**

在共享状态里新增首页所需的优先动作 / 风险提醒结构，并在 `buildExecutionDerivedState()` 里根据延后、跳过、时间不足、难度偏高等现有信号生成最小可用结果。

**Step 4: Run tests to verify they pass**

Run: `npm run build:main && node --test dist-electron/src/shared/app-state.test.js`
Expected: PASS

### Task 2: 调整首页首屏展示层级

**Files:**
- Modify: `src/renderer/pages/page-content.tsx`

**Step 1: Implement the UI update**

把首页首屏改为更明确的“主动作 + 风险提醒 + 辅助动作”结构：
- 第一块显示单条优先动作、预计时长、当前阶段和为什么现在做
- 第二块显示风险提醒卡，强调风险等级、风险原因和推荐处理动作
- 保留复盘摘要与补充动作，但降级为辅助信息，避免与主动作抢焦点

**Step 2: Run build to verify renderer stays green**

Run: `npm run build`
Expected: PASS

### Task 3: 文档同步与总验证

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Step 1: Update docs**

把 `Phase 4 / Task 4` 的落点写清楚：首页现在如何展示今日优先动作、风险提醒如何由执行 / 复盘信号生成，以及 Phase 4 完成后下一任务推进到哪里。

**Step 2: Run verification**

Run: `npm run build && npm run lint && node --test dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/ai-service.test.js dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS
