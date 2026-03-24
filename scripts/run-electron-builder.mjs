import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { backupCurrentBinary, restoreHiddenBackup } from './run-node-native-rebuild.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const builderArgs = process.argv.slice(2);

function validateRendererBuildForFileProtocol() {
  const distIndexHtmlPath = path.resolve(process.cwd(), 'dist/index.html');
  const indexHtml = fs.readFileSync(distIndexHtmlPath, 'utf8');
  const rootRelativeAssetPattern = /(?:src|href)=["']\/assets\//;

  if (rootRelativeAssetPattern.test(indexHtml)) {
    throw new Error(
      `Renderer build at ${distIndexHtmlPath} contains root-relative /assets/ references. Electron production loads index.html via file://, so bundled assets must use relative ./assets/ URLs.`,
    );
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
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

async function main() {
  let electronRuntimePrepared = false;
  let builderError = null;

  await run(npmCommand, ['run', 'build']);
  validateRendererBuildForFileProtocol();
  backupCurrentBinary();
  await run(npmCommand, ['run', 'rebuild:native:electron']);
  electronRuntimePrepared = true;

  try {
    await run(npmCommand, ['exec', 'electron-builder', '--', ...builderArgs]);
  } catch (error) {
    builderError = error;
  } finally {
    if (electronRuntimePrepared) {
      if (!restoreHiddenBackup()) {
        try {
          await run(npmCommand, ['run', 'rebuild:native:node']);
        } catch (restoreError) {
          if (!builderError) {
            throw restoreError;
          }

          console.error('failed to restore better-sqlite3 back to the Node runtime after electron-builder:');
          console.error(restoreError);
        }
      }
    }
  }

  if (builderError) {
    throw builderError;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
