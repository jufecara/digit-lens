import path from "node:path";
import {
  linkOrCopy,
  logStep,
  readMetadata,
  resetDirectoryContents,
  seededShuffle,
  splitsDir,
  writeMetadata
} from "./dataset-utils.js";

const entries = await readMetadata();
const activeEntries = entries.filter((entry) => entry.usage !== "deferred");
const grouped = groupByOriginal(activeEntries);
const groups = Array.from(grouped.values());

const realBaseGroups = groups.filter((group) => group.some((entry) => entry.category === "real" && !entry.augmentationType));
const otherGroups = groups.filter((group) => !realBaseGroups.includes(group));
const shuffledReal = seededShuffle(realBaseGroups, "digit-lens-real-groups");
const shuffledOther = seededShuffle(otherGroups, "digit-lens-other-groups");

const splitTargets = {
  train: Math.floor(groups.length * 0.7),
  val: Math.floor(groups.length * 0.15),
  test: groups.length - Math.floor(groups.length * 0.7) - Math.floor(groups.length * 0.15)
};

const assignments = new Map();

for (const splitName of ["test", "val", "train"]) {
  const queue = splitName === "test" ? shuffledReal : shuffledOther;
  while (countAssigned(assignments, splitName) < splitTargets[splitName] && queue.length > 0) {
    const group = queue.shift();
    assignments.set(group[0].originalImageId, splitName);
  }
}

for (const remaining of [...shuffledReal, ...shuffledOther]) {
  const nextSplit = pickNextSplit(assignments, splitTargets);
  assignments.set(remaining[0].originalImageId, nextSplit);
}

for (const splitName of ["train", "val", "test"]) {
  await resetDirectoryContents(path.join(splitsDir, splitName));
}

for (const entry of entries) {
  if (entry.usage === "deferred") {
    entry.split = null;
    continue;
  }
  const split = assignments.get(entry.originalImageId) ?? "train";
  entry.split = split;
  const absoluteSource = path.join(process.cwd(), entry.processedPath);
  const fileName = path.basename(entry.processedPath);
  const splitDestination = path.join(splitsDir, split, fileName);
  await linkOrCopy(absoluteSource, splitDestination);
}

await writeMetadata(entries);
logStep(`created splits for ${groups.length} original-image groups`);

function groupByOriginal(items) {
  const groups = new Map();
  for (const entry of items) {
    const key = entry.originalImageId || entry.imageId;
    const current = groups.get(key) ?? [];
    current.push(entry);
    groups.set(key, current);
  }
  return groups;
}

function countAssigned(assignments, splitName) {
  let total = 0;
  for (const value of assignments.values()) {
    if (value === splitName) {
      total += 1;
    }
  }
  return total;
}

function pickNextSplit(assignments, targets) {
  const counts = {
    train: countAssigned(assignments, "train"),
    val: countAssigned(assignments, "val"),
    test: countAssigned(assignments, "test")
  };
  const deficits = Object.entries(targets).map(([split, target]) => ({
    split,
    deficit: target - counts[split]
  }));
  deficits.sort((a, b) => b.deficit - a.deficit);
  return deficits[0].split;
}
