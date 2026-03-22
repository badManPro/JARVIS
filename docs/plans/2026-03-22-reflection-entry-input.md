# Reflection Entry Input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `Phase 4 / Task 2` 补齐日 / 周 / 阶段复盘的结构化输入、真实持久化和页面编辑链路。

**Architecture:** 新增独立 `reflection_entries` 结构化表保存复盘手动输入，而不是继续把这些字段塞回 `app_snapshots`。共享层负责把手动输入与任务执行派生摘要合成为分周期复盘视图；主进程提供 `saveReflectionEntry` 入口把输入落到 SQLite 并刷新复盘 / 首页摘要；renderer 复盘页新增周期切换、结构化表单和建议区。

**Tech Stack:** TypeScript, Electron IPC, React, Zustand, SQLite + Drizzle, Node `node:test`

---

### Task 1: 共享状态与失败测试先行

**Files:**
- Modify: `src/shared/app-state.ts`
- Modify: `src/shared/app-state.test.ts`
- Modify: `src/main/services/app-storage-service.test.ts`
- Test: `dist-electron/src/shared/app-state.test.js`
- Test: `dist-electron/src/main/services/app-storage-service.test.js`

**Step 1: Write the failing tests**

先新增两个最小失败测试：
- `saveReflectionEntry` 会把指定周期的复盘输入写回共享状态，并生成该周期的统计 / 建议视图
- `AppStorageService.saveReflectionEntry()` 会持久化复盘输入，并在重新加载后保留结果

**Step 2: Run tests to verify they fail**

Run: `npm run build:main`
Expected: FAIL，提示缺少复盘输入类型、共享更新函数或 `AppStorageService.saveReflectionEntry`

**Step 3: Write minimal implementation**

在共享层补齐复盘周期、结构化输入、周期派生摘要和 `saveReflectionEntry` 纯函数，只做通过测试所需的最小实现。

**Step 4: Run tests to verify they pass**

Run: `npm run build:main && node --test dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 2: SQLite / Repository / Bridge / Store 贯通复盘输入

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

此仓库暂无独立 repository 自动化测试框架，本任务以 TypeScript 编译缺口作为失败信号：
- 缺少 `reflection_entries` 表和读写方法
- bridge / store 缺少 `saveReflectionEntry`

**Step 2: Run verification to verify it fails**

Run: `npm run build`
Expected: FAIL，提示 schema、bridge 或 store 方法未定义

**Step 3: Write minimal implementation**

新增 `reflection_entries` 表及仓储读写，在主进程暴露 `saveReflectionEntry`，并让 store 可直接保存单个周期的复盘输入。

**Step 4: Run verification to verify it passes**

Run: `npm run build`
Expected: PASS

### Task 3: 复盘页周期切换与结构化表单

**Files:**
- Modify: `src/renderer/pages/page-content.tsx`

**Step 1: Write the failing verification target**

此仓库暂无 renderer 自动化测试框架，本任务以编译缺口和手动行为约束作为验证目标：
- 页面可在日 / 周 / 阶段间切换
- 每个周期可编辑问题归因、自评和后续动作
- 保存后建议区、统计卡和刷新后的本地状态一致

**Step 2: Run verification to verify gap**

Run: `npm run lint`
Expected: PASS before and after；实现前页面没有真实复盘输入表单

**Step 3: Write minimal implementation**

新增复盘周期切换、结构化表单、本地保存按钮和建议区，复用 store action 写入主进程，并展示该周期的执行统计与最近记录。

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

把 `Phase 4 / Task 2` 的完成内容写清楚，说明复盘输入的数据落点、页面能力和后续 `Phase 4 / Task 3` 的衔接方式。

**Step 2: Run verification**

Run: `npm run build && npm run lint && node --test dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/ai-service.test.js dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS
