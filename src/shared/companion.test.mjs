import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const source = fs.readFileSync(path.resolve(currentDir, 'companion.ts'), 'utf8');

test('shared companion protocol centralizes cue, action, presence, and persona extension points', () => {
  assert.match(source, /export type CompanionCue/);
  assert.match(source, /sourceDetail\?: string/);
  assert.match(source, /personaHint\?: CompanionCuePersonaHint/);
  assert.match(source, /export type CompanionAction/);
  assert.match(source, /intent: CompanionActionIntent/);
  assert.match(source, /export const companionPresenceByMode/);
  assert.match(source, /resolveCompanionPersona/);
  assert.match(source, /createCompanionNavigateAction/);
});
