import { spawn } from 'node:child_process';

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

await runNode(['node_modules/vite/bin/vite.js', 'build']);
await runNode([
  'node_modules/typescript/bin/tsc',
  '-p',
  'tsconfig.build.json',
  '--emitDeclarationOnly',
]);
await runNode(['--test', ...selectedFiles]);

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
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
