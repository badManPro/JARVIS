import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState } from './app-state.js';
import { buildGoalDomainPromptLines } from './domain-rules.js';
import { inferLearningGoalDomain } from './goal.js';
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

test('inferLearningGoalDomain detects instrument goals from common instrument keywords', () => {
  const domain = inferLearningGoalDomain({
    title: '学会吉他弹唱入门',
    baseline: '会看和弦图，但换和弦和节拍器配合不稳定。',
    successMetric: '完整弹完一首简单弹唱曲目并录音。',
  });

  assert.equal(domain, 'instrument');
});

test('createPlanDraft uses instrument-specific fallback guidance for instrument goals', () => {
  const instrumentGoal = {
    ...seedState.goals[0],
    title: '吉他弹唱入门',
    baseline: '能看懂和弦图，但换和弦容易卡拍。',
    successMetric: '录下一段稳定的 8 小节弹唱片段',
    domain: 'instrument',
  } as never;

  const draft = createPlanDraft(instrumentGoal, seedState.profile);

  assert.equal(draft.tasks.length >= 3, true);
  assert.equal(
    draft.tasks.some((task) => /调音|热身|姿势/.test(`${task.title} ${task.note}`)),
    true,
  );
  assert.equal(
    draft.tasks.some((task) => /节拍器|录音|慢练/.test(`${task.title} ${task.note}`)),
    true,
  );
  assert.match(draft.summary, /乐器|节拍器|录音|慢练/);
});

test('buildGoalDomainPromptLines includes instrument-specific guidance for instrument goals', () => {
  const lines = buildGoalDomainPromptLines({
    title: '吉他弹唱入门',
    baseline: '和弦切换不稳定，容易抢拍。',
    successMetric: '录下一段稳定的弹唱片段',
    domain: 'instrument',
  });

  assert.equal(lines.some((line) => /目标领域：乐器/.test(line)), true);
  assert.equal(lines.some((line) => /节拍器慢练|录音回听|调音/.test(line)), true);
  assert.equal(lines.some((line) => /当前识别乐器：吉他/.test(line)), true);
});
