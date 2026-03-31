import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const companionPath = path.resolve(currentDir, 'desktop-companion.tsx');
const companionSource = fs.readFileSync(companionPath, 'utf8');
const protocolPath = path.resolve(currentDir, '../../../shared/companion.ts');
const protocolSource = fs.readFileSync(protocolPath, 'utf8');

test('desktop companion defines reminder, celebration, and status-feedback duties without becoming the main entrypoint', () => {
  assert.match(companionSource, /桌面陪伴层/);
  assert.match(companionSource, /提醒/);
  assert.match(companionSource, /庆祝/);
  assert.match(companionSource, /状态反馈/);
  assert.match(companionSource, /陪伴层，不是主入口/);
  assert.match(companionSource, /dashboard\.onboarding/);
  assert.match(companionSource, /dashboard\.riskSignals/);
  assert.match(companionSource, /dashboard\.priorityAction/);
  assert.match(companionSource, /dashboard\.scheduling/);
  assert.match(companionSource, /todayPlan\?\.steps/);
  assert.match(companionSource, /companionCue/);
  assert.match(companionSource, /最近联动/);
  assert.match(companionSource, /人格基调/);
});

test('desktop companion maps each duty mode to explicit motion and expression states', () => {
  assert.match(protocolSource, /const companionPresenceByMode/);
  assert.match(protocolSource, /motion: 'lean-in'/);
  assert.match(protocolSource, /motion: 'bounce'/);
  assert.match(protocolSource, /motion: 'hover'/);
  assert.match(protocolSource, /expression: 'alert'/);
  assert.match(protocolSource, /expression: 'cheerful'/);
  assert.match(protocolSource, /expression: 'steady'/);
  assert.match(protocolSource, /直接推进型/);
  assert.match(protocolSource, /鼓励陪跑型/);
  assert.match(protocolSource, /稳定同步型/);
  assert.match(companionSource, /当前动作/);
  assert.match(companionSource, /当前表情/);
  assert.match(companionSource, /当前语气/);
});

test('desktop companion stays wired into shell navigation and change capture actions', () => {
  assert.match(companionSource, /currentPage: string/);
  assert.match(companionSource, /onOpenCoach: \(\) => void/);
  assert.match(companionSource, /onPageChange: \(pageId: string\) => void/);
  assert.match(companionSource, /onClick=\{\(\) => onPageChange\(brief\.action\.pageId\)\}/);
  assert.match(companionSource, /onClick=\{onOpenCoach\}/);
  assert.match(companionSource, /desktop-companion-panel/);
  assert.match(companionSource, /desktop-companion-avatar/);
  assert.match(companionSource, /data-motion=\{brief\.presence\.motion\}/);
  assert.match(companionSource, /data-expression=\{brief\.presence\.expression\}/);
  assert.match(companionSource, /data-persona=\{brief\.persona\.id\}/);
  assert.match(companionSource, /data-tone=\{brief\.persona\.tone\}/);
  assert.match(companionSource, /desktop-companion-brow/);
  assert.match(companionSource, /desktop-companion-presence-card/);
  assert.match(companionSource, /data-duty=/);
  assert.match(companionSource, /data-cue-active=/);
  assert.match(companionSource, /data-linked-source=/);
  assert.match(companionSource, /resolveCompanionPersona/);
  assert.match(companionSource, /createCompanionNavigateAction/);
});
