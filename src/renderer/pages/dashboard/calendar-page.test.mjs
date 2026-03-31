import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const calendarPagePath = path.resolve(currentDir, 'calendar-page.tsx');

test('calendar page renders the weekly scheduling preview, delayed carry-over, and scheduling rationale', () => {
  assert.equal(fs.existsSync(calendarPagePath), true);

  const calendarPageSource = fs.readFileSync(calendarPagePath, 'utf8');

  assert.match(calendarPageSource, /dashboard\.scheduling|state\) => state\.dashboard\.scheduling/);
  assert.match(calendarPageSource, /weeklyPlan/);
  assert.match(calendarPageSource, /delayedPlacements/);
  assert.match(calendarPageSource, /一周时间块/);
  assert.match(calendarPageSource, /周一|周二|周三|周四|周五|周六|周日/);
  assert.match(calendarPageSource, /主目标优先占位/);
  assert.match(calendarPageSource, /副目标补位/);
  assert.match(calendarPageSource, /延期候选|延期补回|明天候选区/);
  assert.match(calendarPageSource, /系统为什么这样安排|系统如何安排/);
  assert.match(calendarPageSource, /guardrail/);
  assert.match(calendarPageSource, /calendarHint/);
  assert.match(calendarPageSource, /冲突时/);
  assert.match(calendarPageSource, /remainingAnchorMinutes|remainingSupportMinutes/);
  assert.match(calendarPageSource, /assignedLane|movedReason/);
  assert.match(calendarPageSource, /FeedbackBanner/);
  assert.match(calendarPageSource, /calendar-flow-surface|calendar-flow-block|calendar-flow-note/);
  assert.match(calendarPageSource, /日历已重排|时间块流向/);
  assert.match(calendarPageSource, /requestAnimationFrame|setFlowingDayLabels/);
});
