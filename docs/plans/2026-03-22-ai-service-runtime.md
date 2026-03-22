# AI Service Runtime Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为项目接入统一 AI service、provider route 解析和主进程运行时基础，让设置页中的 capability route 真正影响统一 service 的执行目标，并把 Provider/route 配置落到结构化持久化层。

**Architecture:** 在 `src/main/services` 新增统一 AI service 和 OpenAI-compatible provider adapter，运行时从主进程结构化存储读取 provider 配置、route 和 secret，并按 capability 执行请求。`AppStorageService` 不再只依赖 snapshot 承接设置；它会把 `app_settings`、`provider_configs`、`model_routing` 作为真正的运行时来源，并提供一个可供设置页展示的 AI runtime 摘要。

**Tech Stack:** TypeScript, Electron IPC, SQLite + Drizzle, React, Zustand, Node `node:test`, Fetch API

---

### Task 1: AI service 测试先行

**Files:**
- Create: `src/main/services/ai-service.test.ts`
- Create: `src/shared/ai-service.ts`
- Test: `dist-electron/src/main/services/ai-service.test.js`

**Step 1: Write the failing test**

覆盖以下行为：
- route 会把 `plan_generation` / `profile_extraction` 解析到不同 provider
- provider 未启用、未配置 secret、缺少 capability 时抛出可理解错误
- 统一 service 会把请求转给 provider adapter，并返回结构化 `plan draft` / `suggestions`

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/services/ai-service.test.js`
Expected: FAIL，提示缺失统一 AI service/types 或断言不成立

**Step 3: Write minimal implementation**

新增统一 AI service 类型、route resolver 和 provider adapter 契约。

**Step 4: Run test to verify it passes**

Run: `npm run build:main && node --test dist-electron/src/main/services/ai-service.test.js`
Expected: PASS

### Task 2: 设置与路由结构化持久化

**Files:**
- Create: `src/main/repositories/settings-repository.ts`
- Create: `src/main/services/app-storage-service.test.ts`
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/shared/app-state.ts`

**Step 1: Write the failing test**

在 `src/main/services/app-storage-service.test.ts` 覆盖：
- `loadAppState` 会优先从 `app_settings` / `provider_configs` / `model_routing` 还原设置
- `saveAppState` / `upsertProviderConfig` 会把 route 与 provider 配置写入结构化表
- 结构化设置缺失时仍能从 snapshot 回填并自动迁移

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: FAIL，提示设置仍只保存在 snapshot 或结构化回填缺失

**Step 3: Write minimal implementation**

新增设置仓库，并把应用设置、Provider 配置和 route 持久化到已有 SQLite 表。

**Step 4: Run test to verify it passes**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 3: 运行时摘要与设置页展示

**Files:**
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/bridge.ts`
- Modify: `src/renderer/store/app-store.ts`
- Modify: `src/renderer/pages/page-content.tsx`

**Step 1: Write the failing test**

在 `src/main/services/app-storage-service.test.ts` 再补一个测试：
- AI runtime 摘要会返回每个 capability 的 route、provider、是否 ready 和阻塞原因
- route 变化会改变摘要中的 resolved provider

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: FAIL，提示缺失 runtime 摘要入口或 route 变化未反映到结果

**Step 3: Write minimal implementation**

新增 AI runtime 摘要 IPC/store/UI 展示，让设置页直接看到 capability route 当前会命中哪个 provider 以及是否具备调用前置条件。

**Step 4: Run test to verify it passes**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
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

把统一 AI service、provider route 执行层和结构化设置持久化改成已完成，并把“下一任务”推进到 `Phase 3 / Task 2`。

**Step 2: Run verification**

Run: `npm run build && node --test dist-electron/src/main/services/ai-service.test.js dist-electron/src/main/services/app-storage-service.test.js dist-electron/src/shared/app-state.test.js && npm run lint`
Expected: PASS
