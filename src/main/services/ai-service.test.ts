import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../../shared/app-state.js';
import { seedState } from '../../shared/app-state.js';
import type { AiPlanGenerationResult, AiProviderAdapter, AiRequest, AiResult } from '../../shared/ai-service.js';
import { AiService } from './ai-service.js';

function createTestMilestones() {
  return [
    { title: '第 1 周：搭好 Python 本地环境', focus: '完成环境与最小脚本', outcome: '可以运行 hello_cli.py', status: 'current' as const },
    { title: '第 2 周：打通一次模型调用', focus: '完成 API 请求与结果解析', outcome: '返回结构化模型结果', status: 'upcoming' as const },
    { title: '第 3 周：收束 MVP 范围', focus: '确定本轮最小功能', outcome: '得到可实现的 MVP 清单', status: 'upcoming' as const },
  ];
}

function cloneSettings(overrides?: Partial<AppState['settings']>): AppState['settings'] {
  return {
    ...JSON.parse(JSON.stringify(seedState.settings)) as AppState['settings'],
    ...overrides,
  };
}

test('AiService routes plan_generation to the configured provider and forwards runtime config to adapter', async () => {
  const settings = cloneSettings({
    providers: seedState.settings.providers.map((provider) => (
      provider.id === 'deepseek'
        ? { ...provider, enabled: true }
        : provider
    )),
    routing: {
      ...seedState.settings.routing,
      planGeneration: 'deepseek',
    },
  });

  const adapterCalls: Array<{ providerId: string; capability: AiRequest['capability'] }> = [];
  const adapter: AiProviderAdapter = {
    name: 'fake-openai-compatible',
    supports: () => true,
    checkHealth: async () => ({
      ok: true,
      message: 'unused',
    }),
    execute: async ({ provider, request }) => {
      adapterCalls.push({ providerId: provider.id, capability: request.capability });
      return {
        capability: 'plan_generation',
        providerId: provider.id,
        providerLabel: provider.label,
        model: provider.model,
        draft: {
          title: 'AI 计划草案',
          summary: '由统一 AI service 生成',
          basis: ['已命中 deepseek route'],
          stages: [{ title: '阶段 1', outcome: '完成最小链路', progress: '未开始' }],
          milestones: createTestMilestones(),
          tasks: [{ title: '补统一 runtime', duration: '45 分钟', note: '确保 route 能真正命中 provider' }],
        },
      } satisfies AiPlanGenerationResult;
    },
  };

  const service = new AiService({
    getSecret: (providerId) => (providerId === 'deepseek' ? 'sk-deepseek' : null),
    adapters: [adapter],
  });

  const result = await service.execute(settings, {
    capability: 'plan_generation',
    goal: seedState.goals[0],
    profile: seedState.profile,
    currentDraft: seedState.plan.drafts[0],
    scheduling: seedState.dashboard.scheduling,
  });

  assert.equal(adapterCalls.length, 1);
  assert.deepEqual(adapterCalls[0], {
    providerId: 'deepseek',
    capability: 'plan_generation',
  });
  assert.equal(result.capability, 'plan_generation');
  assert.equal(result.providerId, 'deepseek');
  assert.equal(result.providerLabel, 'DeepSeek');
  assert.equal(result.draft.title, 'AI 计划草案');
});

test('AiService rejects profile_extraction when the routed provider secret is missing', async () => {
  const settings = cloneSettings({
    providers: seedState.settings.providers.map((provider) => (
      provider.id === 'openai'
        ? { ...provider, enabled: true }
        : provider
    )),
    routing: {
      ...seedState.settings.routing,
      profileExtraction: 'openai',
    },
  });

  const service = new AiService({
    getSecret: () => null,
    adapters: [{
      name: 'unused-adapter',
      supports: () => true,
      checkHealth: async () => ({
        ok: false,
        message: 'unused',
      }),
      execute: async () => {
        throw new Error('should not execute');
      },
    }],
  });

  await assert.rejects(
    () => service.execute(settings, {
      capability: 'profile_extraction',
      conversation: seedState.conversation,
      profile: seedState.profile,
      goals: seedState.goals,
      plan: seedState.plan,
      reflection: seedState.reflection,
    }),
    /OpenAI \/ GPT.*Secret/,
  );
});

test('AiService runtime summary reflects route changes and readiness blockers', () => {
  const settings = cloneSettings({
    providers: seedState.settings.providers.map((provider) => {
      if (provider.id === 'deepseek') {
        return {
          ...provider,
          enabled: true,
          healthStatus: 'warning',
        };
      }

      return provider;
    }),
    routing: {
      ...seedState.settings.routing,
      planGeneration: 'deepseek',
    },
  });

  const service = new AiService({
    getSecret: (providerId) => (providerId === 'deepseek' ? 'sk-deepseek' : null),
    adapters: [{
      name: 'summary-adapter',
      supports: () => true,
      checkHealth: async () => ({
        ok: true,
        message: 'unused',
      }),
      execute: async () => ({ capability: 'chat_general', providerId: 'openai', providerLabel: 'OpenAI / GPT', model: 'gpt-4.1-mini', text: 'unused' }) satisfies AiResult,
    }],
  });

  const summary = service.getRuntimeSummary(settings);
  const planGeneration = summary.find((item) => item.capability === 'plan_generation');
  const reflectionSummary = summary.find((item) => item.capability === 'reflection_summary');

  assert.ok(planGeneration);
  assert.equal(planGeneration.providerId, 'deepseek');
  assert.equal(planGeneration.ready, true);
  assert.equal(planGeneration.blockedReason, undefined);
  assert.equal(planGeneration.healthStatus, 'warning');

  assert.ok(reflectionSummary);
  assert.equal(reflectionSummary.providerId, 'kimi');
  assert.equal(reflectionSummary.ready, false);
  assert.match(reflectionSummary.blockedReason ?? '', /未启用|Secret/);
  assert.equal(reflectionSummary.healthStatus, 'unknown');
});

test('AiService checkProviderHealth delegates to adapter and returns a ready result', async () => {
  const settings = cloneSettings({
    providers: seedState.settings.providers.map((provider) => (
      provider.id === 'deepseek'
        ? { ...provider, enabled: true }
        : provider
    )),
  });

  const healthChecks: string[] = [];
  const adapter: AiProviderAdapter = {
    name: 'health-check-adapter',
    supports: () => true,
    checkHealth: async ({ provider }) => {
      healthChecks.push(provider.id);
      return {
        ok: true,
        message: '模型列表接口可访问。',
      };
    },
    execute: async () => ({ capability: 'chat_general', providerId: 'deepseek', providerLabel: 'DeepSeek', model: 'deepseek-chat', text: 'unused' }) satisfies AiResult,
  };

  const service = new AiService({
    getSecret: (providerId) => (providerId === 'deepseek' ? 'sk-deepseek' : null),
    adapters: [adapter],
  });

  const result = await service.checkProviderHealth(settings, 'deepseek');

  assert.deepEqual(healthChecks, ['deepseek']);
  assert.equal(result.providerId, 'deepseek');
  assert.equal(result.providerLabel, 'DeepSeek');
  assert.equal(result.healthStatus, 'ready');
  assert.equal(result.message, '模型列表接口可访问。');
});

test('AiService allows a codex provider without a stored secret', async () => {
  const settings = cloneSettings({
    providers: seedState.settings.providers.map((provider) => (
      provider.id === 'codex'
        ? {
          ...provider,
          enabled: true,
          endpoint: '',
          model: 'gpt-5',
          authMode: 'none',
          capabilityTags: ['chat_general'],
          healthStatus: 'unknown',
          keyPreview: '由本机 Codex 登录提供',
          hasSecret: false,
        }
        : { ...provider, enabled: false }
    )),
    routing: {
      ...seedState.settings.routing,
      generalChat: 'codex' as AppState['settings']['routing']['generalChat'],
    },
  });

  const executed: string[] = [];
  const adapter: AiProviderAdapter = {
    name: 'codex-adapter',
    supports: (provider) => provider.id === 'codex',
    checkHealth: async () => ({
      ok: true,
      message: 'Codex 登录可用。',
    }),
    execute: async ({ provider }) => {
      executed.push(provider.id);
      return {
        capability: 'chat_general',
        providerId: provider.id,
        providerLabel: provider.label,
        model: provider.model,
        text: 'Codex 输出',
      } satisfies AiResult;
    },
  };

  const service = new AiService({
    getSecret: () => null,
    adapters: [adapter],
  });

  const result = await service.execute(settings, {
    capability: 'chat_general',
    messages: seedState.conversation.messages,
  });

  assert.deepEqual(executed, ['codex']);
  assert.equal(result.capability, 'chat_general');
  assert.equal(result.providerId, 'codex');
  assert.equal(result.text, 'Codex 输出');
});

test('AiService blocks codex when the login state is disconnected', () => {
  const settings = cloneSettings({
    providers: seedState.settings.providers.map((provider) => (
      provider.id === 'codex'
        ? {
          ...provider,
          enabled: true,
          authMode: 'none',
          capabilityTags: ['chat_general'],
        }
        : { ...provider, enabled: false }
    )),
    routing: {
      ...seedState.settings.routing,
      generalChat: 'codex',
    },
  });

  const service = new AiService({
    getSecret: () => null,
    getProviderLoginState: (providerId) => (
      providerId === 'codex'
        ? { connected: false, blockedReason: 'Codex 尚未连接，请先完成浏览器登录。' }
        : null
    ),
    adapters: [{
      name: 'unused-codex-adapter',
      supports: () => true,
      checkHealth: async () => ({
        ok: true,
        message: 'unused',
      }),
      execute: async () => ({ capability: 'chat_general', providerId: 'codex', providerLabel: 'OpenAI / Codex', model: 'gpt-5.2-codex', text: 'unused' }) satisfies AiResult,
    }],
  });

  const summary = service.getRuntimeSummary(settings);
  const generalChat = summary.find((item) => item.capability === 'chat_general');

  assert.ok(generalChat);
  assert.equal(generalChat.providerId, 'codex');
  assert.equal(generalChat.ready, false);
  assert.equal(generalChat.blockedReason, 'Codex 尚未连接，请先完成浏览器登录。');
});
