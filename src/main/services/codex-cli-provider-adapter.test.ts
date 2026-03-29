import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState } from '../../shared/app-state.js';
import type { AiProviderRuntimeConfig } from '../../shared/ai-service.js';
import { CodexCliProviderAdapter } from './codex-cli-provider-adapter.js';

function createProvider(): AiProviderRuntimeConfig {
  return {
    id: 'codex',
    label: 'OpenAI / Codex',
    endpoint: '',
    model: 'gpt-5',
    authMode: 'none',
    capabilityTags: ['profile_extraction', 'plan_generation', 'chat_general'],
    healthStatus: 'unknown',
    secret: null,
  } as AiProviderRuntimeConfig;
}

test('CodexCliProviderAdapter executes chat_general requests through the Codex invoker', async () => {
  const prompts: string[] = [];
  const adapter = new CodexCliProviderAdapter({
    invoke: async ({ prompt }) => {
      prompts.push(prompt);
      return '这是 Codex 返回的结果';
    },
  });

  const result = await adapter.execute({
    provider: createProvider(),
    request: {
      capability: 'chat_general',
      messages: seedState.conversation.messages,
    },
  });

  assert.equal(result.capability, 'chat_general');
  assert.equal(result.providerId, 'codex');
  assert.equal(result.text, '这是 Codex 返回的结果');
  assert.equal(prompts.length, 1);
  assert.match(prompts[0] ?? '', /学习陪伴助手/);
});

test('CodexCliProviderAdapter parses JSON responses for plan generation', async () => {
  const adapter = new CodexCliProviderAdapter({
    invoke: async () => '{"title":"Codex 计划","summary":"测试摘要","basis":["A"],"stages":[{"title":"阶段 1","outcome":"完成验证","progress":"未开始"}],"tasks":[{"title":"验证 provider","duration":"15 分钟","note":"确保返回结构化 JSON","status":"todo"}]}',
  });

  const result = await adapter.execute({
    provider: createProvider(),
    request: {
      capability: 'plan_generation',
      goal: seedState.goals[0],
      profile: seedState.profile,
      currentDraft: seedState.plan.drafts[0],
    },
  });

  assert.equal(result.capability, 'plan_generation');
  assert.equal(result.providerId, 'codex');
  assert.equal(result.draft.title, 'Codex 计划');
  assert.equal(result.draft.tasks[0]?.title, '验证 provider');
});

test('CodexCliProviderAdapter parses JSON responses for daily plan generation', async () => {
  const adapter = new CodexCliProviderAdapter({
    invoke: async () => '{"date":"2026-03-29","status":"ready","todayGoal":"完成 Python 环境安装","deliverable":"跑通 hello_cli.py","estimatedDuration":"30 分钟","milestoneRef":"第 1 周：搭好 Python 本地环境","steps":[{"title":"安装 Python 3.12","detail":"确认 python3 --version","duration":"10 分钟"}],"resources":[{"title":"Python 官方安装文档","url":"https://www.python.org/downloads/","reason":"以官方安装说明为准"}],"practice":[{"title":"写一个 hello_cli.py","detail":"打印欢迎语并读取用户输入","output":"可以运行的脚本"}],"generatedFromContext":{"availableDuration":"今天 30 分钟","studyWindow":"今晚 20:30 - 21:00","note":"今天先做最小闭环"}}',
  });

  const result = await adapter.execute({
    provider: createProvider(),
    request: {
      capability: 'daily_plan_generation',
      goal: seedState.goals[0],
      profile: seedState.profile,
      currentDraft: seedState.plan.drafts[0],
      todayContext: {
        availableDuration: '今天 30 分钟',
        studyWindow: '今晚 20:30 - 21:00',
        note: '今天先做最小闭环',
        updatedAt: '2026-03-29T10:00:00.000Z',
      },
    },
  });

  assert.equal(result.capability, 'daily_plan_generation');
  assert.equal(result.providerId, 'codex');
  assert.equal(result.plan.todayGoal, '完成 Python 环境安装');
  assert.equal(result.plan.practice[0]?.output, '可以运行的脚本');
});

test('CodexCliProviderAdapter reports health-check success when Codex returns OK', async () => {
  const adapter = new CodexCliProviderAdapter({
    invoke: async () => 'OK',
  });

  const result = await adapter.checkHealth({
    provider: createProvider(),
  });

  assert.equal(result.ok, true);
  assert.match(result.message, /Codex/);
});
