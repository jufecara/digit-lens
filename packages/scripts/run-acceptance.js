import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const digitLensDir = join(__dirname, '../core');

const tier = process.argv[2] ?? 'blocking';

const TEST_FILES = {
  contract: ['tests/api-contract.test.mjs'],
  smoke: ['tests/acceptance-manifest.test.mjs', 'tests/smoke-acceptance-suite.test.mjs'],
  core: ['tests/acceptance-manifest.test.mjs', 'tests/core-acceptance-suite.test.mjs'],
  blocking: [
    'tests/acceptance-manifest.test.mjs',
    'tests/smoke-acceptance-suite.test.mjs',
    'tests/core-acceptance-suite.test.mjs',
    'tests/api-contract.test.mjs',
  ],
  hard: ['tests/hard-acceptance-suite.test.mjs'],
  all: [
    'tests/acceptance-manifest.test.mjs',
    'tests/smoke-acceptance-suite.test.mjs',
    'tests/core-acceptance-suite.test.mjs',
    'tests/api-contract.test.mjs',
    'tests/hard-acceptance-suite.test.mjs',
  ],
};

const selectedFiles = TEST_FILES[tier];

if (!selectedFiles) {
  console.error(
    `Unknown acceptance tier "${tier}". Use one of: ${Object.keys(TEST_FILES).join(', ')}`
  );
  process.exit(1);
}

await runCommand('npm', ['run', 'build'], { cwd: digitLensDir });
await runNode(['--test', ...selectedFiles.map(f => join(digitLensDir, f))], { cwd: digitLensDir });

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: process.env,
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
    });
  });
}

function runNode(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: options.cwd || process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${process.execPath} ${args.join(' ')}`));
    });
  });
}
