import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const pathPagePath = path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/pages/dashboard/path-page.tsx');
const pathPageSource = fs.readFileSync(pathPagePath, 'utf8');

test('path page exposes goal deletion from the active dashboard surface', () => {
  assert.match(pathPageSource, /removeLearningGoal/);
  assert.match(pathPageSource, /删除目标/);
  assert.match(pathPageSource, /确认删除这个学习目标/);
  assert.match(pathPageSource, /删除后新的当前主目标/);
  assert.match(pathPageSource, /将清理的历史快照/);
});
