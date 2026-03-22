# 用户画像真实编辑链路

## 当前已交付

用户画像页已提供基础可用的 C 端编辑体验，支持直接修改以下关键字段：

- 称呼 / 名字
- 身份阶段
- 时间预算
- 节奏偏好
- 最佳学习时段
- 优势
- 阻力因素
- 画像如何影响计划

其中 `优势 / 阻力因素 / 计划影响` 支持用逗号或换行输入，前端会自动整理为数组。

## 保存链路

真实保存链路如下：

1. `src/renderer/pages/page-content.tsx`
   - 用户在“用户画像”页编辑表单
   - 点击“保存画像”后调用 Zustand store 的 `saveUserProfile`
2. `src/renderer/store/app-store.ts`
   - 调用 `window.learningCompanion.storage.saveUserProfile(profile)`
3. `src/preload/index.cts`
   - 通过 preload 暴露 IPC bridge
4. `src/main/index.ts`
   - `ipcMain.handle('storage:save-user-profile', ...)`
5. `src/main/services/app-storage-service.ts`
   - 更新快照并持久化结构化状态
6. `src/main/repositories/entities-repository.ts`
   - 写入 `user_profiles` 表
7. `src/main/db/client.ts`
   - SQLite `user_profiles` 表最终落盘

## 当前边界

本轮只解决“用户画像真实编辑链路”的可用交付，不包含：

- AI 自动抽取 / 自动修正画像
- 字段级 diff、历史版本、撤销回滚
- 多用户画像切换
- 画像更新时间展示的数据库回读
- 基于画像变更自动重排学习计划

## 验证建议

可按以下路径手工验证：

1. 启动 Electron 应用
2. 进入“用户画像”页
3. 修改“身份阶段”或“时间预算”等字段并保存
4. 关闭应用重新打开
5. 确认页面仍展示刚才保存的内容

如需进一步核验，可查看应用 userData 目录下的 SQLite 文件，并检查 `user_profiles` 表。 
