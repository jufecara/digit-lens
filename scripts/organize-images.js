import path from "node:path";
import {
  boardsDir,
  classifyBoardUsage,
  classifySource,
  ensureDatasetLayout,
  fileHash,
  handwrittenCandidatesDir,
  imageIdForHash,
  imageSize,
  isImageFile,
  linkOrCopy,
  logStep,
  rawDir,
  resetDirectoryContents,
  shouldIncludeBoardImage,
  walkFiles,
  writeMetadata
} from "./dataset-utils.js";

await ensureDatasetLayout();
await resetDirectoryContents(path.join(boardsDir, "real"));
await resetDirectoryContents(path.join(boardsDir, "clean"));
await resetDirectoryContents(handwrittenCandidatesDir);
const rawFiles = await walkFiles(rawDir);
const byHash = new Map();
const organizedEntries = [];
let skippedNonBoard = 0;
let skippedUnreadable = 0;
let deferredFilledCandidates = 0;

for (const filePath of rawFiles) {
  if (!isImageFile(filePath)) {
    continue;
  }

  const fileSha = await fileHash(filePath);
  if (byHash.has(fileSha)) {
    continue;
  }
  byHash.set(fileSha, true);

  const { sourceDataset, category } = classifySource(filePath);
  const usageInfo = await classifyBoardUsage(filePath);
  const imageId = imageIdForHash(sourceDataset, fileSha);
  const extension = path.extname(filePath).toLowerCase() || ".jpg";
  let size;
  try {
    size = await imageSize(filePath);
  } catch {
    skippedUnreadable += 1;
    continue;
  }

  if (!shouldIncludeBoardImage(filePath, size)) {
    skippedNonBoard += 1;
    continue;
  }

  const processedPath =
    usageInfo.usage === "deferred"
      ? path.join(handwrittenCandidatesDir, `${imageId}${extension}`)
      : path.join(boardsDir, category, `${imageId}${extension}`);
  await linkOrCopy(filePath, processedPath);

  if (usageInfo.usage === "deferred") {
    deferredFilledCandidates += 1;
  }

  organizedEntries.push({
    imageId,
    sourceDataset,
    originalPath: path.relative(process.cwd(), filePath),
    processedPath: path.relative(process.cwd(), processedPath),
    category,
    augmentationType: null,
    width: size.width,
    height: size.height,
    fileHash: fileSha,
    originalImageId: imageId,
    split: null,
    usage: usageInfo.usage,
    boardFillType: usageInfo.boardFillType,
    deferredReason: usageInfo.deferredReason
  });
}

await writeMetadata(organizedEntries);
logStep(
  `organized ${organizedEntries.length} board images, deferred ${deferredFilledCandidates} filled candidates, skipped ${skippedNonBoard} non-board images and ${skippedUnreadable} unreadable files`
);
