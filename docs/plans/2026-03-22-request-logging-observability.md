# Request Logging & Minimal Observability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为真实 AI capability 调用补齐轻量请求日志、最小可观测性摘要和设置页展示，让用户能看到最近调用的状态、耗时和失败原因。

**Architecture:** 在主进程新增独立 `ai_request_logs` 结构化表和仓储，由 `AppStorageService` 统一包裹 capability 调用并记录日志元数据。renderer 通过新的 observability bridge 获取聚合摘要和最近请求列表，并在设置页与现有 runtime 摘要一起展示。日志只保存 capability/provider/model/状态/耗时/错误摘要等元数据，不保存 prompt 或对话正文。

**Tech Stack:** TypeScript, Electron IPC, React, Zustand, SQLite + Drizzle, Node `node:test`

---

### Task 1: 日志持久化与摘要测试先行

**Files:**
- Modify: `src/main/services/app-storage-service.test.ts`
- Modify: `src/shared/ai-service.ts`
- Test: `dist-electron/src/main/services/app-storage-service.test.js`

**Step 1: Write the failing test**

在 `src/main/services/app-storage-service.test.ts` 增加测试：
- capability 调用成功后会记录一条 `success` 请求日志，并出现在 observability 摘要中
- capability 调用失败后会记录一条 `error` 请求日志，并保留错误摘要
- observability 摘要会返回总请求数、成功/失败数和最近请求列表

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: FAIL，提示缺少 observability 类型、日志仓储或 `getAiObservability`

**Step 3: Write minimal implementation**

新增 shared observability 类型，并在主进程补齐日志写入与摘要读取所需的最小实现。

**Step 4: Run test to verify it passes**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 2: SQLite / Main / Bridge 贯通 observability 查询

**Files:**
- Modify: `src/main/db/schema.ts`
- Modify: `src/main/db/client.ts`
- Create: `src/main/repositories/ai-request-log-repository.ts`
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/bridge.ts`
- Modify: `src/renderer/store/app-store.ts`

**Step 1: Write the failing verification target**

此仓库暂无 bridge/store 自动化测试框架，本任务以 TypeScript 编译缺口作为失败信号：
- bridge 缺少 `getAiObservability`
- store 缺少 observability state 和刷新逻辑

**Step 2: Run verification to verify it fails**

Run: `npm run build`
Expected: FAIL，提示 observability 新类型或新方法未定义

**Step 3: Write minimal implementation**

新增日志表、仓储、`AppStorageService.getAiObservability()` 以及 main/preload/bridge/store 调用链；让 capability 调用成功或失败后同步刷新 runtime 摘要与 observability。

**Step 4: Run verification to verify it passes**

Run: `npm run build`
Expected: PASS

### Task 3: 设置页展示最小可观测性

**Files:**
- Modify: `src/renderer/pages/page-content.tsx`

**Step 1: Write the failing verification target**

此仓库暂无 renderer 自动化测试框架，本任务以编译缺口和行为约束作为失败信号：
- 设置页新增总览卡片或文案，展示请求总数、成功/失败数和最近请求时间
- 最近请求列表展示 capability、provider、状态、耗时和错误摘要
- capability 调用后进入设置页可立即看到最新 observability 数据

**Step 2: Run verification to verify gap**

Run: `npm run lint`
Expected: PASS before and after；实现前界面无 observability 展示

**Step 3: Write minimal implementation**

复用现有设置页布局与 badge 体系，补一个低成本但可读的 observability 区域，不新增单独页面。

**Step 4: Run verification to verify it passes**

Run: `npm run build && npm run lint`
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

把 `Phase 3 / Task 4` 标记为已完成，说明请求日志与最小可观测性的落点，并把项目下一任务推进到 `Phase 4 / Task 1`。

**Step 2: Run verification**

Run: `npm run build && npm run lint && node --test dist-electron/src/main/services/ai-service.test.js dist-electron/src/main/services/app-storage-service.test.js dist-electron/src/shared/app-state.test.js`
Expected: PASS
