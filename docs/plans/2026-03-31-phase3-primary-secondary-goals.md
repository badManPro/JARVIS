# Phase 3 Primary Secondary Goals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add explicit primary/secondary goal roles and scheduling weight so the app has one durable main goal and structured scheduling metadata for later calendar work.

**Architecture:** Extend `LearningGoal` with `role` and `scheduleWeight`, then normalize goal collections so `plan.activeGoalId` and the unique `main` goal always agree. Persist the new fields through SQLite, surface them in goal/path UI, and keep current rough-plan and today-plan flows centered on the active main goal.

**Tech Stack:** TypeScript, React, Zustand, Electron, SQLite, Drizzle, Node test runner

---

### Task 1: Lock the new behavior with red tests

**Files:**
- Modify: `src/shared/app-state.test.ts`
- Modify: `src/main/services/app-storage-service.test.ts`
- Modify: `src/renderer/pages/dashboard/path-page.test.mjs`

**Step 1: Write failing shared-state assertions**

Add tests for:
- a goal collection with missing or conflicting roles being normalized to one `main`
- `scheduleWeight` defaulting to stable values for main/secondary goals

**Step 2: Write failing storage-service assertions**

Add tests for:
- creating a secondary goal keeps the current main goal
- setting a new active goal promotes it to `main` and demotes the previous one
- deleting the active main goal promotes the next remaining goal

**Step 3: Write failing UI exposure assertions**

Add a lightweight source test that expects the path page to render:
- `主目标`
- `副目标`
- `调度权重`

**Step 4: Run the targeted tests and confirm they fail**

Run:
- `npm run build:main`
- `node --test dist-electron/src/shared/app-state.test.js`
- `node --test dist-electron/src/main/services/app-storage-service.test.js`
- `node --test src/renderer/pages/dashboard/path-page.test.mjs`

### Task 2: Implement the goal role and weight model

**Files:**
- Modify: `src/shared/app-state.ts`
- Modify: `src/shared/goal.ts`
- Modify: `src/shared/plan-draft.ts`
- Modify: `src/main/services/state-consistency.ts`

**Step 1: Extend the goal types**

Add:
- `LearningGoalRole`
- `role`
- `scheduleWeight`

**Step 2: Add goal normalization helpers**

Normalize:
- exactly one `main` goal when goals exist
- `plan.activeGoalId` to that same goal
- default/clamped schedule weights

**Step 3: Update seed and helper selectors**

Ensure:
- seed data carries role and weight
- active-goal helpers fall back through normalized main-goal semantics

### Task 3: Persist the new goal fields

**Files:**
- Modify: `src/main/db/schema.ts`
- Modify: `src/main/db/migrations.ts`
- Modify: `src/main/repositories/entities-repository.ts`
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/renderer/store/app-store.ts`

**Step 1: Add SQLite columns and migration**

Persist:
- `role`
- `schedule_weight`

**Step 2: Route all goal writes through normalized scheduling logic**

Cover:
- onboarding goal creation
- manual goal upsert
- `setActiveGoal`
- goal deletion fallback

**Step 3: Keep fallback renderer state aligned**

If the bridge is unavailable, local optimistic state should still preserve the same goal-role rules.

### Task 4: Expose role and weight in UI

**Files:**
- Modify: `src/renderer/pages/dashboard/shared.tsx`
- Modify: `src/renderer/pages/dashboard/path-page.tsx`
- Modify: `src/renderer/pages/page-content.tsx`
- Modify: `src/renderer/layouts/app-shell.tsx`

**Step 1: Show main vs secondary clearly**

Add badges or labels for:
- `主目标`
- `副目标`

**Step 2: Show scheduling weight**

Expose weight in:
- goal editor
- goal list/path management cards

**Step 3: Preserve current scope**

Do not add:
- calendar page
- auto weekly allocation UI
- AI-driven rebalancing

### Task 5: Verify and sync docs

**Files:**
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`
- Modify: `task_plan.md`
- Modify: `progress.md`
- Modify: `findings.md`

**Step 1: Run targeted verification**

Run:
- `npm run build:main`
- `node --test dist-electron/src/shared/app-state.test.js`
- `node --test dist-electron/src/main/services/app-storage-service.test.js`
- `node --test src/renderer/pages/dashboard/path-page.test.mjs`
- `npm run build`

**Step 2: Update progress docs**

Record:
- what changed
- what was verified
- the next unique task after Phase 3 / Task 1
