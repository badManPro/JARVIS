# Reflection Feedback Suggestions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `Phase 4 / Task 3` 打通“复盘结果影响画像与计划建议生成”的最小闭环，让复盘输入不仅影响计划调整，也能驱动可执行的画像更新建议。

**Architecture:** 继续复用已有 `profile_extraction` 与 `plan_adjustment` 入口，不新增业务 capability。主进程把结构化 `reflection` 上下文正式传入两个 AI 请求；adapter prompt 明确要求根据复盘产出画像和计划建议；共享层扩展画像预览解析，让复盘导出的“时间预算 / 节奏 / 阻力 / 计划影响”建议能落成可审核、可应用的 `profile_update`。

**Tech Stack:** TypeScript, Electron IPC, React, Zustand, SQLite + Drizzle, Node `node:test`

---

### Task 1: 先锁请求边界并写失败测试

**Files:**
- Modify: `src/shared/ai-service.ts`
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/main/services/app-storage-service.test.ts`

**Step 1: Write the failing tests**

先补两个失败测试：
- `runProfileExtraction()` 会把当前 `reflection` 结构化上下文一并传给 `profile_extraction`
- `generatePlanAdjustmentSuggestions()` 会把当前 `reflection` 上下文传给 `plan_adjustment`，并继续保留可读反馈列表

**Step 2: Run tests to verify they fail**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: FAIL，提示请求类型缺少 `reflection` 或断言不成立

**Step 3: Write minimal implementation**

扩展 AI request 类型，并在 `AppStorageService` 的两个 capability 入口里传入当前复盘上下文。

**Step 4: Run tests to verify they pass**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 2: 让 prompt 和画像预览真正消费复盘信息

**Files:**
- Modify: `src/main/services/openai-compatible-provider-adapter.ts`
- Create: `src/main/services/openai-compatible-provider-adapter.test.ts`
- Modify: `src/shared/app-state.ts`
- Modify: `src/shared/app-state.test.ts`

**Step 1: Write the failing tests**

新增最小失败测试：
- adapter 生成 `profile_extraction` / `plan_adjustment` prompt 时会包含复盘周期、障碍、洞察和后续动作
- `resolveConversationState()` 能把复盘导出的“节奏偏好 / 时间预算 / 阻力 / 计划影响”建议解析成可执行的 `profile_update`

**Step 2: Run tests to verify they fail**

Run: `npm run build:main && node --test dist-electron/src/main/services/openai-compatible-provider-adapter.test.js dist-electron/src/shared/app-state.test.js`
Expected: FAIL，提示 prompt 缺少复盘上下文，或画像预览未生成对应字段变更

**Step 3: Write minimal implementation**

在 adapter 中新增复盘上下文格式化逻辑，并把它接入两个 prompt；在共享层补齐画像建议解析，仅支持本任务需要的最小字段集合，不额外扩张 action 语法。

**Step 4: Run tests to verify they pass**

Run: `npm run build:main && node --test dist-electron/src/main/services/openai-compatible-provider-adapter.test.js dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 3: 文档同步与总验证

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Step 1: Update docs**

把 `Phase 4 / Task 3` 的实际落点写清楚：复盘上下文现在如何进入画像 / 计划建议，画像预览新增了哪些可执行字段，以及下一任务推进到哪里。

**Step 2: Run verification**

Run: `npm run build && npm run lint && node --test dist-electron/src/shared/app-state.test.js dist-electron/src/main/services/openai-compatible-provider-adapter.test.js dist-electron/src/main/services/ai-service.test.js dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS
