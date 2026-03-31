import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState } from './app-state.js';
import { createPlanDraft } from './plan-draft.js';

test('createPlanDraft uses programming-specific fallback guidance for programming goals', () => {
  const programmingGoal = {
    ...seedState.goals[0],
    title: 'Python + AI 应用开发',
    baseline: '有前端经验，但 Python、命令行和调试经验不足。',
    successMetric: '完成一个可运行的本地 CLI 工具',
    domain: 'programming',
  } as never;

  const draft = createPlanDraft(programmingGoal, seedState.profile);

  assert.equal(draft.tasks.length >= 3, true);
  assert.equal(
    draft.tasks.some((task) => /官方文档|README/.test(`${task.title} ${task.note}`)),
    true,
  );
  assert.equal(
    draft.tasks.some((task) => /可运行代码|脚本|运行验证/.test(`${task.title} ${task.note}`)),
    true,
  );
  assert.match(draft.summary, /编程|代码|可运行/);
});
