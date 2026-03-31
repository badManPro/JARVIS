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

function createProgrammingGoal() {
  return {
    ...seedState.goals[0],
    title: 'Python + AI 应用开发',
    baseline: '有前端经验，但 Python 和调试基础薄弱。',
    successMetric: '完成一个可运行的本地 CLI 工具',
    domain: 'programming',
  } as never;
}

function createInstrumentGoal() {
  return {
    ...seedState.goals[0],
    title: '吉他弹唱入门',
    baseline: '能看懂和弦图，但换和弦容易卡拍。',
    successMetric: '录下一段稳定的弹唱片段',
    domain: 'instrument',
  } as never;
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
      goal: createProgrammingGoal(),
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
  assert.match(prompt, /编程/);
  assert.match(prompt, /官方文档/);
  assert.match(prompt, /任务原子/);
  assert.match(prompt, /可运行代码|运行验证/);
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
      goal: createProgrammingGoal(),
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
  assert.match(prompt, /编程/);
  assert.match(prompt, /官方文档/);
  assert.match(prompt, /可运行代码|运行验证/);
  assert.equal(result.plan.todayGoal, '完成 Python 虚拟环境和 print/input 语法入门');
  assert.equal(result.plan.resources[0]?.title, 'Python 官方教程');
});

test('OpenAiCompatibleProviderAdapter includes instrument-specific prompt guidance in plan and daily generation prompts', async () => {
  const prompts: string[] = [];
  const adapter = new OpenAiCompatibleProviderAdapter({
    fetchFn: async (_input, init) => {
      const requestBody = JSON.parse(String(init?.body));
      prompts.push(requestBody.messages?.[1]?.content ?? '');
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: requestBody.messages?.[1]?.content?.includes('"date":"')
                  ? '{"date":"2026-03-31","status":"ready","todayGoal":"完成吉他节拍器慢练","deliverable":"录下一段 30 秒练习录音","estimatedDuration":"30 分钟","milestoneRef":"第 1 周：校准吉他基础动作","steps":[{"title":"调音并热身","detail":"先完成调音和和弦切换热身","duration":"8 分钟"}],"resources":[{"title":"吉他基础和弦与右手节奏示范","url":"","reason":"先对照示范确认节奏和动作"}],"practice":[{"title":"节拍器慢练 + 录音回听","detail":"围绕 1 个和弦切换做慢练","output":"1 段录音 + 1 条自评"}],"generatedFromContext":{"availableDuration":"今天 30 分钟","studyWindow":"今晚 21:00 - 21:30","note":"今天只练和弦切换"}}'
                  : '{"title":"吉他练习草案","summary":"围绕吉他慢练和录音回听推进","basis":["先调音"],"stages":[{"title":"阶段 1","outcome":"校准起点","progress":"进行中"}],"milestones":[{"title":"第 1 周：校准吉他基础动作","focus":"先固定调音和节拍器慢练","outcome":"形成 1 段稳定片段","status":"current"},{"title":"第 2 周：攻克关键段落","focus":"分段慢练","outcome":"节拍稳定","status":"upcoming"},{"title":"第 3 周：完成录音回听","focus":"连贯演奏","outcome":"得到录音","status":"upcoming"}],"tasks":[{"title":"调音并热身","duration":"15 分钟","note":"先调音再热身","status":"todo"}]}',
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
      goal: createInstrumentGoal(),
      profile: seedState.profile,
      currentDraft: seedState.plan.drafts[0],
      scheduling: seedState.dashboard.scheduling,
    },
  });

  await adapter.execute({
    provider: createProvider(),
    request: {
      capability: 'daily_plan_generation',
      goal: createInstrumentGoal(),
      profile: seedState.profile,
      currentDraft: seedState.plan.drafts[0],
      scheduling: seedState.dashboard.scheduling,
      todayContext: {
        availableDuration: '今天 30 分钟',
        studyWindow: '今晚 21:00 - 21:30',
        note: '今天只练和弦切换',
        updatedAt: '2026-03-31T10:00:00.000Z',
      },
    },
  });

  const combinedPrompt = prompts.join('\n');
  assert.match(combinedPrompt, /目标领域：乐器/);
  assert.match(combinedPrompt, /示范对照|节拍器慢练|录音回听/);
  assert.match(combinedPrompt, /当前识别乐器：吉他/);
  assert.match(combinedPrompt, /调音|热身|分段重复/);
});
