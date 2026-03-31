import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const coachDrawerSource = fs.readFileSync(
  path.resolve(currentDir, 'coach-drawer.tsx'),
  'utf8',
);
const profilePageSource = fs.readFileSync(
  path.resolve(currentDir, 'profile-page.tsx'),
  'utf8',
);
const appShellSource = fs.readFileSync(
  path.resolve(currentDir, '../../layouts/app-shell.tsx'),
  'utf8',
);
const appStoreSource = fs.readFileSync(
  path.resolve(currentDir, '../../store/app-store.ts'),
  'utf8',
);
const bridgeSource = fs.readFileSync(
  path.resolve(currentDir, '../../../shared/bridge.ts'),
  'utf8',
);

test('coach drawer is reduced to a lightweight change capture entry instead of a review console', () => {
  assert.match(coachDrawerSource, /onPageChange:\s*\(pageId: string\) => void;/);
  assert.match(coachDrawerSource, /保存变化|记录变化|提交变化/);
  assert.doesNotMatch(coachDrawerSource, /conversation\.actionPreviews/);
  assert.doesNotMatch(coachDrawerSource, /reviewConversationActionPreview/);
  assert.doesNotMatch(coachDrawerSource, /applyAcceptedConversationActionPreviews/);
  assert.doesNotMatch(coachDrawerSource, /接受预览/);
  assert.doesNotMatch(coachDrawerSource, /应用已接受变更/);
});

test('app shell passes page navigation into the coach drawer', () => {
  assert.match(appShellSource, /<CoachDrawer open=\{coachOpen\} onClose=\{\(\) => setCoachOpen\(false\)\} onPageChange=\{onPageChange\} \/>/);
});

test('app store resyncs derived execution state after applying accepted previews', () => {
  assert.match(appStoreSource, /syncExecutionDerivedState/);
  assert.match(appStoreSource, /const nextState = syncExecutionDerivedState\(result\.state\);/);
});

test('first-run onboarding uses an explicit generating flow and summary actions', () => {
  assert.match(coachDrawerSource, /completeInitialOnboarding/);
  assert.match(coachDrawerSource, /'editing'\s*\|\s*'generating'\s*\|\s*'result_summary'/);
  assert.match(coachDrawerSource, /整理画像/);
  assert.match(coachDrawerSource, /确认目标/);
  assert.match(coachDrawerSource, /生成路径/);
  assert.match(coachDrawerSource, /规划确认|规划倾向|planningHighlights/);
  assert.match(coachDrawerSource, /进入学习路径/);
  assert.doesNotMatch(coachDrawerSource, /直接开始今天第一步/);
  assert.match(coachDrawerSource, /当前为模板版路径/);
});

test('profile page surfaces editable planning confirmation fields', () => {
  assert.match(profilePageSource, /规划倾向|规划确认/);
  assert.match(profilePageSource, /拆解方式/);
  assert.match(profilePageSource, /决策支持/);
  assert.match(profilePageSource, /反馈语气/);
  assert.match(profilePageSource, /自动调整/);
});

test('bridge and store expose onboarding plus daily planning entry points', () => {
  assert.match(bridgeSource, /completeInitialOnboarding:\s*\(payload:/);
  assert.match(bridgeSource, /generateTodayPlan:\s*\(payload:/);
  assert.match(bridgeSource, /saveTodayPlanningContext:\s*\(payload:/);
  assert.match(appStoreSource, /completeInitialOnboarding:\s*\(payload:/);
  assert.match(appStoreSource, /generateTodayPlan:\s*\(payload:/);
  assert.match(appStoreSource, /saveTodayPlanningContext:\s*\(payload:/);
  assert.match(appStoreSource, /const persistedState = await bridge\.completeInitialOnboarding\(payload\);/);
});

test('coach drawer and profile page share preset-first field components and change quick actions', () => {
  assert.match(coachDrawerSource, /PresetInputField/);
  assert.match(coachDrawerSource, /PresetMultiValueField/);
  assert.match(profilePageSource, /PresetInputField/);
  assert.match(profilePageSource, /PresetMultiValueField/);
  assert.match(coachDrawerSource, /时间变少了/);
  assert.match(coachDrawerSource, /学习窗口变了/);
  assert.match(coachDrawerSource, /目标变了/);
  assert.match(coachDrawerSource, /希望反馈更直接/);
});
