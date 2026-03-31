import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const todayPagePath = path.resolve(currentDir, 'today-page.tsx');
const pathPagePath = path.resolve(currentDir, 'path-page.tsx');
const reflectionSheetPath = path.resolve(currentDir, 'reflection-sheet.tsx');
const appStorePath = path.resolve(currentDir, '../../store/app-store.ts');

const todayPageSource = fs.readFileSync(todayPagePath, 'utf8');
const pathPageSource = fs.readFileSync(pathPagePath, 'utf8');
const appStoreSource = fs.readFileSync(appStorePath, 'utf8');

test('today page opens a reflection sheet after task completion, delay, or skip', () => {
  assert.equal(fs.existsSync(reflectionSheetPath), true);
  assert.match(todayPageSource, /ReflectionSheet/);
  assert.match(todayPageSource, /case 'done':|case 'delayed':|case 'skipped':/);
  assert.match(todayPageSource, /period="daily"/);
  assert.match(todayPageSource, /生成今日计划|重新生成今日计划/);
  assert.match(todayPageSource, /仅今天有效/);
  assert.match(todayPageSource, /明天候选区/);
  assert.match(todayPageSource, /后续步骤|依赖|顺延/);
  assert.match(todayPageSource, /今日产出/);
  assert.match(todayPageSource, /resources|practice|steps/);
});

test('path page keeps the first screen focused on current stage and moves basis into progressive disclosure', () => {
  const reflectionSheetSource = fs.readFileSync(reflectionSheetPath, 'utf8');
  assert.match(reflectionSheetSource, /saveReflectionEntry/);
  assert.match(pathPageSource, /周里程碑|本周里程碑/);
  assert.match(pathPageSource, /ReflectionSheet/);
  assert.match(pathPageSource, /period="stage"/);
  assert.doesNotMatch(pathPageSource, /<SectionTitle>路径依据<\/SectionTitle>/);
});

test('app store returns the updated state from today-step status changes', () => {
  assert.match(appStoreSource, /updateTodayPlanStepStatus: \(payload: UpdateTodayPlanStepStatusInput\) => Promise<AppState>;/);
  assert.match(appStoreSource, /const persistedState = await bridge.updateTodayPlanStepStatus\(payload\);/);
  assert.match(appStoreSource, /return persistedState;/);
});
