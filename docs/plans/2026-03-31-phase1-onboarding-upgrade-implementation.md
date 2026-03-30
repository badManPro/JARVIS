# Phase 1 Onboarding Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade onboarding so the app stores and surfaces a derived planning confirmation, not just raw persona inputs.

**Architecture:** Extend the existing `UserProfile` and onboarding result flow with four new planning-confirmation fields, persist them through the current SQLite/repository layer, derive them during `completeInitialOnboarding()`, and expose them in the onboarding result overlay, profile page, and AI prompt context.

**Tech Stack:** Electron, React, TypeScript, Zustand, better-sqlite3, Drizzle, node:test

---

### Task 1: Extend Profile Model And Persistence

**Files:**
- Modify: `src/shared/app-state.ts`
- Modify: `src/shared/onboarding.ts`
- Modify: `src/main/db/schema.ts`
- Modify: `src/main/db/migrations.ts`
- Modify: `src/main/repositories/entities-repository.ts`
- Test: `src/shared/app-state.test.ts`
- Test: `src/main/db/client.test.ts`

**Step 1: Write the failing tests**

- Add assertions that `createEmptyAppState().profile` includes:
  - `planningStyle`
  - `decisionSupportLevel`
  - `feedbackTone`
  - `autonomyPreference`
- Add DB migration assertions that `user_profiles` includes matching new columns.

**Step 2: Run tests to verify they fail**

Run:
```bash
node --test src/shared/app-state.test.ts src/main/db/client.test.ts
```

Expected:
- `UserProfile` shape assertions fail
- schema version / column assertions fail

**Step 3: Write minimal implementation**

- Extend `UserProfile`, `createEmptyUserProfile()`, and `normalizeUserProfile()`
- Extend onboarding payload/result types only where needed
- Add new `user_profiles` columns in schema + migration
- Load/save new fields in `EntitiesRepository`

**Step 4: Run tests to verify they pass**

Run:
```bash
node --test src/shared/app-state.test.ts src/main/db/client.test.ts
```

Expected:
- All targeted tests pass

### Task 2: Derive Planning Confirmation During Onboarding

**Files:**
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/main/services/openai-compatible-provider-adapter.ts`
- Test: `src/main/services/app-storage-service.test.ts`

**Step 1: Write the failing tests**

- Extend onboarding service tests so `completeInitialOnboarding()` must:
  - persist derived planning fields
  - return a summary that includes planning confirmation highlights

**Step 2: Run test to verify it fails**

Run:
```bash
node --test src/main/services/app-storage-service.test.ts
```

Expected:
- onboarding persistence assertions fail for missing planning fields / summary content

**Step 3: Write minimal implementation**

- Add a small deterministic derivation helper based on MBTI, pace, stress, and feedback preferences
- Store the derived fields in the profile during onboarding
- Include the new fields in onboarding summary output
- Include the new fields in plan-generation / daily-plan / adjustment prompt context

**Step 4: Run tests to verify it passes**

Run:
```bash
node --test src/main/services/app-storage-service.test.ts
```

Expected:
- onboarding tests pass

### Task 3: Surface Planning Confirmation In The UI

**Files:**
- Modify: `src/renderer/pages/dashboard/shared.tsx`
- Modify: `src/renderer/pages/dashboard/profile-page.tsx`
- Modify: `src/renderer/pages/dashboard/coach-drawer.tsx`
- Test: `src/renderer/pages/dashboard/coach-drawer.test.mjs`

**Step 1: Write the failing tests**

- Add assertions that:
  - onboarding result overlay references a planning confirmation section
  - profile page exposes planning confirmation labels / editing fields

**Step 2: Run test to verify it fails**

Run:
```bash
node --test src/renderer/pages/dashboard/coach-drawer.test.mjs
```

Expected:
- source assertions fail for missing planning confirmation UI

**Step 3: Write minimal implementation**

- Add planning confirmation copy helpers in shared UI code
- Show the derived confirmation in onboarding result overlay
- Show the same data in profile page and allow editing

**Step 4: Run tests to verify it passes**

Run:
```bash
node --test src/renderer/pages/dashboard/coach-drawer.test.mjs
```

Expected:
- UI source tests pass

### Task 4: Final Verification

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Step 1: Run targeted verification**

Run:
```bash
node --test src/shared/app-state.test.ts src/main/db/client.test.ts src/main/services/app-storage-service.test.ts src/renderer/pages/dashboard/coach-drawer.test.mjs
```

Expected:
- All targeted tests pass

**Step 2: Run broader checks**

Run:
```bash
npm run build
```

Expected:
- full build succeeds

**Step 3: Sync planning files**

- Mark completed tasks
- Record verification evidence
- Record any migration / prompt decisions
