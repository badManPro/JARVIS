# First-Run Onboarding & Empty State Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 `Phase 6 / Task 4`，让空数据库首次启动进入真实空状态，并在首页提供可执行的首次引导。

**Architecture:** 主进程初始化不再把 `seedState` 直接持久化为首启数据，而是改用独立的空状态工厂。共享状态层新增首启引导派生结果，renderer 首页消费它并展示统一入口，同时保留各业务页自己的空状态文案。

**Tech Stack:** TypeScript, Electron main process, Zustand, React, Node test runner

---

### Task 1: Write failing initialization tests

**Files:**
- Modify: `src/main/services/app-storage-service.test.ts`
- Modify: `src/shared/app-state.test.ts`

**Step 1: Write the failing test**

- 为 `AppStorageService.initialize()` 增加“空数据库首启返回真实空状态”的断言。
- 为共享状态派生逻辑增加“空状态时生成 onboarding checklist”的断言。

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js dist-electron/src/shared/app-state.test.js`

Expected: FAIL，原因指向当前仍使用 `seedState` 且首页没有 onboarding 派生结果。

### Task 2: Implement empty first-run state and onboarding derivation

**Files:**
- Modify: `src/shared/app-state.ts`
- Modify: `src/main/services/app-storage-service.ts`

**Step 1: Write minimal implementation**

- 新增空状态工厂，保留 `seedState` 作为测试/演示数据，不再用于首启初始化。
- 扩展 dashboard 派生结果，产出首启引导状态与 checklist。

**Step 2: Run tests to verify they pass**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js dist-electron/src/shared/app-state.test.js`

Expected: PASS

### Task 3: Render onboarding and unified empty-state entry points

**Files:**
- Modify: `src/renderer/layouts/app-shell.tsx`
- Modify: `src/renderer/pages/page-content.tsx`

**Step 1: Implement renderer changes**

- 首页在首启/空状态下展示引导卡、检查项和跳转按钮。
- 侧边栏和当前实现边界文案适配真实空状态，不再假设一定有当前草案。

**Step 2: Run related verification**

Run: `npm run build`

Expected: PASS

### Task 4: Verify and sync docs

**Files:**
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`
- Modify: `docs/RELEASE-READINESS.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Modify: `task_plan.md`

**Step 1: Run verification**

Run:
- `npm run lint`
- `npm run build`
- `node --test dist-electron/src/**/*.test.js`

Expected: PASS

**Step 2: Sync docs**

- 记录 `Task 4` 已完成
- 写清首次启动 / 空状态验收结论
- 指定唯一下一任务
