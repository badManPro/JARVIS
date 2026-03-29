# RELEASE READINESS

## 当前判断
- 日期：2026-03-29
- 当前阶段：`Release Candidate` 自动预检已完成，最终人工回归待执行
- 当前状态：项目已经具备一套可重复执行的自动预检命令、关键业务闭环的集成级自动验证、可生成 macOS arm64 `JARVIS.app` / `.zip` / `.dmg` 与 Windows x64 `.exe` / `.zip` 的 packaging pipeline，以及通过 GitHub Actions 自动上传双平台产物到 GitHub Releases 的发布工作流；本轮已重新验证目录包、installer 产物和 macOS app 签名结构
- 尚未完成：正式发布级品牌收口（最终 app icon / DMG branding）、macOS Developer ID 签名与 notarization、Windows 代码签名/分发信任收口，以及面向 2026-03-29 四页驾驶舱信息架构的最终人工回归，因此暂不能把当前状态视为“正式可分发发布版”

## 最新预检结果
- `npm run lint`：PASS
- `npm run build`：PASS
- `node --test dist-electron/src/**/*.test.js`：PASS（64/64）
- `node --test src/renderer/pages/page-data.test.mjs`：PASS
- `node --test dist-electron/src/main/packaging-config.test.js`：PASS
- `npm run rebuild:native:electron`：PASS（成功将 `better-sqlite3` 切到 Electron ABI）
- `npm run rebuild:native:node`：PASS（当前受限网络下 `npm rebuild` 下载 Node headers 失败时，wrapper 会回退到隐藏备份并恢复 Node ABI）
- 关键链路集成验证：PASS（建议审核落库闭环、执行/复盘反馈回流闭环）
- 首次启动与空状态自动验证：PASS（空数据库首启返回真实空状态，dashboard 派生 onboarding checklist）
- `npm run package`：PASS（2026-03-29 重新生成 `release/mac-arm64/JARVIS.app`）
- `codesign --verify --deep --strict --verbose=2 "release/mac-arm64/JARVIS.app"`：PASS
- `npm run dist`：PASS（2026-03-29 重新生成 `release/JARVIS-0.1.0-arm64.dmg` 与 `release/JARVIS-0.1.0-arm64-mac.zip`，并更新 `release/latest-mac.yml`）
- `npm run dist:win`：PASS（2026-03-29 重新生成 `release/JARVIS Setup 0.1.0.exe` 与 `release/JARVIS-0.1.0-win.zip`，且不再出现 `author is missed` warning）
- `.github/workflows/release.yml`：PASS（支持 `v*` tag 和手动触发，构建 macOS/Windows 产物并上传到 GitHub Releases）
- 观察项：`electron-builder` 在依赖收集阶段仍会打印大量 `npm error extraneous` stderr，但命令最终退出码为 0，不构成本轮打包阻塞
- 观察项：本轮未重新执行 DMG 挂载内容检查和 `spctl`；如要作为最终 release gate，需要按 `P2` 单独复跑
- 观察项：`release/latest.yml` 当前写出的 Windows 路径为 `JARVIS-Setup-0.1.0.exe`，而目录中的实际文件名是 `JARVIS Setup 0.1.0.exe`；正式发布前需要验证 updater 元数据与上传资产名是否一致
- 人工手测：2026-03-22 的 `M1` 到 `M8` 记录只可视为历史基线；由于 2026-03-29 已完成四页驾驶舱、全局教练抽屉和上下文复盘重构，仍需重新执行一轮 Release Candidate 级人工回归

## 首次启动与空状态检查

### F1. 空数据库首启
结论：
- 空数据库首次启动不再持久化 `seedState`
- `AppStorageService` 现在会把首启状态初始化为真实空画像、空目标、空计划和空对话
- renderer store 也已切到同一空状态工厂，避免 hydration 前闪出示例数据

验证：
- `src/main/services/app-storage-service.test.ts` 覆盖空数据库首启返回真实空状态
- `src/shared/app-state.test.ts` 覆盖 dashboard onboarding checklist 派生

### F2. 首屏引导与空状态入口
结论：
- 首页新增 onboarding checklist，指导用户先补画像、建目标、查看首版计划并记录首次执行
- 侧栏底部在首启时不再假设存在“当前计划草案”，而是显示首启引导文案
- 对话页在无消息时会显示空状态说明，并指向画像 / 目标页

## 自动预检矩阵

| Check | Command | Purpose | Pass Criteria |
|------|---------|---------|---------------|
| 类型检查 | `npm run lint` | 验证 TypeScript 主进程 / 渲染进程在当前代码树下无静态错误 | 命令退出码为 0 |
| 生产构建 | `npm run build` | 同时构建 renderer 与 Electron main/preload 输出 | 命令退出码为 0，生成最新 `dist/` 与 `dist-electron/` |
| 编译后全量测试 | `node --test dist-electron/src/**/*.test.js` | 对编译产物执行当前 Node 测试集，避免只验证源码层 | 所有测试通过 |
| 导航基线测试 | `node --test src/renderer/pages/page-data.test.mjs` | 确认四页导航信息架构没有回退到旧七页结构 | 测试通过 |
| Native ABI 往返检查 | `npm run rebuild:native:electron` + `npm run rebuild:native:node` | 验证开发态启动前会切到 Electron ABI，结束后仍能恢复到 Node ABI | 两条命令都成功；受限网络下允许由隐藏备份完成恢复 |
| Packaging config 测试 | `node --test dist-electron/src/main/packaging-config.test.js` | 验证 package scripts、builder 配置、release workflow 和 packaged entry 仍一致 | 测试通过 |
| Unpacked app smoke check | `npm run package` | 生成可直接检查目录结构的 macOS app 产物 | 命令退出码为 0，生成 `release/mac-arm64/JARVIS.app` |
| Installer build | `npm run dist` | 生成用于安装分发的 ZIP / DMG 产物 | 命令退出码为 0，生成 `release/*.zip` 与 `release/*.dmg` |

## 打包与安装检查

### P1. 目录包 smoke check
步骤：
1. 运行 `npm run package`
2. 确认生成 `release/mac-arm64/JARVIS.app`
3. 对 `.app` 执行 `codesign --verify --deep --strict --verbose=2`

预期结果：
- 可以产出 unpacked app
- `.app` 的签名结构校验通过

### P2. Installer 内容检查
步骤：
1. 运行 `npm run dist`
2. 挂载 `release/JARVIS-0.1.0-arm64.dmg`
3. 确认挂载卷内包含 `JARVIS.app`
4. 确认挂载卷内包含指向 `/Applications` 的快捷方式

预期结果：
- 可以产出 ZIP / DMG
- DMG 内容符合标准拖拽安装布局

### P3. 已知安装限制
当前检查中观测到的限制：
- macOS 目前只能做 ad-hoc 签名，builder 会跳过 notarization
- `spctl` 结果不能被视为正式发布级 Gatekeeper 验收
- Windows `latest.yml` 与本地 `.exe` 资产命名仍需做一致性确认

## 手测路径

说明：
- 以下 `M1` 到 `M8` 是面向 2026-03-29 当前信息架构的 Release Candidate 手测脚本
- 当前状态：全部 `pending`
- 执行完成后，需要在每一项下补 `状态 / 执行日期 / 证据 / 备注`
- 若涉及画像建议或路径调整建议，前置需要在“设置”页完成 Codex 连接，或准备可用的 routed provider

### M1. 首次启动与四页导航基线
前置条件：
- 准备一份空数据库或隔离的全新用户目录
- 可运行 `npm run dev` 或已生成的 `JARVIS.app`

步骤：
1. 启动应用
2. 确认侧栏只出现 `今日 / 学习路径 / 学习档案 / 设置`
3. 确认不存在旧的 `首页 / 学习计划 / 目标 / 对话 / 复盘` 一级导航入口
4. 确认首屏处于 onboarding 状态，且能看到全局教练入口 CTA
5. 确认设置入口可达，但默认层没有暴露 runtime / provider 技术细节

预期结果：
- 首启直接进入四页驾驶舱结构
- 用户不需要理解旧信息架构即可开始建档
- 全局教练入口与设置分层都可见

记录：
- 状态：pending
- 执行日期：待填
- 证据：待填
- 备注：优先记录首屏截图和侧栏导航结构

### M2. 教练抽屉首启建档
前置条件：
- `M1` 通过，应用仍处于首启建档状态

步骤：
1. 打开全局教练抽屉
2. 填写主目标、当前水平、时间预算
3. 选填增强画像字段：年龄阶段、MBTI、性格关键词、反馈偏好等
4. 点击“生成第一版路径”
5. 关闭抽屉后依次检查“今日 / 学习路径 / 学习档案”

预期结果：
- 建档后不出现报错
- “今日”出现当前第一步任务或明确主动作
- “学习路径”出现当前主目标、当前阶段和最近任务
- “学习档案”能看到刚填写的增强画像字段

记录：
- 状态：pending
- 执行日期：待填
- 证据：待填
- 备注：记录用于建档的目标标题和至少一个增强画像字段

### M3. 教练建议审批闭环
前置条件：
- 已完成 `M2`
- Codex 或等价 AI route 已可用

步骤：
1. 在任意页面打开全局教练抽屉
2. 输入一条变化说明，例如时间预算下降或节奏偏好变化
3. 分别触发一次“生成画像建议”或“生成路径调整”
4. 在抽屉中确认能看到 `actionPreviews` 的标题、summary、changes、reviewStatus、status
5. 接受至少一条建议，拒绝至少一条建议
6. 点击“应用已接受变更”
7. 检查抽屉结果提示、页面跳转和相关页面的数据变化

预期结果：
- 建议不会直接写入数据，必须先审核
- 抽屉内可完成 accept / reject / apply 闭环
- apply 后显示“已写回画像 / 目标 / 路径”类结果文案
- 如影响主路径，页面会优先跳到“今日”或“学习路径”

记录：
- 状态：pending
- 执行日期：待填
- 证据：待填
- 备注：至少记录一条被应用的建议类型和一条被拒绝的建议类型

### M4. 今日主动作与日复盘
前置条件：
- 当前路径里至少存在一个任务

步骤：
1. 进入“今日”
2. 对当前任务执行一次“开始”
3. 再执行一次“完成”或“延后”或“跳过”
4. 确认状态变化后立即弹出日复盘 sheet
5. 填写偏差说明、难度匹配、时间匹配和后续动作
6. 保存后检查“当前节奏”和风险提醒是否更新

预期结果：
- 今日页始终只聚焦一个主动作
- 任务状态变化后无需跳到独立复盘页
- 日复盘能保存并回流到 dashboard 摘要

记录：
- 状态：pending
- 执行日期：待填
- 证据：待填
- 备注：记录使用的是 `done / delayed / skipped` 中哪一种入口

### M5. 学习路径渐进披露与阶段复盘
前置条件：
- 已完成 `M2`

步骤：
1. 进入“学习路径”
2. 确认首屏只聚焦当前主目标、当前阶段和最近任务
3. 检查“路径依据”没有直接铺满首屏
4. 展开“高级内容：完整路径依据与历史快照”
5. 点击“阶段复盘”，填写并保存一条阶段复盘
6. 如存在多目标，切换一次主目标并确认页面随之更新

预期结果：
- 默认路径页满足渐进披露，不回到旧计划工作台
- 高级内容只在展开层可见
- 阶段复盘可以在路径上下文内完成

记录：
- 状态：pending
- 执行日期：待填
- 证据：待填
- 备注：若本轮没有多目标，可把主目标切换子步骤标记为 `n/a`

### M6. 学习档案编辑与回填
前置条件：
- 已完成 `M2`

步骤：
1. 进入“学习档案”
2. 展开编辑
3. 修改至少一项基础字段和一项增强画像字段，例如时间预算、学习窗口、MBTI、压力偏好
4. 保存后切换到其他页面再返回
5. 完整退出应用并重新打开，再次检查

预期结果：
- 编辑结果立即生效
- 切页和重启后都能回填
- 画像页仍保持“学习背景 / 人物特征 / 系统如何使用”的当前结构

记录：
- 状态：pending
- 执行日期：待填
- 证据：待填
- 备注：记录至少两个被修改的字段名

### M7. 设置分层、启动页与运行时反馈
前置条件：
- 应用已启动

步骤：
1. 进入“设置”
2. 确认默认首屏只看到主题、启动页和 Codex 卡片
3. 修改主题和启动页并保存
4. 完整退出并重启，确认落到设置后的启动页
5. 展开“高级设置”
6. 检查是否能访问 route 概览、AI runtime、observability 和 Provider 编辑
7. 执行一次连接检查或 provider 健康检查，并观察反馈

预期结果：
- 默认设置页保持最小化
- 高级设置仍保留技术能力触达
- 启动页设置可持久化
- 连接检查或健康检查结果会反馈到 UI

记录：
- 状态：pending
- 执行日期：待填
- 证据：待填
- 备注：记录保存后的启动页值和一次 runtime/health 反馈结果

### M8. 打包产物启动与安装后行为
前置条件：
- 已完成 `npm run package`，如需 installer 验收则已完成 `npm run dist`
- 可访问 `release/mac-arm64/JARVIS.app`，或可挂载 `release/JARVIS-0.1.0-arm64.dmg`

步骤：
1. 直接启动 `release/mac-arm64/JARVIS.app`
2. 确认应用窗口可打开，不出现白屏、资源缺失或 preload/IPC 错误
3. 如执行 installer 验收，挂载 DMG 并确认其中包含 `JARVIS.app` 与 `/Applications` 快捷方式
4. 用打包产物修改一项轻量数据，例如启动页或画像字段
5. 完整退出打包产物并重新打开，确认数据回填

预期结果：
- 打包产物可启动
- 安装介质内容正确
- 打包产物和开发态使用同一份本地数据目录时，不会造成数据丢失或明显异常

记录：
- 状态：pending
- 执行日期：待填
- 证据：待填
- 备注：若本轮只做 `.app` smoke check，DMG 挂载子步骤可单独标记 `partial`

## Go / No-Go 判断

### 可以进入下一阶段的条件
- 三条自动预检命令全部通过
- 至少完成一次 `M1` 到 `M8` 的人工走查
- 手测过程中没有出现结构化数据丢失、启动失败、页面白屏或明显错误反馈缺失

### 当前明确不能宣称的事情
- 不能宣称“已完成正式 macOS 签名 / notarization”
- 不能宣称“已通过无系统警告的 Gatekeeper 安装验收”
- 不能宣称“已完成 2026-03-29 四页驾驶舱版本的 Release Candidate 级最终人工回归”

## 剩余发布缺口
- 还没有 Developer ID 签名、notarization 和 Gatekeeper 放行记录
- Windows updater 元数据和最终上传资产名还没有做一致性验收
- DMG 挂载内容检查与 `spctl` 还没有针对最新 `JARVIS-*` macOS 产物重新执行
- 学习计划页仍未暴露任务重排 UI，`M5` 本轮按用户接受范围记录通过
- 仍未完成面向四页驾驶舱 / 全局教练抽屉 / 上下文复盘的 Release Candidate 级人工首启走查、安装后数据目录行为核验与演示路径确认

这些缺口留给后续任务处理：
1. `Release Candidate`：最终回归与演示准备
2. 发布元数据与签名收口：补 Developer ID / notarization，并确认 Windows updater 资产命名策略
