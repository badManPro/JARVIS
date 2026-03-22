# Electron Packaging & Install Check Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 `Phase 6 / Task 3`，为项目补齐真实可执行的 Electron 打包脚本与 `electron-builder` 配置，产出 macOS arm64 的 app / zip / dmg 产物，并把安装体验检查结果同步到发布文档与路线图。

**Architecture:** 本轮不改业务实体与页面逻辑，重点是在现有 `vite build + tsc -p tsconfig.electron.json` 产线之上叠加 packaging。通过一个最小 `node:test` 红测先锁定脚本 / 入口 / builder 配置，再用 `electron-builder` 产出目录包与 installer，最后记录已验证事实和剩余发布限制。

**Tech Stack:** TypeScript, Node `node:test`, Electron, electron-builder, Markdown docs

---

### Task 1: 为 packaging 元数据补 red 测试

**Files:**
- Create: `src/main/packaging-config.test.ts`
- Read: `package.json`
- Test: `dist-electron/src/main/packaging-config.test.js`

**Step 1: Write the failing test**

断言 `package.json` 至少包含：
- 正确的 Electron 入口 `dist-electron/src/main/index.js`
- 正确的 `dev:electron` 监听入口
- `package` / `dist` 脚本
- `electron-builder` 依赖
- `build.appId` / `productName` / `files` / `asarUnpack` / `mac.target`

**Step 2: Run test to verify it fails**

Run: `npm run build:main && node --test dist-electron/src/main/packaging-config.test.js`  
Expected: FAIL，失败点集中在缺失脚本 / 配置和错误的 main 入口

### Task 2: 接入真实打包能力

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Install dependency and patch metadata**

补齐：
- `electron-builder` dev dependency
- `package` / `dist` 脚本
- `build` 配置
- `better-sqlite3` 的 `asarUnpack`
- 正确的 Electron main output 路径

**Step 2: Re-run targeted test**

Run: `npm run build:main && node --test dist-electron/src/main/packaging-config.test.js`  
Expected: PASS

### Task 3: 做真实 packaging / installer 检查

**Files:**
- Read: `release/**`

**Step 1: Run packaging smoke checks**

Run: `npm run package`  
Expected: PASS，并生成 `release/mac-arm64/Learning Companion.app`

Run: `npm run dist`  
Expected: PASS，并生成 `release/Learning Companion-0.1.0-arm64.dmg` 与 `release/Learning Companion-0.1.0-arm64-mac.zip`

**Step 2: Verify installer contents**

验证：
- 挂载 DMG 后存在 `Learning Companion.app`
- 挂载 DMG 后存在指向 `/Applications` 的快捷方式
- `codesign --verify --deep --strict` 通过
- 记录 ad-hoc 签名 / 未 notarize / 缺失 icon 等已知限制

### Task 4: 同步文档与阶段状态

**Files:**
- Create: `docs/plans/2026-03-22-electron-packaging-install-check.md`
- Modify: `docs/RELEASE-READINESS.md`
- Modify: `docs/IMPLEMENTATION-ROADMAP.md`
- Modify: `README.md`
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Step 1: Update project docs**

写清楚：
- 已新增的 packaging scripts 与产物位置
- 安装体验检查的真实结果
- 当前仍缺的发布元数据 / 图标 / notarization / 首次启动验收
- 下一任务推进到 `Phase 6 / Task 4 / 首次启动引导和空状态检查`

**Step 2: Run final verification**

Run: `npm run lint`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

Run: `node --test dist-electron/src/**/*.test.js`  
Expected: PASS
