# Release Readiness Checklist Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 `Phase 6 / Task 1`，补齐端到端验收清单、手测路径和发布前检查说明，并把项目下一任务推进到 `Phase 6 / Task 2`。

**Architecture:** 本轮不新增业务能力，重点是把现有 renderer/main/SQLite 闭环整理成可执行的验收与预检基线。通过一份正式的 release readiness 文档收口自动验证命令、关键手测路径和当前打包缺口，再同步 README、路线图和本地 planning files。

**Tech Stack:** Markdown docs, TypeScript/Electron project scripts, Node `node:test`

---

### Task 1: 盘点真实发布前基线

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`
- Read: `package.json`
- Read: `src/main/index.ts`
- Read: `src/renderer/App.tsx`
- Read: `src/renderer/pages/page-data.ts`

**Step 1: 记录范围与缺口**

把以下事实写入 planning files：
- `Phase 6 / Task 1` 的交付物是验收清单、手测路径和发布前检查说明
- 当前仓库没有打包脚本、installer 配置和打包依赖
- 当前可直接运行的自动验证命令是 `npm run lint`、`npm run build`、`node --test dist-electron/src/**/*.test.js`

**Step 2: 确认真实页面与启动行为**

从 renderer/main 代码中提炼：
- 当前真实页面集合
- 设置页启动页配置如何影响启动落点
- 生产态构建输出的入口位置

### Task 2: 编写正式 release readiness 文档

**Files:**
- Create: `docs/RELEASE-READINESS.md`

**Step 1: 写文档主体**

文档至少覆盖：
- 当前状态判断
- 自动预检矩阵
- 手测路径
- go/no-go 判断
- 当前打包缺口与 Task 3 交接说明

**Step 2: 保持内容只陈述已验证事实**

不要写“已可打包发布”之类未证实内容。明确区分：
- 已具备：构建、类型检查、编译后测试、手测路径
- 未具备：installer 打包、安装体验、首次启动引导验证

### Task 3: 同步 README 与路线图

**Files:**
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`

**Step 1: 更新 README**

补一条 release readiness 文档入口，并把当前推荐下一任务改为：
- `Phase 6 / Task 2`
- `Phase 6 / Task 3`
- `Phase 6 / Task 4`

**Step 2: 更新路线图**

把 `Phase 6` 状态改为：
- `in_progress`
- `25%`

并记录：
- Task 1 已完成
- 当前唯一下一任务为 `Phase 6 / Task 2 / 为关键链路补集成级验证`

### Task 4: 运行发布前自动预检

**Files:**
- Modify: `progress.md`

**Step 1: Run verification**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

Run: `node --test dist-electron/src/**/*.test.js`
Expected: PASS

**Step 2: 回写结果**

把命令结果写入 `progress.md`，并在结尾明确：
- 本轮只完成 release readiness 文档与预检基线
- 打包与 installer 验证仍留给 `Phase 6 / Task 3`
