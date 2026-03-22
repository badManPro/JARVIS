# Task Execution & Reflection Input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `Phase 4 / Task 1` 打通任务完成 / 跳过 / 延后状态流转，让计划页能触发真实执行动作，并把这些执行数据回流到首页摘要与复盘输入。

**Architecture:** 继续以 `plan_tasks` 作为任务当前状态的真实来源，但为每个任务补齐执行备注与最近状态更新时间，避免把执行数据重新塞回 `app_snapshots`。共享层新增任务状态流转与执行摘要派生逻辑；主进程通过独立 `updatePlanTaskStatus` 入口持久化单个任务状态变化；renderer 计划页增加执行动作，首页和复盘页消费同一份派生结果。

**Tech Stack:** TypeScript, Electron IPC, React, Zustand, SQLite + Drizzle, Node `node:test`

---

### Task 1: 共享状态与主进程测试先行

**Files:**
- Modify: `src/shared/app-state.ts`
- Modify: `src/shared/app-state.test.ts`
- Modify: `src/main/services/app-storage-service.test.ts`
- Test: `dist-electron/src/shared/app-state.test.js`
- Test: `dist-electron/src/main/services/app-storage-service.test.js`

**Step 1: Write the failing tests**

先新增两个最小失败测试：
- `updatePlanTaskStatus` 能把任务更新为 `done` / `skipped` / `delayed`，并记录执行备注与时间
- `AppStorageService.updatePlanTaskStatus()` 会持久化单个任务状态变化，同时刷新首页与复盘输入摘要

**Step 2: Run tests to verify they fail**

Run: `npm run build:main && node --test dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/app-storage-service.test.js`
Expected: FAIL，提示缺少任务状态更新入口、任务执行元数据或派生摘要逻辑

**Step 3: Write minimal implementation**

在共享层补齐任务状态枚举、执行元数据、纯函数状态流转和首页 / 复盘派生逻辑；在 `AppStorageService` 新增单任务状态更新入口。

**Step 4: Run tests to verify they pass**

Run: `npm run build:main && node --test dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 2: SQLite / Main / Bridge / Store 贯通任务执行入口

**Files:**
- Modify: `src/main/db/schema.ts`
- Modify: `src/main/db/client.ts`
- Modify: `src/main/repositories/entities-repository.ts`
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/bridge.ts`
- Modify: `src/renderer/store/app-store.ts`

**Step 1: Write the failing verification target**

此仓库暂无 bridge/store 自动化测试框架，本任务以 TypeScript 编译缺口作为失败信号：
- `plan_tasks` 缺少执行元数据列
- bridge / store 缺少 `updatePlanTaskStatus`

**Step 2: Run verification to verify it fails**

Run: `npm run build`
Expected: FAIL，提示共享类型或 bridge/store 方法未定义

**Step 3: Write minimal implementation**

为 `plan_tasks` 增加 `status_note` / `status_updated_at`，补 migration、实体仓储读写、main/preload IPC 和 store action，让任务执行动作能独立于“保存整个草案”运行。

**Step 4: Run verification to verify it passes**

Run: `npm run build`
Expected: PASS

### Task 3: 计划页执行动作与首页 / 复盘输入回流

**Files:**
- Modify: `src/renderer/pages/page-content.tsx`

**Step 1: Write the failing verification target**

此仓库暂无 renderer 自动化测试框架，本任务以编译缺口和行为约束作为验证目标：
- 计划页在非编辑态可对单个任务执行“开始 / 完成 / 跳过 / 延后”
- 跳过 / 延后需要有可写入的原因
- 执行动作后首页摘要与复盘页能立即看到真实执行数据

**Step 2: Run verification to verify gap**

Run: `npm run lint`
Expected: PASS before and after；实现前界面无真实任务执行动作与复盘输入回流

**Step 3: Write minimal implementation**

在计划页任务卡增加执行备注和快速状态动作；复用 store action 写入主进程；首页继续使用既有卡片，但改为展示真实派生摘要；复盘页新增最近执行记录区，明确这些数据已经来自真实任务流转。

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

把 `Phase 4 / Task 1` 的完成内容写清楚，说明任务状态流转、首页 / 复盘输入回流的落点，并把项目下一任务推进到 `Phase 4 / Task 2`。

**Step 2: Run verification**

Run: `npm run build && npm run lint && node --test dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/ai-service.test.js dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS
