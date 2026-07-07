import fs from 'node:fs/promises';
import path from 'node:path';
import {
  appendFailureLog,
  dataDir,
  discoverArchiveUrl,
  downloadFile,
  ensureDatasetLayout,
  extractArchive,
  failedDownloadsLogPath,
  logStep,
  pathExists,
  rawDir,
  runCommand,
  sourceConfigs,
} from './dataset-utils.js';

await ensureDatasetLayout();
await fs.writeFile(failedDownloadsLogPath, '', 'utf8');

const results = [];

for (const source of sourceConfigs) {
  if (source.mode === 'git') {
    results.push(await downloadGitDataset(source));
    continue;
  }

  results.push(await downloadArchiveDataset(source));
}

logStep('download summary');
for (const result of results) {
  console.log(JSON.stringify(result));
}

async function downloadGitDataset(source) {
  const destinationDir = path.join(rawDir, source.key);

  try {
    if (await pathExists(path.join(destinationDir, '.git'))) {
      logStep(`updating ${source.key}`);
      await runCommand('git', ['-C', destinationDir, 'pull', '--ff-only']);
      return { source: source.key, status: 'updated', location: destinationDir };
    }

    if (await pathExists(destinationDir)) {
      const existingEntries = await fs.readdir(destinationDir);
      if (existingEntries.length > 0) {
        logStep(`reusing existing ${source.key} directory without .git metadata`);
        return { source: source.key, status: 'reused', location: destinationDir };
      }

      await fs.rm(destinationDir, { recursive: true, force: true });
    }

    logStep(`cloning ${source.url}`);
    await runCommand('git', ['clone', '--depth', '1', source.url, destinationDir]);
    return { source: source.key, status: 'downloaded', location: destinationDir };
  } catch (error) {
    const message = error.stderr?.trim() || error.message;
    await appendFailureLog(source.key, message);
    return { source: source.key, status: 'failed', reason: message };
  }
}

async function downloadArchiveDataset(source) {
  const destinationDir = path.join(rawDir, source.key);

  try {
    const archiveUrl = await discoverArchiveUrl(source);
    if (!archiveUrl) {
      const message = `skipped: no public direct download URL found on ${source.pageUrl}`;
      await appendFailureLog(source.key, message);
      return { source: source.key, status: 'skipped', reason: message };
    }

    logStep(`downloading ${source.key} from ${archiveUrl}`);
    const archiveName = archiveUrl.split('/').pop()?.split('?')[0] || `${source.key}.archive`;
    const archivePath = path.join(dataDir, 'raw', `${source.key}-${archiveName}`);
    await downloadFile(archiveUrl, archivePath);
    await extractArchive(archivePath, destinationDir);
    return { source: source.key, status: 'downloaded', location: destinationDir, archiveUrl };
  } catch (error) {
    const message = error.message;
    await appendFailureLog(source.key, message);
    return { source: source.key, status: 'failed', reason: message };
  }
}
