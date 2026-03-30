# Phase 2 Today Execution Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the today page from a read-only generated plan into a step-level execution surface with real state transitions.

**Architecture:** Extend `TodayPlanStep` so each generated step carries its own execution state and metadata, then update shared state helpers and storage normalization to persist and advance that state. Rework the today page so it focuses on the current step, automatically advances after completion, and moves delayed steps into a tomorrow-candidate list with lightweight downstream-impact messaging.

**Tech Stack:** React, TypeScript, Zustand, Electron, node:test

**Status:** `complete`

**Completed In This Session:**
- Task 1 complete
- Task 2 complete
- Task 3 complete
- Task 4 complete
- Task 5 complete

**Verified Evidence:**
- `npm run build`
- `node --test dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/app-storage-service.test.js src/renderer/pages/dashboard/today-page.test.mjs src/renderer/pages/dashboard/reflection-flow.test.mjs`

**Next Task:** `Phase 3 / Task 1 / 为目标增加主副角色和调度权重`

---

### Task 1: Extend Today Plan Step Model

**Files:**
- Modify: `src/shared/app-state.ts`
- Modify: `src/main/services/app-storage-service.ts`
- Test: `src/shared/app-state.test.ts`

**Step 1: Write the failing tests**

- Add assertions that a generated/normalized today plan step always includes:
  - `id`
  - `status`
  - `statusNote`
  - `statusUpdatedAt`
- Add assertions that delaying a today-plan step moves it into a `tomorrowCandidates` list.

**Step 2: Run test to verify it fails**

Run:
```bash
npm run build:main && node --test dist-electron/src/shared/app-state.test.js
```

Expected:
- Missing today-step execution fields
- Missing tomorrow-candidate behavior

**Step 3: Write minimal implementation**

- Extend `TodayPlanStep` and `TodayPlan`
- Normalize fallback/generated today plans into the new shape
- Add shared helpers to update today-step status and derive the next focus step

**Step 4: Run test to verify it passes**

Run:
```bash
npm run build:main && node --test dist-electron/src/shared/app-state.test.js
```

Expected:
- Updated shared-state tests pass

### Task 2: Persist Step-Level Today Execution Changes

**Files:**
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/renderer/store/app-store.ts`
- Test: `src/main/services/app-storage-service.test.ts`

**Step 1: Write the failing tests**

- Add assertions that updating a today-plan step:
  - persists the step status and note
  - preserves the current today plan
  - surfaces the next focus step after completion

**Step 2: Run test to verify it fails**

Run:
```bash
npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js
```

Expected:
- Missing persistence/update path for today-plan steps

**Step 3: Write minimal implementation**

- Add a dedicated app-storage update path for today-plan step status
- Expose the bridge/store action needed by the renderer
- Keep existing rough-plan task status behavior unchanged

**Step 4: Run test to verify it passes**

Run:
```bash
npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js
```

Expected:
- Today-step persistence tests pass

### Task 3: Rework Today Page Around Execution Steps

**Files:**
- Modify: `src/renderer/pages/dashboard/shared.tsx`
- Modify: `src/renderer/pages/dashboard/today-page.tsx`
- Test: `src/renderer/pages/dashboard/today-page.test.mjs`
- Test: `src/renderer/pages/dashboard/reflection-flow.test.mjs`

**Step 1: Write the failing tests**

- Add assertions that:
  - the today page renders a focused current step section
  - step cards expose `开始 / 完成 / 延期 / 跳过`
  - the page references `明天候选区`
  - the page references delayed/skip downstream impact copy

**Step 2: Run test to verify it fails**

Run:
```bash
node --test src/renderer/pages/dashboard/today-page.test.mjs src/renderer/pages/dashboard/reflection-flow.test.mjs
```

Expected:
- Source assertions fail for missing execution-step UI

**Step 3: Write minimal implementation**

- Add helper functions for today-step focus labels and badges
- Render a primary execution card for the current step
- Render remaining steps plus tomorrow candidates
- Open reflection sheet after `完成 / 延期 / 跳过`

**Step 4: Run test to verify it passes**

Run:
```bash
node --test src/renderer/pages/dashboard/today-page.test.mjs src/renderer/pages/dashboard/reflection-flow.test.mjs
```

Expected:
- UI source tests pass

### Task 4: Final Verification

**Files:**
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`

**Step 1: Run targeted verification**

Run:
```bash
npm run build:main && node --test dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/app-storage-service.test.js && node --test src/renderer/pages/dashboard/today-page.test.mjs src/renderer/pages/dashboard/reflection-flow.test.mjs
```

Expected:
- All targeted checks pass

**Step 2: Run broader verification**

Run:
```bash
npm run build
```

Expected:
- Full build succeeds

**Step 3: Sync roadmap**

- Mark Phase 2 as `in_progress`
- Record that step execution and tomorrow-candidate behavior now exist on the today page
