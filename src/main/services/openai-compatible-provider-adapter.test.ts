import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState } from '../../shared/app-state.js';
import type { AiProviderRuntimeConfig } from '../../shared/ai-service.js';
import { OpenAiCompatibleProviderAdapter } from './openai-compatible-provider-adapter.js';

function createProvider(): AiProviderRuntimeConfig {
  return {
    id: 'openai',
    label: 'OpenAI / GPT',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    authMode: 'apiKey',
    capabilityTags: ['profile_extraction', 'plan_adjustment'],
    healthStatus: 'ready',
    secret: 'sk-test',
  };
}

test('OpenAiCompatibleProviderAdapter includes reflection context in profile extraction prompts', async () => {
  let requestBody: { messages?: Array<{ content?: string }> } = {};
  const adapter = new OpenAiCompatibleProviderAdapter({
    fetchFn: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '{"suggestions":[]}',
              },
            },
          ],
        }),
      } as unknown as Response;
    },
  });

  await adapter.execute({
    provider: createProvider(),
    request: {
      capability: 'profile_extraction',
      conversation: seedState.conversation,
      profile: seedState.profile,
      goals: seedState.goals,
      plan: seedState.plan,
      reflection: seedState.reflection,
    },
  });

  const prompt = requestBody.messages?.[1]?.content ?? '';
  assert.match(prompt, /比计划少 1 小时，主要因临时事务打断/);
  assert.match(prompt, /保持单次任务 45 分钟以内/);
});

test('OpenAiCompatibleProviderAdapter includes reflection context in plan adjustment prompts', async () => {
  let requestBody: { messages?: Array<{ content?: string }> } = {};
  const adapter = new OpenAiCompatibleProviderAdapter({
    fetchFn: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '采纳：把计划标题改成「AI 调整版草案」',
              },
            },
          ],
        }),
      } as unknown as Response;
    },
  });

  await adapter.execute({
    provider: createProvider(),
    request: {
      capability: 'plan_adjustment',
      goal: seedState.goals[0],
      profile: seedState.profile,
      currentDraft: seedState.plan.drafts[0],
      reflection: seedState.reflection,
      feedback: ['周复盘偏差：比计划少 1 小时，主要因临时事务打断。'],
    },
  });

  const prompt = requestBody.messages?.[1]?.content ?? '';
  assert.match(prompt, /当前阶段的主要偏差来自临时事务打断/);
  assert.match(prompt, /把每次任务压缩到 30-45 分钟/);
});
