import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const workspaceRoot = process.cwd();
const backupCandidates = [
  path.resolve(workspaceRoot, 'node_modules/.ignored_better-sqlite3/build/Release/better_sqlite3.node'),
  path.resolve(workspaceRoot, 'node_modules/.ignored/better-sqlite3/build/Release/better_sqlite3.node'),
];
const cacheRoot = path.join(os.tmpdir(), 'learning-companion-native-rebuild');
const npmCacheDir = path.join(cacheRoot, 'npm-cache');
const nodeGypDir = path.join(cacheRoot, 'node-gyp');
const targetBinaryPath = path.resolve(workspaceRoot, 'node_modules/better-sqlite3/build/Release/better_sqlite3.node');

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(
        signal
          ? `${command} ${args.join(' ')} exited with signal ${signal}`
          : `${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`,
      ));
    });
  });
}

export function restoreHiddenBackup() {
  for (const candidate of backupCandidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    fs.mkdirSync(path.dirname(targetBinaryPath), { recursive: true });
    fs.copyFileSync(candidate, targetBinaryPath);
    return candidate;
  }

  return null;
}

export async function runNodeNativeRebuild() {
  fs.mkdirSync(npmCacheDir, { recursive: true });
  fs.mkdirSync(nodeGypDir, { recursive: true });

  try {
    await run(
      npmCommand,
      ['rebuild', 'better-sqlite3'],
      {
        ...process.env,
        npm_config_cache: npmCacheDir,
        npm_config_devdir: nodeGypDir,
      },
    );
  } catch (error) {
    const restoredFrom = restoreHiddenBackup();

    if (!restoredFrom) {
      throw error;
    }

    console.warn(`npm rebuild better-sqlite3 failed; restored hidden backup from ${restoredFrom}`);
  }
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  runNodeNativeRebuild().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
