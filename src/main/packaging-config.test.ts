import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

type PackageJson = {
  main?: string;
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  build?: {
    appId?: string;
    productName?: string;
    directories?: {
      output?: string;
    };
    files?: string[];
    asarUnpack?: string[];
    mac?: {
      target?: Array<string | { target: string }>;
    };
  };
};

function readPackageJson(): PackageJson {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
}

function readWorkspaceFile(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

function normalizeTargets(targets: NonNullable<NonNullable<PackageJson['build']>['mac']>['target']) {
  return (targets ?? []).map((target) => typeof target === 'string' ? target : target.target);
}

test('package.json defines packaging scripts and electron-builder dependency', () => {
  const packageJson = readPackageJson();

  assert.equal(
    packageJson.main,
    'dist-electron/src/main/index.js',
  );
  assert.equal(
    packageJson.scripts?.['dev:electron'],
    'wait-on tcp:5173 dist-electron/src/main/index.js && electron .',
  );
  assert.equal(
    packageJson.scripts?.['rebuild:native:node'],
    'npm rebuild better-sqlite3',
  );
  assert.equal(
    packageJson.scripts?.package,
    'node scripts/run-electron-builder.mjs --dir',
  );
  assert.equal(
    packageJson.scripts?.dist,
    'node scripts/run-electron-builder.mjs',
  );
  assert.ok(packageJson.devDependencies?.['electron-builder']);
});

test('package.json exposes macOS installer-oriented electron-builder config', () => {
  const packageJson = readPackageJson();
  const builderConfig = packageJson.build;
  const macTargets = normalizeTargets(builderConfig?.mac?.target);

  assert.equal(builderConfig?.appId, 'com.learningcompanion.app');
  assert.equal(builderConfig?.productName, 'Learning Companion');
  assert.equal(builderConfig?.directories?.output, 'release');
  assert.deepEqual(builderConfig?.files, [
    'dist/**/*',
    'dist-electron/**/*',
    'node_modules/**/*',
    'package.json',
  ]);
  assert.deepEqual(builderConfig?.asarUnpack, [
    'node_modules/better-sqlite3/**/*',
  ]);
  assert.deepEqual(macTargets, ['dmg', 'zip']);
});

test('packaging wrapper restores better-sqlite3 back to the Node runtime after electron-builder runs', () => {
  const script = readWorkspaceFile('scripts/run-electron-builder.mjs');

  assert.match(script, /\['run', 'build'\]/);
  assert.match(script, /\['exec', 'electron-builder', '--', \.\.\.builderArgs\]/);
  assert.match(script, /\['run', 'rebuild:native:node'\]/);
});
