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
    win?: {
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

function normalizeTargets(targets?: Array<string | { target: string }>) {
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
    'node scripts/run-electron-dev.mjs',
  );
  assert.equal(
    packageJson.scripts?.['rebuild:native:electron'],
    'npm exec electron-rebuild -- -f -w better-sqlite3 -m .',
  );
  assert.equal(
    packageJson.scripts?.['rebuild:native:node'],
    'node scripts/run-node-native-rebuild.mjs',
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

test('package.json exposes Windows installer-oriented electron-builder config', () => {
  const packageJson = readPackageJson();
  const builderConfig = packageJson.build;
  const winTargets = normalizeTargets(builderConfig?.win?.target);

  assert.deepEqual(winTargets, ['nsis', 'zip']);
});

test('release workflow builds macOS and Windows artifacts and publishes them to GitHub Releases', () => {
  const workflowPath = path.resolve(process.cwd(), '.github/workflows/release.yml');
  assert.ok(fs.existsSync(workflowPath));

  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.match(workflow, /^name:\s*Release/m);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\s*\n\s*tags:\s*\n\s*-\s*['"]v\*['"]/m);
  assert.match(workflow, /build-macos:/);
  assert.match(workflow, /build-windows:/);
  assert.match(workflow, /release:/);
  assert.match(workflow, /npm run dist -- --mac --arm64/);
  assert.match(workflow, /npm run dist -- --win --x64/);
  assert.match(workflow, /gh release (create|upload)/);
});

test('main process points to a CommonJS preload build for Electron', () => {
  const mainSource = readWorkspaceFile('src/main/index.ts');
  const compiledPreloadPath = path.resolve(process.cwd(), 'dist-electron/src/preload/index.cjs');

  assert.match(mainSource, /preload:\s*preloadPath/);
  assert.match(mainSource, /path\.join\(__dirname,\s*'\.\.\/preload\/index\.cjs'\)/);
  assert.ok(fs.existsSync(compiledPreloadPath));

  const compiledPreload = fs.readFileSync(compiledPreloadPath, 'utf8');
  assert.doesNotMatch(compiledPreload, /import\s+\{ contextBridge, ipcRenderer \}\s+from\s+'electron'/);
  assert.match(compiledPreload, /require\("electron"\)|require\('electron'\)/);
});

test('packaging wrapper restores better-sqlite3 back to the Node runtime after electron-builder runs', () => {
  const script = readWorkspaceFile('scripts/run-electron-builder.mjs');

  assert.match(script, /\['run', 'build'\]/);
  assert.match(script, /\['exec', 'electron-builder', '--', \.\.\.builderArgs\]/);
  assert.match(script, /\['run', 'rebuild:native:node'\]/);
});

test('dev wrapper rebuilds better-sqlite3 for Electron before launch and restores Node runtime on exit', () => {
  const script = readWorkspaceFile('scripts/run-electron-dev.mjs');

  assert.match(script, /\['run', 'rebuild:native:electron'\]/);
  assert.match(script, /\['exec', 'wait-on', '--', 'tcp:5173', 'dist-electron\/src\/main\/index\.js'\]/);
  assert.match(script, /node_modules\/\.ignored\/electron/);
  assert.match(script, /node_modules\/\.ignored_electron/);
  assert.match(script, /path\.join\(packageDir, 'path\.txt'\)/);
  assert.match(script, /resolveElectronCommand/);
  assert.match(script, /fs\.readFileSync\(pathFile, 'utf8'\)\.trim\(\)/);
  assert.match(script, /path\.join\(packageDir, 'dist', executableRelativePath\)/);
  assert.match(script, /electronCommand\.command/);
  assert.match(script, /allowRequestedSignalInterruption/);
  assert.match(script, /allowRequestedSignalInterruption && requestedSignal && \(signal \|\| code === 1\)/);
  assert.match(script, /isCleaningUp/);
  assert.match(script, /if \(activeChild && !isCleaningUp\)/);
  assert.match(script, /restoreHiddenBackup/);
  assert.match(script, /runNodeNativeRebuild/);
});

test('node rebuild wrapper uses workspace-local caches and can restore a hidden better-sqlite3 backup', () => {
  const script = readWorkspaceFile('scripts/run-node-native-rebuild.mjs');

  assert.match(script, /npm_config_cache/);
  assert.match(script, /npm_config_devdir/);
  assert.match(script, /\.ignored_better-sqlite3\/build\/Release\/better_sqlite3\.node/);
  assert.match(script, /\.ignored\/better-sqlite3\/build\/Release\/better_sqlite3\.node/);
  assert.ok(
    script.indexOf(".ignored_better-sqlite3/build/Release/better_sqlite3.node")
      < script.indexOf(".ignored/better-sqlite3/build/Release/better_sqlite3.node"),
  );
  assert.match(script, /copyFileSync/);
});
