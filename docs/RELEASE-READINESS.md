# RELEASE READINESS

## 当前判断
- 日期：2026-03-22
- 当前阶段：`Phase 6 / Task 4` 已完成
- 当前状态：项目已经具备一套可重复执行的自动预检命令、关键业务闭环的集成级自动验证、可生成 macOS arm64 `.app` / `.zip` / `.dmg` 的 packaging pipeline，以及真实首启空状态与首页 onboarding 引导；DMG 内容和 app 签名结构也已完成基础检查
- 尚未完成：正式发布元数据（`author` / app icon / DMG branding）、Developer ID 签名与 notarization，以及 Release Candidate 级人工回归仍未完成，因此暂不能把当前状态视为“正式可分发发布版”

## 最新预检结果
- `npm run lint`：PASS
- `npm run build`：PASS
- `node --test dist-electron/src/**/*.test.js`：PASS（47/47）
- `npm run rebuild:native:electron`：PASS（成功将 `better-sqlite3` 切到 Electron ABI）
- `npm run rebuild:native:node`：PASS（当前受限网络下 `npm rebuild` 下载 Node headers 失败时，wrapper 会回退到隐藏备份并恢复 Node ABI）
- 关键链路集成验证：PASS（建议审核落库闭环、执行/复盘反馈回流闭环）
- 首次启动与空状态自动验证：PASS（空数据库首启返回真实空状态，dashboard 派生 onboarding checklist）
- `npm run package`：PASS（生成 `release/mac-arm64/Learning Companion.app`）
- `npm run dist`：PASS（生成 `release/Learning Companion-0.1.0-arm64.dmg` 与 `release/Learning Companion-0.1.0-arm64-mac.zip`，并在结束后自动恢复 `better-sqlite3` 的 Node ABI）
- DMG 挂载内容检查：PASS（包含 `Learning Companion.app` 与 `/Applications` 快捷方式）
- `codesign --verify --deep --strict --verbose=2 "release/mac-arm64/Learning Companion.app"`：PASS
- `spctl -a -vv -t open "release/mac-arm64/Learning Companion.app"`：返回 `internal error in Code Signing subsystem`，当前只可视为 ad-hoc 签名环境下的观察结果，不能替代正式 Gatekeeper 验收
- 人工手测：`M1`、`M2`、`M3` 已实际执行并记录；`M4` 到 `M8` 仍待继续走查

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
| Native ABI 往返检查 | `npm run rebuild:native:electron` + `npm run rebuild:native:node` | 验证开发态启动前会切到 Electron ABI，结束后仍能恢复到 Node ABI | 两条命令都成功；受限网络下允许由隐藏备份完成恢复 |
| Unpacked app smoke check | `npm run package` | 生成可直接检查目录结构的 macOS app 产物 | 命令退出码为 0，生成 `release/mac-arm64/Learning Companion.app` |
| Installer build | `npm run dist` | 生成用于安装分发的 ZIP / DMG 产物 | 命令退出码为 0，生成 `release/*.zip` 与 `release/*.dmg` |

## 打包与安装检查

### P1. 目录包 smoke check
步骤：
1. 运行 `npm run package`
2. 确认生成 `release/mac-arm64/Learning Companion.app`
3. 对 `.app` 执行 `codesign --verify --deep --strict --verbose=2`

预期结果：
- 可以产出 unpacked app
- `.app` 的签名结构校验通过

### P2. Installer 内容检查
步骤：
1. 运行 `npm run dist`
2. 挂载 `release/Learning Companion-0.1.0-arm64.dmg`
3. 确认挂载卷内包含 `Learning Companion.app`
4. 确认挂载卷内包含指向 `/Applications` 的快捷方式

预期结果：
- 可以产出 ZIP / DMG
- DMG 内容符合标准拖拽安装布局

### P3. 已知安装限制
当前检查中观测到的限制：
- `package.json` 仍缺少 `author`，builder 会给出 warning
- 当前未配置自定义应用图标，仍使用默认 Electron icon
- macOS 目前只能做 ad-hoc 签名，builder 会跳过 notarization
- `spctl` 结果不能被视为正式发布级 Gatekeeper 验收

## 手测路径

### M1. 启动与回填
前置条件：
- 已执行 `npm install`
- 本地可运行 `npm run dev`
- 若刚执行过 `npm run dist` / `npm run package` 或其他 Electron ABI rebuild，允许首次启动前花一点时间重建 `better-sqlite3`

步骤：
1. 运行 `npm run dev`
2. 确认 Electron 窗口可正常打开，不出现白屏或 preload/IPC 报错
3. 关闭应用后重新打开
4. 确认上一次保存的 profile / goals / plan / settings / reflection 数据仍能回填

预期结果：
- 应用可启动
- 本地 SQLite 会继续承接既有状态
- 重启后不会丢失结构化数据

记录：
- 状态：pass
- 执行日期：2026-03-22
- 实际结果：两次 `npm run dev` 启动都成功拉起 renderer / main / Electron；用户确认窗口正常显示，完整退出后重新打开仍可看到既有 profile / goals / plan / settings / reflection 数据回填
- 证据：`VITE v6.4.1 ready`、`Found 0 errors. Watching for file changes.`、`✔ Rebuild Complete`，以及用户在 2026-03-22 的 GUI 确认
- 备注：当前仅见 DevTools `Autofill.enable/setAddresses` 警告，未见 preload/IPC 级错误

### M2. 设置页与启动页
前置条件：
- 应用已启动

步骤：
1. 进入“设置”页
2. 修改主题和启动页
3. 保存设置
4. 重启应用

预期结果：
- 设置保存成功并给出明确反馈
- 应用按保存后的启动页落到对应页面
- runtime 摘要和路由配置仍能正常展示

记录：
- 状态：pass
- 执行日期：2026-03-22
- 实际结果：修复 preload bridge 后，用户在 GUI 中将主题改为“浅色”、启动页改为“学习计划”并保存；完整退出再重启后，用户确认该项“已通过”，设置页显示“本地存储状态：已从 SQLite 加载”；直接查询本地 `app_settings` 表后，真实值为 `theme=浅色`、`start_page=学习计划`
- 证据：用户 2026-03-22 的 GUI 确认；`sqlite3 "$HOME/Library/Application Support/learning-companion/learning-companion.sqlite" "select id, theme, start_page, updated_at from app_settings;"`
- 备注：本项通过覆盖“设置持久化 + 启动页回填 + 设置页反馈”；`settings.theme` 当前仍未接入 renderer 样式系统，不能把本条记录等同于完整主题视觉验收

### M3. 用户画像编辑
步骤：
1. 进入“用户画像”页
2. 修改学习窗口、时间预算、节奏偏好或阻力因素
3. 保存后切换到其他页面，再返回
4. 重启应用后再次检查

预期结果：
- 修改立即生效
- 页面切换和重启后都能回填
- 画像内容仍能影响计划和建议上下文

记录：
- 状态：pass
- 执行日期：2026-03-22
- 实际结果：用户完成了画像字段编辑、页面切换回看与完整重启回看，并确认 `M3` “验证通过”
- 证据：用户在 2026-03-22 的 GUI 手测确认
- 备注：本次会话未单独记录具体修改字段，当前结论基于用户对“切页后仍在 + 重启后仍在”的口头确认

### M4. 目标生命周期
步骤：
1. 进入“目标”页
2. 创建一个新目标并保存
3. 将其设为当前主目标
4. 编辑目标内容并保存
5. 删除该目标，观察确认弹窗和后续状态

预期结果：
- 新目标保存成功并出现在列表中
- 当前主目标切换立即反映到计划页
- 删除目标时会同步清理关联草案与快照
- 若删除的是当前主目标，应用会自动选择下一个可用目标或进入空状态

记录：
- 状态：pending
- 执行日期：待补
- 实际结果：待执行
- 证据：待补
- 备注：待补

### M5. 学习计划编辑与版本链路
前置条件：
- 至少存在一个目标

步骤：
1. 进入“学习计划”页
2. 编辑阶段或任务内容并保存
3. 重排任务顺序后再次保存
4. 查看版本快照对比
5. 触发“重新生成计划”，确认旧草案会先归档

预期结果：
- 手动编辑和任务重排可持久化
- 快照对比可查看差异
- 重生成后当前草案被替换，旧版本进入历史快照

记录：
- 状态：pending
- 执行日期：待补
- 实际结果：待执行
- 证据：待补
- 备注：待补

### M6. 执行状态与复盘
前置条件：
- 当前计划里存在任务

步骤：
1. 在“学习计划”页对任务执行开始 / 完成 / 跳过 / 延后
2. 返回“首页”检查今日优先动作和风险提醒是否变化
3. 进入“复盘”页填写日 / 周 / 阶段复盘
4. 保存后再次检查首页与建议区

预期结果：
- 任务状态、备注和更新时间可保存
- 首页聚焦卡和风险卡会响应执行信号
- 复盘输入会被独立持久化，并刷新建议上下文

记录：
- 状态：pending
- 执行日期：待补
- 实际结果：待执行
- 证据：待补
- 备注：待补

### M7. 对话建议与 action preview 审核
前置条件：
- 已有目标、计划和画像数据

步骤：
1. 进入“对话”页
2. 触发画像提取或计划调整建议
3. 检查 suggestions 与 action previews 是否出现
4. 接受一部分预览并应用，拒绝另一部分
5. 重启应用后复查审核轨迹

预期结果：
- 建议不会直接写库，必须先经过预览审核
- 已接受的预览可回写结构化实体
- source label、reviewedAt、appliedAt 等审计字段会保留

记录：
- 状态：pending
- 执行日期：待补
- 实际结果：待执行
- 证据：待补
- 备注：待补

### M8. AI runtime 与错误反馈
前置条件：
- 至少配置一个可用 Provider；如无可用 secret，则验证错误提示路径

步骤：
1. 在“设置”页保存 provider 配置与 secret
2. 执行 provider 健康检查
3. 触发一次真实 capability 调用
4. 观察 runtime 摘要和 observability 列表
5. 移除 secret 或禁用 provider，再重复一次 capability 调用

预期结果：
- 健康检查结果可见
- capability 调用会更新最近状态和请求列表
- 缺少 secret、provider 不可用或路由异常时，用户能看到可理解的错误反馈

记录：
- 状态：pending
- 执行日期：待补
- 实际结果：待执行
- 证据：待补
- 备注：待补

## Go / No-Go 判断

### 可以进入下一阶段的条件
- 三条自动预检命令全部通过
- 至少完成一次 `M1` 到 `M8` 的人工走查
- 手测过程中没有出现结构化数据丢失、启动失败、页面白屏或明显错误反馈缺失

### 当前明确不能宣称的事情
- 不能宣称“已完成正式 macOS 签名 / notarization”
- 不能宣称“已通过无系统警告的 Gatekeeper 安装验收”
- 不能宣称“已完成 Release Candidate 级最终人工回归”

## 剩余发布缺口
- `package.json` 仍缺少 `author`
- 仓库还没有正式发布用的 app icon / DMG branding 资源
- 还没有 Developer ID 签名、notarization 和 Gatekeeper 放行记录
- 仍未完成 Release Candidate 级人工首启走查、安装后数据目录行为核验与演示路径确认

这些缺口留给后续任务处理：
1. `Release Candidate`：最终回归与演示准备
2. 发布元数据与签名收口：补 `author` / app icon / Developer ID / notarization
