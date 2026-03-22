# Conversation Action Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为对话动作预览补齐动作来源与关键操作时间，并让这些审计信息在持久化后可见、可验证。

**Architecture:** 在 `src/shared/app-state.ts` 中为 `ConversationActionPreview` 增加审计元数据，并在建议解析、审核、应用三个阶段维护这些字段。renderer 直接消费并展示该元数据；文档同步更新为新的“下一任务”。

**Tech Stack:** TypeScript, Electron, React, Zustand, SQLite snapshot persistence, Node `node:test`

---

### Task 1: 共享层测试

**Files:**
- Create: `src/shared/app-state.test.ts`
- Modify: `tsconfig.electron.json`
- Test: `dist-electron/shared/app-state.test.js`

**Step 1: Write the failing test**

编写两个测试：
- `resolveConversationState` 为新建议生成审计来源和 `createdAt`
- `applyAcceptedConversationActionPreviews` 为已应用动作写入 `appliedAt` 且保留原来源

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/shared/app-state.test.js`
Expected: FAIL，提示缺失审计字段或断言不成立

**Step 3: Write minimal implementation**

在共享类型和纯函数中补齐审计结构与状态迁移逻辑。

**Step 4: Run test to verify it passes**

Run: `npm run build:main && node --test dist-electron/shared/app-state.test.js`
Expected: PASS

### Task 2: UI 展示审计信息

**Files:**
- Modify: `src/renderer/pages/page-content.tsx`

**Step 1: Write the failing test**

此仓库暂无 renderer 测试框架，本任务改为通过类型检查与手动可见性验证约束。

**Step 2: Run verification to verify gap**

Run: `npm run lint`
Expected: PASS before and after；实现前界面不展示来源/时间

**Step 3: Write minimal implementation**

在动作卡片中展示来源标签、建议生成时间、审核时间、应用时间。

**Step 4: Run verification to verify it passes**

Run: `npm run lint`
Expected: PASS

### Task 3: 文档同步

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`

**Step 1: Update docs**

把“动作来源与操作时间”改为已覆盖，并把下一任务推进到 `Phase 3 / Task 1`。

**Step 2: Run verification**

Run: `npm run build:main && npm run lint`
Expected: PASS
