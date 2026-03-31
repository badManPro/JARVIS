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

test('OpenAiCompatibleProviderAdapter includes main-goal continuity scheduling context in plan generation prompts', async () => {
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
                content: '{"title":"AI 主线草案","summary":"保持主线连续推进","basis":["主目标优先"],"stages":[{"title":"阶段 1","outcome":"完成主线起步","progress":"进行中"}],"milestones":[{"title":"第 1 周：稳定主线投入","focus":"先保障主目标","outcome":"形成主线连续性","status":"current"},{"title":"第 2 周：副目标补位","focus":"利用剩余时间补位","outcome":"副目标不过度打断主线","status":"upcoming"},{"title":"第 3 周：收束本轮成果","focus":"回到主线交付","outcome":"得到最小成果","status":"upcoming"}],"tasks":[{"title":"主线任务","duration":"30 分钟","note":"先保主线","status":"todo"}]}',
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
      capability: 'plan_generation',
      goal: seedState.goals[0],
      profile: seedState.profile,
      currentDraft: seedState.plan.drafts[0],
      scheduling: seedState.dashboard.scheduling,
    },
  });

  const prompt = requestBody.messages?.[1]?.content ?? '';
  assert.match(prompt, /当前目标角色：main/);
  assert.match(prompt, /主目标优先占位 70%/);
  assert.match(prompt, /副目标补位/);
  assert.match(prompt, /形成稳定的技术复盘输出习惯/);
});

test('OpenAiCompatibleProviderAdapter builds and parses structured daily plan generation requests', async () => {
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
                content: '{"date":"2026-03-29","status":"ready","todayGoal":"完成 Python 虚拟环境和 print/input 语法入门","deliverable":"一个可运行的 hello_cli.py","estimatedDuration":"30 分钟","milestoneRef":"第 1 周：搭好 Python 本地环境","steps":[{"title":"安装并验证 Python 环境","detail":"安装 Python 3.12 并验证 python3 --version","duration":"10 分钟"}],"resources":[{"title":"Python 官方教程","url":"https://docs.python.org/3/tutorial/index.html","reason":"先看官方最小入门"}],"practice":[{"title":"完成 2 个基础输入输出练习","detail":"练习 print、input、变量拼接","output":"提交 1 个可运行脚本"}],"generatedFromContext":{"availableDuration":"今天 30 分钟","studyWindow":"今晚 20:30 - 21:00","note":"今天只想先完成环境和最基础语法"}}',
              },
            },
          ],
        }),
      } as unknown as Response;
    },
  });

  const result = await adapter.execute({
    provider: createProvider(),
    request: {
      capability: 'daily_plan_generation',
      goal: seedState.goals[0],
      profile: seedState.profile,
      currentDraft: seedState.plan.drafts[0],
      scheduling: seedState.dashboard.scheduling,
      todayContext: {
        availableDuration: '今天 30 分钟',
        studyWindow: '今晚 20:30 - 21:00',
        note: '今天只想先完成环境和最基础语法',
        updatedAt: '2026-03-29T10:00:00.000Z',
      },
    },
  });

  const prompt = requestBody.messages?.[1]?.content ?? '';
  assert.equal(result.capability, 'daily_plan_generation');
  assert.match(prompt, /时间块/);
  assert.match(prompt, /学习步骤/);
  assert.match(prompt, /资源/);
  assert.match(prompt, /练习/);
  assert.match(prompt, /今日产出/);
  assert.match(prompt, /今天 30 分钟/);
  assert.match(prompt, /当前目标角色：main/);
  assert.match(prompt, /主目标优先占位 70%/);
  assert.match(prompt, /副目标补位/);
  assert.equal(result.plan.todayGoal, '完成 Python 虚拟环境和 print/input 语法入门');
  assert.equal(result.plan.resources[0]?.title, 'Python 官方教程');
});
