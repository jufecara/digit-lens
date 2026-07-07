import path from 'node:path';
import { Jimp } from 'jimp';
import {
  boardsDir,
  fileHash,
  hardCaseTypes,
  hardCasesDir,
  imageIdForHash,
  imageSize,
  linkOrCopy,
  logStep,
  readJimpImage,
  readMetadata,
  resetDirectoryContents,
  writeJpeg,
  writeMetadata,
} from './dataset-utils.js';

const sourceEntries = (await readMetadata()).filter(
  entry => entry.category === 'real' || entry.category === 'clean'
);
const existingEntries = await readMetadata();
const baseEntries = existingEntries.filter(entry => entry.category !== 'augmented');
const augmentedDir = path.join(boardsDir, 'augmented');

await resetDirectoryContents(augmentedDir);
for (const hardCase of hardCaseTypes) {
  await resetDirectoryContents(path.join(hardCasesDir, hardCase));
}

const augmentedEntries = [];

for (const entry of sourceEntries) {
  const absoluteInput = path.join(process.cwd(), entry.processedPath);
  let image;
  try {
    image = await readJimpImage(absoluteInput);
  } catch (error) {
    logStep(`skipping unreadable image ${entry.imageId}: ${error.message}`);
    continue;
  }

  for (const type of hardCaseTypes) {
    const transformed = await createAugmentation(image, type);
    const outputFileName = `${entry.imageId}--${type}.jpg`;
    const outputPath = path.join(augmentedDir, outputFileName);
    const hardCasePath = path.join(hardCasesDir, type, outputFileName);

    await writeJpeg(transformed, outputPath, type === 'jpeg_compression' ? 35 : 82);
    await linkOrCopy(outputPath, hardCasePath);

    const size = await imageSize(outputPath);
    const hash = await fileHash(outputPath);
    const imageId = imageIdForHash(`${entry.sourceDataset}-${type}`, hash);

    augmentedEntries.push({
      imageId,
      sourceDataset: entry.sourceDataset,
      originalPath: entry.originalPath,
      processedPath: path.relative(process.cwd(), outputPath),
      category: 'augmented',
      augmentationType: type,
      width: size.width,
      height: size.height,
      fileHash: hash,
      originalImageId: entry.originalImageId,
      split: null,
    });
  }
}

await writeMetadata([...baseEntries, ...augmentedEntries]);
logStep(`generated ${augmentedEntries.length} augmented images`);

async function createAugmentation(image, type) {
  const clone = image.clone();
  switch (type) {
    case 'blur':
      return clone.blur(4);
    case 'low_light':
      return clone.brightness(-0.45).contrast(-0.15);
    case 'glare':
      return applyGlare(clone);
    case 'shadows':
      return applyShadowBand(clone);
    case 'perspective':
      return clone
        .rotate(6)
        .crop({
          x: 20,
          y: 20,
          w: Math.max(1, clone.bitmap.width - 40),
          h: Math.max(1, clone.bitmap.height - 40),
        })
        .contain({ w: image.bitmap.width, h: image.bitmap.height });
    case 'cropped':
      return clone
        .crop({
          x: Math.floor(clone.bitmap.width * 0.06),
          y: Math.floor(clone.bitmap.height * 0.06),
          w: Math.max(1, Math.floor(clone.bitmap.width * 0.88)),
          h: Math.max(1, Math.floor(clone.bitmap.height * 0.88)),
        })
        .contain({ w: image.bitmap.width, h: image.bitmap.height });
    case 'noisy':
      return applyNoise(clone, 18);
    case 'low_contrast':
      return clone.contrast(-0.4).brightness(0.06);
    case 'jpeg_compression':
      return clone;
    default:
      return clone;
  }
}

function applyGlare(image) {
  const centerX = Math.floor(image.bitmap.width * 0.68);
  const centerY = Math.floor(image.bitmap.height * 0.28);
  const radius = Math.max(24, Math.floor(Math.min(image.bitmap.width, image.bitmap.height) * 0.18));
  image.scan((x, y, idx) => {
    const distance = Math.hypot(x - centerX, y - centerY);
    if (distance > radius) {
      return;
    }
    const boost = Math.max(0, 1 - distance / radius) * 120;
    image.bitmap.data[idx] = clamp(image.bitmap.data[idx] + boost);
    image.bitmap.data[idx + 1] = clamp(image.bitmap.data[idx + 1] + boost);
    image.bitmap.data[idx + 2] = clamp(image.bitmap.data[idx + 2] + boost);
  });
  return image;
}

function applyShadowBand(image) {
  const startX = Math.floor(image.bitmap.width * 0.2);
  const endX = Math.floor(image.bitmap.width * 0.7);
  image.scan((x, _y, idx) => {
    if (x < startX || x > endX) {
      return;
    }
    image.bitmap.data[idx] = clamp(image.bitmap.data[idx] * 0.65);
    image.bitmap.data[idx + 1] = clamp(image.bitmap.data[idx + 1] * 0.65);
    image.bitmap.data[idx + 2] = clamp(image.bitmap.data[idx + 2] * 0.65);
  });
  return image;
}

function applyNoise(image, amount) {
  image.scan((_x, _y, idx) => {
    image.bitmap.data[idx] = clamp(image.bitmap.data[idx] + jitter(amount, idx));
    image.bitmap.data[idx + 1] = clamp(image.bitmap.data[idx + 1] + jitter(amount, idx + 1));
    image.bitmap.data[idx + 2] = clamp(image.bitmap.data[idx + 2] + jitter(amount, idx + 2));
  });
  return image;
}

function jitter(amount, seed) {
  const wave = Math.sin(seed * 12.9898) * 43758.5453;
  return ((wave - Math.floor(wave)) * 2 - 1) * amount;
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
