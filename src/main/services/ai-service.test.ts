import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../../shared/app-state.js';
import { seedState } from '../../shared/app-state.js';
import type { AiPlanGenerationResult, AiProviderAdapter, AiRequest, AiResult } from '../../shared/ai-service.js';
import { AiService } from './ai-service.js';

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

  assert.ok(reflectionSummary);
  assert.equal(reflectionSummary.providerId, 'kimi');
  assert.equal(reflectionSummary.ready, false);
  assert.match(reflectionSummary.blockedReason ?? '', /未启用|Secret/);
});
