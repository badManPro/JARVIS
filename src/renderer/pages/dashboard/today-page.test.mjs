import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const todayPageSource = fs.readFileSync(
  path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/pages/dashboard/today-page.tsx'),
  'utf8',
);

test('today page exposes daily-only planning context controls and structured daily plan sections', () => {
  assert.match(todayPageSource, /仅今天有效/);
  assert.match(todayPageSource, /generateTodayPlan/);
  assert.match(todayPageSource, /saveTodayPlanningContext/);
  assert.match(todayPageSource, /当前步骤|当前焦点/);
  assert.match(todayPageSource, /学习步骤|steps/);
  assert.match(todayPageSource, /开始|完成|延期|跳过/);
  assert.match(todayPageSource, /明天候选区/);
  assert.match(todayPageSource, /updateTodayPlanStepStatus/);
  assert.match(todayPageSource, /压缩继续|等待补回|自动重排/);
  assert.match(todayPageSource, /资源|resources/);
  assert.match(todayPageSource, /练习|practice/);
  assert.match(todayPageSource, /今日产出|deliverable/);
  assert.match(todayPageSource, /计划已过期|stale/);
});
