import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const todayPagePath = path.resolve(currentDir, 'today-page.tsx');
const todayPageSource = fs.readFileSync(todayPagePath, 'utf8');

test('today page exposes daily-only planning context controls and structured daily plan sections', () => {
  assert.match(todayPageSource, /仅今天有效/);
  assert.match(todayPageSource, /generateTodayPlan/);
  assert.match(todayPageSource, /saveTodayPlanningContext/);
  assert.match(todayPageSource, /publishCompanionCue/);
  assert.match(todayPageSource, /sourceLabel: '今日页联动'/);
  assert.match(todayPageSource, /sourceDetail: title/);
  assert.match(todayPageSource, /createCompanionNavigateAction/);
  assert.match(todayPageSource, /主目标连续推进/);
  assert.match(todayPageSource, /主目标优先占位/);
  assert.match(todayPageSource, /副目标补位/);
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
  assert.match(todayPageSource, /StagedFeedbackPanel/);
  assert.match(todayPageSource, /系统正在把今天的限制重排成可执行步骤/);
  assert.match(todayPageSource, /下一步已自动上浮|feedback-focus-card/);
  assert.match(todayPageSource, /明天候选区|feedback-target-surface/);
  assert.match(todayPageSource, /角色庆祝|角色提醒|角色状态反馈/);
  assert.match(todayPageSource, /personaHint: 'direct'|personaHint: 'encouraging'|personaHint: 'steady'/);
});
