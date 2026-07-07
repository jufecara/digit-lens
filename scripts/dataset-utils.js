import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Jimp } from 'jimp';

export const rootDir = process.cwd();
export const dataDir = path.join(rootDir, 'data');
export const rawDir = path.join(dataDir, 'raw');
export const processedDir = path.join(dataDir, 'processed');
export const boardsDir = path.join(processedDir, 'boards');
export const hardCasesDir = path.join(boardsDir, 'hard_cases');
export const deferredBoardsDir = path.join(boardsDir, 'deferred');
export const handwrittenCandidatesDir = path.join(deferredBoardsDir, 'handwritten_candidates');
export const splitsDir = path.join(dataDir, 'splits');
export const metadataDir = path.join(dataDir, 'metadata');
export const datasetIndexJsonPath = path.join(metadataDir, 'dataset_index.json');
export const datasetIndexCsvPath = path.join(metadataDir, 'dataset_index.csv');
export const datasetSummaryPath = path.join(metadataDir, 'dataset_summary.json');
export const failedDownloadsLogPath = path.join(metadataDir, 'failed_downloads.log');

export const sourceConfigs = [
  {
    key: 'jeffreywolberg',
    category: 'real',
    mode: 'git',
    url: 'https://github.com/jeffreywolberg/sudoku_dataset.git',
    excludePathPatterns: ['/digit_images/', '/datasets/', '/tools/', '/.git/'],
    minimumBoardDimension: 128,
  },
  {
    key: 'figshare_newcastle',
    category: 'clean',
    mode: 'discover-archive',
    pageUrl: 'https://doi.org/10.25405/data.ncl.26976121.v1',
    minimumBoardDimension: 128,
    patterns: [
      /https?:\/\/[^"'\\s>]+(?:download|zip|tar\.gz|tgz|tar\.bz2|npy)(?:\?[^"'\\s>]*)?/gi,
      /\/articles\/dataset\/Sudoku_Dataset\/26976121\/\d+/gi,
    ],
  },
];

const sourceCategories = [...new Set(sourceConfigs.map(source => source.category).filter(Boolean))];

export const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.webp']);
export const hardCaseTypes = [
  'blur',
  'low_light',
  'glare',
  'shadows',
  'perspective',
  'cropped',
  'noisy',
  'low_contrast',
  'jpeg_compression',
];

export async function ensureDatasetLayout() {
  const directories = [
    ...sourceConfigs.map(source => path.join(rawDir, source.key)),
    ...sourceCategories.map(category => path.join(boardsDir, category)),
    path.join(boardsDir, 'augmented'),
    hardCasesDir,
    deferredBoardsDir,
    handwrittenCandidatesDir,
    path.join(splitsDir, 'train'),
    path.join(splitsDir, 'val'),
    path.join(splitsDir, 'test'),
    metadataDir,
  ];

  for (const name of hardCaseTypes) {
    directories.push(path.join(hardCasesDir, name));
  }

  for (const directory of directories) {
    await fs.mkdir(directory, { recursive: true });
  }

  await ensureFile(datasetIndexJsonPath, '[]\n');
  await ensureFile(datasetIndexCsvPath, '');
  await ensureFile(datasetSummaryPath, '{}\n');
  await ensureFile(failedDownloadsLogPath, '');
}

export async function ensureFile(filePath, content) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, content, 'utf8');
  }
}

export function logStep(message) {
  console.log(`[dataset] ${message}`);
}

export async function appendFailureLog(source, message) {
  await ensureDatasetLayout();
  const line = `[${new Date().toISOString()}] ${source}: ${message}\n`;
  await fs.appendFile(failedDownloadsLogPath, line, 'utf8');
}

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: options.stdio ?? 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', chunk => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', chunk => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
        return;
      }

      const error = new Error(`${command} ${args.join(' ')} failed with exit code ${code}`);
      error.stdout = stdout;
      error.stderr = stderr;
      error.code = code;
      reject(error);
    });
  });
}

export async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'digit-lens-dataset-prep',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

export async function discoverArchiveUrl(sourceConfig) {
  const html = await fetchText(sourceConfig.pageUrl);
  const matches = new Set();

  for (const pattern of sourceConfig.patterns ?? []) {
    for (const found of html.match(pattern) ?? []) {
      matches.add(toAbsoluteUrl(sourceConfig.pageUrl, found));
    }
  }

  const candidates = Array.from(matches).filter(candidate => {
    if (candidate.includes('login') || candidate.includes('signin')) {
      return false;
    }
    return (
      /\.(zip|tar\.bz2|tar\.gz|tgz|npy)(?:$|\?)/i.test(candidate) ||
      /\/download(?:$|\?)/i.test(candidate)
    );
  });

  return candidates[0] ?? null;
}

export async function downloadFile(url, destinationPath) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'digit-lens-dataset-prep',
    },
    redirect: 'follow',
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  const chunks = [];
  for await (const chunk of response.body) {
    chunks.push(chunk);
  }
  await fs.writeFile(destinationPath, Buffer.concat(chunks));
}

export async function extractArchive(archivePath, destinationDir) {
  await fs.mkdir(destinationDir, { recursive: true });
  if (archivePath.endsWith('.zip')) {
    await runCommand('unzip', ['-o', archivePath, '-d', destinationDir]);
    return;
  }

  if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
    await runCommand('tar', ['-xzf', archivePath, '-C', destinationDir]);
    return;
  }

  if (archivePath.endsWith('.tar.bz2')) {
    await runCommand('tar', ['-xjf', archivePath, '-C', destinationDir]);
    return;
  }

  throw new Error(`Unsupported archive type for ${archivePath}`);
}

export function toAbsoluteUrl(baseUrl, candidate) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return candidate;
  }
}

export async function walkFiles(rootPath) {
  const results = [];

  async function walk(currentPath) {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const nextPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(nextPath);
      } else if (entry.isFile()) {
        results.push(nextPath);
      }
    }
  }

  await walk(rootPath);
  return results.sort();
}

export function isImageFile(filePath) {
  return imageExtensions.has(path.extname(filePath).toLowerCase());
}

export async function fileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

export async function imageSize(filePath) {
  const image = await readJimpImage(filePath);
  return {
    width: image.bitmap.width,
    height: image.bitmap.height,
  };
}

export async function readJimpImage(filePath) {
  const buffer = await fs.readFile(filePath);
  return Jimp.read(buffer);
}

export function imageIdForHash(prefix, hash) {
  return `${prefix}-${hash.slice(0, 12)}`;
}

export async function writeMetadata(entries) {
  const sorted = [...entries].sort((a, b) => a.imageId.localeCompare(b.imageId));
  await fs.writeFile(datasetIndexJsonPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  await fs.writeFile(datasetIndexCsvPath, toCsv(sorted), 'utf8');
  await fs.writeFile(
    datasetSummaryPath,
    `${JSON.stringify(buildSummary(sorted), null, 2)}\n`,
    'utf8'
  );
}

export async function readMetadata() {
  try {
    return JSON.parse(await fs.readFile(datasetIndexJsonPath, 'utf8'));
  } catch {
    return [];
  }
}

export function buildSummary(entries) {
  const summary = {
    totalImages: entries.length,
    bySourceDataset: {},
    byCategory: {},
    byAugmentationType: {},
    bySplit: {},
    byUsage: {},
    byBoardFillType: {},
  };

  for (const entry of entries) {
    increment(summary.bySourceDataset, entry.sourceDataset || 'unknown');
    increment(summary.byCategory, entry.category || 'unknown');
    increment(summary.byAugmentationType, entry.augmentationType || 'none');
    increment(summary.bySplit, entry.split || 'unassigned');
    increment(summary.byUsage, entry.usage || 'active');
    increment(summary.byBoardFillType, entry.boardFillType || 'unknown');
  }

  return summary;
}

export function increment(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

export function toCsv(entries) {
  const headers = [
    'imageId',
    'sourceDataset',
    'originalPath',
    'processedPath',
    'category',
    'augmentationType',
    'width',
    'height',
    'fileHash',
    'originalImageId',
    'split',
    'usage',
    'boardFillType',
    'deferredReason',
  ];
  const rows = [headers.join(',')];
  for (const entry of entries) {
    rows.push(headers.map(header => csvEscape(entry[header] ?? '')).join(','));
  }
  return `${rows.join('\n')}\n`;
}

export function csvEscape(value) {
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

export async function resetDirectoryContents(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
  const entries = await fs.readdir(directoryPath);
  for (const entry of entries) {
    await fs.rm(path.join(directoryPath, entry), { recursive: true, force: true });
  }
}

export async function linkOrCopy(sourcePath, destinationPath) {
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  try {
    await fs.rm(destinationPath, { force: true });
    await fs.symlink(sourcePath, destinationPath);
  } catch {
    await fs.copyFile(sourcePath, destinationPath);
  }
}

export function classifySource(filePath) {
  const normalized = filePath.split(path.sep).join('/');

  for (const source of sourceConfigs) {
    if (normalized.includes(`/${source.key}/`)) {
      return {
        sourceDataset: source.key,
        category: source.category ?? 'clean',
      };
    }
  }

  return { sourceDataset: 'unknown', category: 'clean' };
}

export function getSourceConfigForPath(filePath) {
  const normalized = filePath.split(path.sep).join('/');
  return sourceConfigs.find(source => normalized.includes(`/${source.key}/`)) ?? null;
}

export function shouldIncludeBoardImage(filePath, size) {
  const normalized = filePath.split(path.sep).join('/');
  const sourceConfig = getSourceConfigForPath(filePath);

  if (sourceConfig?.excludePathPatterns?.some(pattern => normalized.includes(pattern))) {
    return false;
  }

  if (!size) {
    return false;
  }

  const minimumBoardDimension = sourceConfig?.minimumBoardDimension ?? 128;
  return size.width >= minimumBoardDimension && size.height >= minimumBoardDimension;
}

export function pairedDatPathForImage(filePath) {
  return filePath.replace(/\.(original\.)?(jpg|jpeg|png|bmp|webp)$/i, '.dat');
}

export async function classifyBoardUsage(filePath) {
  const datPath = pairedDatPathForImage(filePath);
  if (!(await pathExists(datPath))) {
    return {
      usage: 'active',
      boardFillType: 'unknown',
      deferredReason: null,
    };
  }

  const content = await fs.readFile(datPath, 'utf8');
  const values = content.match(/\d+/g)?.map(Number) ?? [];
  if (values.length < 81) {
    return {
      usage: 'active',
      boardFillType: 'unknown',
      deferredReason: null,
    };
  }

  const zeroCount = values.filter(value => value === 0).length;
  if (zeroCount === 0) {
    return {
      usage: 'deferred',
      boardFillType: 'filled',
      deferredReason: 'filled_or_handwritten_candidate',
    };
  }

  return {
    usage: 'active',
    boardFillType: 'clue',
    deferredReason: null,
  };
}

export function seededShuffle(items, seed) {
  const output = [...items];
  let state = numericSeed(seed);
  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (1664525 * state + 1013904223) % 4294967296;
    const swapIndex = state % (index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

export function numericSeed(seed) {
  const digest = crypto.createHash('sha1').update(String(seed)).digest();
  return digest.readUInt32BE(0);
}

export async function writeJpeg(image, destinationPath, quality = 90) {
  const buffer = await image.clone().getBuffer('image/jpeg', { quality });
  await fs.writeFile(destinationPath, buffer);
}

export async function writePng(image, destinationPath) {
  const buffer = await image.getBuffer('image/png');
  await fs.writeFile(destinationPath, buffer);
}
