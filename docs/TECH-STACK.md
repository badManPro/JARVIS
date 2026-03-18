# TECH STACK · Learning Companion

## 1. 客户端形态
- Electron
- React + TypeScript
- shadcn/ui
- Tailwind CSS

## 2. 状态管理
- Zustand

## 3. 数据存储
- SQLite
- Drizzle ORM（优先）

## 4. 核心能力模块
- profile-engine：用户画像引擎
- planning-engine：学习规划引擎
- conversation-engine：对话与上下文管理
- task-engine：任务、阶段、复盘管理
- storage：本地数据存储

## 5. AI 能力接入
初期：
- 以前端 Provider 抽象 + 路由策略为先
- 支持配置 OpenAI / GLM / Kimi / DeepSeek / Custom Provider
- UI 层先只依赖统一配置结构，不直接依赖厂商 SDK

后续：
- 可接本地模型
- 可配置不同模型策略
- 接统一 AI service，把能力用途映射到指定 Provider

## 6. 本地优先原则
- 数据默认本地存储
- 用户画像、计划、对话历史默认在本地
- AI 调用架构支持外部模型，但产品默认以本地控制感为先
