import { spawn } from 'node:child_process';
import { restoreHiddenBackup, runNodeNativeRebuild } from './run-node-native-rebuild.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const signalExitCodes = {
  SIGINT: 130,
  SIGTERM: 143,
};

let requestedSignal = null;
let activeChild = null;
let isCleaningUp = false;

function forwardSignal(signal) {
  requestedSignal = signal;
  if (activeChild && !isCleaningUp) {
    activeChild.kill(signal);
  }
}

process.on('SIGINT', () => {
  forwardSignal('SIGINT');
});

process.on('SIGTERM', () => {
  forwardSignal('SIGTERM');
});

function run(command, args, options = {}) {
  const { allowRequestedSignalInterruption = false } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
    });

    activeChild = child;

    child.on('error', (error) => {
      if (activeChild === child) {
        activeChild = null;
      }

      reject(error);
    });

    child.on('exit', (code, signal) => {
      if (activeChild === child) {
        activeChild = null;
      }

      if (allowRequestedSignalInterruption && requestedSignal && (signal || code === 1)) {
        resolve();
        return;
      }

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
  let launchError = null;

  await run(npmCommand, ['run', 'rebuild:native:electron']);

  try {
    await run(
      npmCommand,
      ['exec', 'wait-on', '--', 'tcp:5173', 'dist-electron/src/main/index.js'],
      { allowRequestedSignalInterruption: true },
    );
    await run(
      npmCommand,
      ['exec', 'electron', '--', '.'],
      { allowRequestedSignalInterruption: true },
    );
  } catch (error) {
    launchError = error;
  } finally {
    isCleaningUp = true;
    if (!restoreHiddenBackup()) {
      await runNodeNativeRebuild();
    }
    isCleaningUp = false;
  }

  if (launchError) {
    throw launchError;
  }

  if (requestedSignal) {
    process.exitCode = signalExitCodes[requestedSignal] ?? 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
