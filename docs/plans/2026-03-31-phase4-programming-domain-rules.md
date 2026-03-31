# Phase 4 Programming Domain Rules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a durable programming goal domain with concrete execution rules, resource guidance, and task atoms so rough plans, daily plans, and AI prompts stop using one generic template.

**Architecture:** Extend `LearningGoal` with a persisted `domain` field and add a shared programming-domain rules module. Reuse that module from rough-plan fallback, daily-plan fallback, and prompt builders so local fallback behavior and AI behavior stay aligned. Expose the domain in goal/path UI and apply lightweight inference for onboarding-created goals.

**Tech Stack:** TypeScript, React, Zustand, Electron, SQLite, Drizzle, Node test runner

---

### Task 1: Lock programming-domain behavior with failing tests

**Files:**
- Create: `src/shared/domain-rules.test.ts`
- Modify: `src/main/services/app-storage-service.test.ts`
- Modify: `src/main/services/openai-compatible-provider-adapter.test.ts`
- Modify: `src/renderer/pages/dashboard/path-page.test.mjs`

**Step 1: Write failing shared-domain tests**

Add tests for:
- inferring `programming` from goal title / baseline keywords
- building a programming rough-plan fallback that includes code practice, runnable output, and doc-first guidance

**Step 2: Write failing storage-service tests**

Add tests for:
- persisting `domain` on learning goals
- programming fallback daily plans returning programming-specific resources/practice when AI generation fails

**Step 3: Write failing prompt tests**

Add assertions that `plan_generation` and `daily_plan_generation` prompts include:
- explicit domain label
- programming execution rules
- programming resource strategy
- programming task atoms / runnable output guidance

**Step 4: Write failing UI exposure test**

Expect the path page source to expose:
- `领域`
- `编程`

**Step 5: Run the targeted tests and confirm they fail**

Run:
- `npm run build:main`
- `node --test dist-electron/src/shared/domain-rules.test.js`
- `node --test dist-electron/src/main/services/app-storage-service.test.js`
- `node --test dist-electron/src/main/services/openai-compatible-provider-adapter.test.js`
- `node --test src/renderer/pages/dashboard/path-page.test.mjs`

### Task 2: Add the goal domain model and shared programming rules

**Files:**
- Modify: `src/shared/app-state.ts`
- Modify: `src/shared/goal.ts`
- Create: `src/shared/domain-rules.ts`
- Modify: `src/shared/plan-draft.ts`

**Step 1: Extend goal types**

Add:
- `LearningGoalDomain`
- `domain` on `LearningGoal`
- `domain` on `LearningGoalInput`

**Step 2: Add normalization and inference helpers**

Cover:
- defaulting to `general`
- inferring `programming` from common programming keywords
- labeling domains for UI display

**Step 3: Add shared programming-domain config**

Include:
- rough-plan stage/task guidance
- daily-plan step/resource/practice guidance
- prompt instruction snippets

**Step 4: Reuse shared rules in rough-plan fallback**

Update `createPlanDraft` so programming goals produce programming-specific summaries, stages, milestones, and task atoms.

### Task 3: Persist and hydrate goal domains end-to-end

**Files:**
- Modify: `src/main/db/schema.ts`
- Modify: `src/main/db/migrations.ts`
- Modify: `src/main/repositories/entities-repository.ts`
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/renderer/store/app-store.ts`

**Step 1: Add SQLite column and migration**

Persist:
- `learning_goals.domain`

**Step 2: Route onboarding and goal upserts through domain normalization**

Cover:
- onboarding-created main goal
- manual goal create/edit
- load/save hydration

**Step 3: Keep fallback renderer logic aligned**

If the bridge is unavailable, local optimistic state should keep the same domain defaults/inference.

### Task 4: Feed programming rules into daily-plan fallback, prompts, and UI

**Files:**
- Modify: `src/main/services/openai-compatible-provider-adapter.ts`
- Modify: `src/main/services/codex-cli-provider-adapter.ts`
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/renderer/pages/page-content.tsx`
- Modify: `src/renderer/pages/dashboard/path-page.tsx`

**Step 1: Upgrade local daily-plan fallback**

Make programming goals default to:
- doc + code verification steps
- official-doc style resources
- runnable code output practice

**Step 2: Upgrade AI prompt builders**

Inject:
- domain label
- programming execution rules
- programming resource strategy
- programming task atoms

**Step 3: Expose domain in goal/path UI**

Add:
- goal editor select for `通用 / 编程`
- domain badge or label in path cards and header

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
- `node --test dist-electron/src/shared/domain-rules.test.js`
- `node --test dist-electron/src/main/services/app-storage-service.test.js`
- `node --test dist-electron/src/main/services/openai-compatible-provider-adapter.test.js`
- `node --test src/renderer/pages/dashboard/path-page.test.mjs`
- `npm run build`

**Step 2: Update progress docs**

Record:
- what changed
- what was verified
- the next unique task after `Phase 4 / Task 1`
