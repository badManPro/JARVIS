# High-Risk Write Transaction Protection Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 `Phase 5 / Task 4`，为删除 / 重排 / 重生成 / 批量应用预览等高风险写路径补齐事务保护，避免 SQLite 在中途失败时留下半完成状态。

**Architecture:** 继续以 `AppStorageService` 作为主进程写入编排层，不新增表。通过 `AppStateRepository.transaction()` 把结构化表与 `app_snapshots` 的复合写入收口成单次 SQLite 事务；AI capability 的错误处理与本地持久化提交分离，避免把本地落库失败误判为 Provider 健康异常。

**Tech Stack:** TypeScript, Electron IPC, SQLite + Drizzle, better-sqlite3 transaction, Node `node:test`

---

### Task 1: 先补失败测试，证明当前实现会留下半完成状态

**Files:**
- Modify: `src/main/services/app-storage-service.test.ts`
- Test: `dist-electron/src/main/services/app-storage-service.test.js`

**Step 1: Write the failing tests**

补回滚测试，覆盖以下场景：
- 删除目标时，如果结构化持久化中途失败，目标、草案和快照都必须保留原状
- 手动保存草案（含任务重排）时，如果 `app_snapshots` 写入失败，任务顺序必须回滚
- 计划重生成时，如果最终快照提交失败，归档快照和新草案都不能残留

**Step 2: Run tests to verify they fail**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: FAIL，提示删除或重排后状态被部分持久化

### Task 2: 为复合写路径补事务边界

**Files:**
- Modify: `src/main/repositories/app-state-repository.ts`
- Modify: `src/main/services/app-storage-service.ts`

**Step 1: Write minimal implementation**

实现事务保护：
- 在 `AppStateRepository` 暴露统一 transaction 入口
- `AppStorageService` 新增原子提交 helper，把结构化表与 `app_snapshots` 一起提交
- 删除目标、保存草案、重生成计划、批量应用 action preview、建议回流、任务状态/复盘写入等复合写路径统一走该 helper
- AI capability 成功后的本地 commit 移出 runtime `try/catch`，避免本地持久化失败误回写 `warning`

**Step 2: Run tests to verify they pass**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 3: 文档同步与阶段推进

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Step 1: Update docs**

把 `Phase 5 / Task 4` 标记为已完成，写清楚事务保护的边界、回滚测试结果，以及项目下一任务推进到 `Phase 6 / Task 1`。

**Step 2: Run verification**

Run: `npm run lint && npm run build:main && node --test dist-electron/src/**/*.test.js`
Expected: PASS
