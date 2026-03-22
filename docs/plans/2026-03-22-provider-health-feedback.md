# Provider Health & Error Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为设置页接入真实 Provider 健康检查，并把业务调用失败统一转成用户可理解的基础错误提示。

**Architecture:** 在 `AiService` 中新增 Provider 健康检查接口，把 provider 配置校验、adapter 探测和用户可读错误文案统一收口；`AppStorageService` 负责把最近一次健康状态写回结构化 settings，并经由现有 IPC / preload / store / settings page 链路暴露给用户。业务调用沿用原有页面 notice 区域，但错误内容改为由 main/runtime 统一归一化。

**Tech Stack:** TypeScript, Electron IPC, React, Zustand, SQLite + Drizzle, Node `node:test`, Fetch API

---

### Task 1: AI runtime 健康检查与错误归一化

**Files:**
- Modify: `src/main/services/ai-service.test.ts`
- Modify: `src/shared/ai-service.ts`
- Modify: `src/main/services/ai-service.ts`
- Modify: `src/main/services/openai-compatible-provider-adapter.ts`
- Test: `dist-electron/src/main/services/ai-service.test.js`

**Step 1: Write the failing test**

在 `src/main/services/ai-service.test.ts` 增加两组测试：
- `checkProviderHealth` 会委托 adapter 执行检查，并返回 `ready` / `warning` 结果
- `getRuntimeSummary` 会带出 provider `healthStatus`，使 UI 能区分“配置已就绪”和“最近检查失败”

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/services/ai-service.test.js`
Expected: FAIL，提示缺少健康检查接口或 runtime 摘要缺少健康状态

**Step 3: Write minimal implementation**

为 shared/main runtime 补齐：
- `AiProviderHealthCheckResult`
- adapter `checkHealth` 契约
- `AiService.checkProviderHealth(...)`
- adapter 层对网络 / 认证 / endpoint 失败的基础错误归一化

**Step 4: Run test to verify it passes**

Run: `npm run build:main && node --test dist-electron/src/main/services/ai-service.test.js`
Expected: PASS

### Task 2: AppStorage 与 IPC 链路持久化健康状态

**Files:**
- Modify: `src/main/services/app-storage-service.test.ts`
- Modify: `src/main/services/app-storage-service.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/bridge.ts`
- Modify: `src/renderer/store/app-store.ts`
- Test: `dist-electron/src/main/services/app-storage-service.test.js`

**Step 1: Write the failing test**

在 `src/main/services/app-storage-service.test.ts` 增加测试：
- 手动健康检查会更新目标 Provider 的 `healthStatus`
- capability 调用成功会把 routed Provider 标记为 `ready`
- capability 调用失败会把 routed Provider 标记为 `warning`

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: FAIL，提示缺少 `runProviderHealthCheck` 或缺少健康状态回写

**Step 3: Write minimal implementation**

实现：
- `AppStorageService.runProviderHealthCheck(providerId)`
- 业务 capability 成功 / 失败后的 `healthStatus` 回写
- `storage:run-provider-health-check` IPC、preload、bridge、store 方法

**Step 4: Run test to verify it passes**

Run: `npm run build:main && node --test dist-electron/src/main/services/app-storage-service.test.js`
Expected: PASS

### Task 3: 设置页接入检查入口与状态提示

**Files:**
- Modify: `src/renderer/pages/page-content.tsx`

**Step 1: Write the failing verification target**

此仓库暂无 renderer 自动化测试框架，本任务以编译缺口和行为约束作为失败信号：
- Provider 卡片新增“检查连通性”动作
- `healthStatus` 不再作为手动表单字段编辑
- runtime 摘要能区分 ready / warning / unknown 的健康状态提示

**Step 2: Run verification to verify gap**

Run: `npm run build`
Expected: FAIL，提示 store/bridge/UI 新增方法未定义或类型不匹配

**Step 3: Write minimal implementation**

把设置页接到 store 的健康检查动作，并复用现有 notice / badge 区域展示检查结果和 runtime 健康提示。

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

把 `Phase 3 / Task 3` 标记为已完成，说明健康检查与基础错误提示的落点，并把项目下一任务推进到 `Phase 3 / Task 4`。

**Step 2: Run verification**

Run: `npm run build && npm run lint && node --test dist-electron/src/main/services/ai-service.test.js dist-electron/src/main/services/app-storage-service.test.js dist-electron/src/shared/app-state.test.js`
Expected: PASS
