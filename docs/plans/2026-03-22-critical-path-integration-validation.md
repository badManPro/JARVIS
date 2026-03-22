# Critical Path Integration Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 `Phase 6 / Task 2`，为对话建议落库链路和执行/复盘反馈链路补上集成级自动验证，并在必要时修正暴露出的最小缺陷。

**Architecture:** 本轮把 `AppStorageService` 视为集成验证边界，通过 in-memory SQLite harness 串起 AI request、共享状态解析、结构化表持久化、`app_snapshots` 保存与 reload。优先补两条最关键的业务闭环，不引入新的 UI 自动化层。

**Tech Stack:** TypeScript, Node `node:test`, Electron main service layer, SQLite in-memory database

---

### Task 1: 为建议审核落库链路补 red 测试

**Files:**
- Modify: `src/main/services/app-storage-service.test.ts`
- Read: `src/shared/app-state.ts`
- Test: `dist-electron/src/main/services/app-storage-service.test.js`

**Step 1: Write the failing test**

新增一条闭环测试，串起：
- `runProfileExtraction()`
- `updateConversationActionPreviewReview()` 把生成的 preview 标记为 accepted
- `saveAppState()` 持久化审核结果
- `applyAcceptedConversationActionPreviews()`
- `loadAppState()` 验证 reload

断言至少包含：
- profile 的学习窗口被改为 `工作日晚间 20:30 - 21:15`
- 当前主目标周期变为 `6 周`
- 计划标题变为 `AI 强化学习冲刺草案`
- 新增任务标题应为 `拆解本周 MVP 功能清单`
- 已应用 preview 的 `status/appliedAt/reviewStatus` 会保留

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: FAIL，若当前解析存在缺口，失败点应集中在新增任务或审核落库断言

### Task 2: 为执行/复盘反馈链路补 red 测试

**Files:**
- Modify: `src/main/services/app-storage-service.test.ts`
- Test: `dist-electron/src/main/services/app-storage-service.test.js`

**Step 1: Write the failing test**

新增一条测试，串起：
- `updatePlanTaskStatus()`
- `saveReflectionEntry()`
- `generatePlanAdjustmentSuggestions()`

断言：
- 发送给 `plan_adjustment` 的 request 使用的是最新 task status / statusNote
- request 里的 `reflection.entries` 包含刚保存的 weekly 复盘输入
- `feedback` 包含最新任务备注、weekly obstacle 和 follow-up action
- 返回 suggestions 会继续回流到 conversation preview 流

**Step 2: Run test to verify it fails or proves the chain**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: 新测试要么先 fail 暴露缺口，要么在现有实现下直接证明链路已可用

### Task 3: 仅为失败断言补最小修正

**Files:**
- Modify: `src/shared/app-state.ts`（仅当建议解析缺陷被测试证实）
- Modify: `src/main/services/app-storage-service.ts`（仅当 service 编排存在真实缺口）
- Test: `dist-electron/src/main/services/app-storage-service.test.js`

**Step 1: Write minimal implementation**

如果 red 测试暴露真实缺口，只补让测试通过所需的最小代码：
- 不扩展产品范围
- 不顺手重构无关逻辑
- 优先修复 suggestion 解析或 service 编排的真实问题

**Step 2: Run targeted tests to verify they pass**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 4: 做最终验证并同步文档

**Files:**
- Modify: `docs/RELEASE-READINESS.md`
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Step 1: Run verification**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

Run: `node --test dist-electron/src/**/*.test.js`
Expected: PASS

**Step 2: Update docs**

记录：
- 新增了哪些关键链路集成验证
- 是否发现并修复了解析/编排缺陷
- 下一任务推进到 `Phase 6 / Task 3 / Electron 打包与安装体验检查`
