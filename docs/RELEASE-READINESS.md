# RELEASE READINESS

## 当前判断
- 日期：2026-03-22
- 当前阶段：`Phase 6 / Task 3` 已完成
- 当前状态：项目已经具备一套可重复执行的自动预检命令、关键业务闭环的集成级自动验证，以及可生成 macOS arm64 `.app` / `.zip` / `.dmg` 的 packaging pipeline；DMG 内容和 app 签名结构也已完成基础检查
- 尚未完成：首次启动引导和空状态验收、正式发布元数据（`author` / app icon）、Developer ID 签名与 notarization 仍未完成，因此暂不能把当前状态视为“正式可分发发布版”

## 最新预检结果
- `npm run lint`：PASS
- `npm run build`：PASS
- `node --test dist-electron/src/**/*.test.js`：PASS（40/40）
- 关键链路集成验证：PASS（建议审核落库闭环、执行/复盘反馈回流闭环）
- `npm run package`：PASS（生成 `release/mac-arm64/Learning Companion.app`）
- `npm run dist`：PASS（生成 `release/Learning Companion-0.1.0-arm64.dmg` 与 `release/Learning Companion-0.1.0-arm64-mac.zip`，并在结束后自动恢复 `better-sqlite3` 的 Node ABI）
- DMG 挂载内容检查：PASS（包含 `Learning Companion.app` 与 `/Applications` 快捷方式）
- `codesign --verify --deep --strict --verbose=2 "release/mac-arm64/Learning Companion.app"`：PASS
- `spctl -a -vv -t open "release/mac-arm64/Learning Companion.app"`：返回 `internal error in Code Signing subsystem`，当前只可视为 ad-hoc 签名环境下的观察结果，不能替代正式 Gatekeeper 验收
- 人工手测：清单已补齐，本次会话未实际逐项执行 `M1` 到 `M8`

## 自动预检矩阵

| Check | Command | Purpose | Pass Criteria |
|------|---------|---------|---------------|
| 类型检查 | `npm run lint` | 验证 TypeScript 主进程 / 渲染进程在当前代码树下无静态错误 | 命令退出码为 0 |
| 生产构建 | `npm run build` | 同时构建 renderer 与 Electron main/preload 输出 | 命令退出码为 0，生成最新 `dist/` 与 `dist-electron/` |
| 编译后全量测试 | `node --test dist-electron/src/**/*.test.js` | 对编译产物执行当前 Node 测试集，避免只验证源码层 | 所有测试通过 |
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

步骤：
1. 运行 `npm run dev`
2. 确认 Electron 窗口可正常打开，不出现白屏或 preload/IPC 报错
3. 关闭应用后重新打开
4. 确认上一次保存的 profile / goals / plan / settings / reflection 数据仍能回填

预期结果：
- 应用可启动
- 本地 SQLite 会继续承接既有状态
- 重启后不会丢失结构化数据

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

## Go / No-Go 判断

### 可以进入下一阶段的条件
- 三条自动预检命令全部通过
- 至少完成一次 `M1` 到 `M8` 的人工走查
- 手测过程中没有出现结构化数据丢失、启动失败、页面白屏或明显错误反馈缺失

### 当前明确不能宣称的事情
- 不能宣称“已完成正式 macOS 签名 / notarization”
- 不能宣称“已通过无系统警告的 Gatekeeper 安装验收”
- 不能宣称“首次启动引导和空状态已验收”

## 剩余发布缺口
- `package.json` 仍缺少 `author`
- 仓库还没有正式发布用的 app icon / DMG branding 资源
- 还没有 Developer ID 签名、notarization 和 Gatekeeper 放行记录
- 首次启动引导、空状态和安装后数据目录行为仍未做任务级验收

这些缺口留给后续任务处理：
1. `Phase 6 / Task 4`：首次启动引导和空状态检查
2. `Release Candidate`：最终回归与演示准备
