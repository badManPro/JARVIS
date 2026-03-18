# MODEL PROVIDERS · Learning Companion

## 1. 目标
产品需要支持多模型 Provider，并把它们视为统一的能力来源，而不是把业务逻辑绑死在单一厂商上。

首批明确支持的 Provider 范围：
- OpenAI / GPT
- Zhipu / GLM
- Moonshot / Kimi
- DeepSeek

后续可扩展：
- Anthropic
- 本地 OpenAI-compatible 服务
- Ollama / LM Studio / 自建代理

## 2. 抽象原则
### 2.1 UI 层只依赖 Provider 配置与能力状态
页面不直接关心厂商 SDK，只读取以下抽象信息：
- providerId
- providerName
- endpoint
- model
- enabled
- authMode
- capabilityTags
- healthStatus

### 2.2 业务层只声明“用途”，不声明“厂商”
建议把模型调用按用途分层：
- profile_extraction：从对话提取画像变更
- plan_generation：生成初版学习计划
- plan_adjustment：基于反馈做计划重排
- reflection_summary：总结复盘与建议
- chat_general：一般对话兜底

然后通过策略把用途映射到某个 Provider + Model。

### 2.3 设置页是唯一主入口
多模型配置的主入口放在“设置 > AI 配置”，而不是散落在各业务页面。

## 3. 建议数据结构
```ts
export type ProviderId = 'openai' | 'glm' | 'kimi' | 'deepseek' | 'custom';

export type ModelCapability =
  | 'profile_extraction'
  | 'plan_generation'
  | 'plan_adjustment'
  | 'reflection_summary'
  | 'chat_general';

export type ProviderConfig = {
  id: ProviderId;
  label: string;
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  model: string;
  authMode: 'apiKey' | 'bearer' | 'none';
  capabilityTags: ModelCapability[];
  healthStatus: 'unknown' | 'ready' | 'warning';
};

export type ModelRouting = {
  profileExtraction: ProviderId;
  planGeneration: ProviderId;
  planAdjustment: ProviderId;
  reflectionSummary: ProviderId;
  generalChat: ProviderId;
};
```

## 4. 设置页需要呈现什么
### 4.1 Provider 列表
每个 Provider 至少显示：
- 名称
- 当前模型
- Endpoint
- 启用状态
- 能力标签
- 健康状态

### 4.2 默认路由策略
设置页允许用户指定：
- 画像提取默认使用哪个 Provider
- 计划生成默认使用哪个 Provider
- 计划调整默认使用哪个 Provider
- 复盘总结默认使用哪个 Provider
- 通用对话默认使用哪个 Provider

### 4.3 安全与体验边界
- API Key 默认只保存在本地。
- UI 可以显示“已配置 / 未配置”，但默认不回显完整 Key。
- 当前实现中，Provider secret 已通过 main/preload 写入 SQLite 独立表；renderer 只读取 masked preview、`hasSecret`、`updatedAt` 等安全字段。

## 5. 与后续开发的接口边界
当前阶段已完成：
- 前端 Provider 抽象类型
- 设置页 Provider 真实编辑 / 保存交互
- 用途到 Provider 的路由状态结构
- preload 安全桥接基础接口
- 主进程 Provider 配置持久化基础
- Provider secret 独立安全存储与清空能力
- theme / startPage / routing 写回本地 SQLite

下一阶段再接：
- Provider 可用性探测
- 统一 AI 调用服务层
- 更细粒度的配置校验与迁移策略
- Provider 连通性测试与错误提示细化

## 6. 当前不做的内容
当前不在本轮实现范围内：
- 真正发起在线模型请求
- 多 Provider 自动负载均衡
- 自动价格 / 延迟评估
- Provider 失败时的复杂降级编排
