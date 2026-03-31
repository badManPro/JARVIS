import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const pathPagePath = path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/pages/dashboard/path-page.tsx');
const pathPageSource = fs.readFileSync(pathPagePath, 'utf8');

test('path page foregrounds the rough weekly path and rough-plan regeneration controls', () => {
  assert.match(pathPageSource, /周里程碑|本周里程碑/);
  assert.match(pathPageSource, /重新生成粗版计划/);
  assert.match(pathPageSource, /milestones/);
  assert.match(pathPageSource, /当前关键节点|重要节点|本周目标/);
  assert.match(pathPageSource, /removeLearningGoal/);
  assert.match(pathPageSource, /主目标/);
  assert.match(pathPageSource, /副目标/);
  assert.match(pathPageSource, /调度权重/);
  assert.match(pathPageSource, /调度预览/);
  assert.match(pathPageSource, /主目标优先占位/);
  assert.match(pathPageSource, /副目标补位/);
  assert.match(pathPageSource, /日历排程/);
});
