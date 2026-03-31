import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const storeSource = fs.readFileSync(path.resolve(currentDir, 'app-store.ts'), 'utf8');

test('app store exposes a transient companion cue channel for cross-page desktop feedback', () => {
  assert.match(storeSource, /companionCue: null/);
  assert.match(storeSource, /type CompanionCueMode = 'reminder' \| 'celebration' \| 'status'/);
  assert.match(storeSource, /type CompanionCueSource = 'today' \| 'calendar'/);
  assert.match(storeSource, /publishCompanionCue: \(cue: CompanionCueInput\) => void/);
  assert.match(storeSource, /clearCompanionCue: \(\) => void/);
  assert.match(storeSource, /const companionCueDurationMs = 4200/);
  assert.match(storeSource, /globalThis\.setTimeout/);
  assert.match(storeSource, /set\(\{ companionCue: nextCue \}\)/);
});
