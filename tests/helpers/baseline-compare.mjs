import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const baselineDir = path.join(rootDir, "tests", "baselines");

/**
 * Load baseline data for a specific fixture
 */
export async function loadBaseline(fixtureId) {
  const baselinePath = path.join(baselineDir, `${fixtureId}.json`);
  try {
    const text = await fs.readFile(baselinePath, "utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Save baseline data for a specific fixture
 */
export async function saveBaseline(fixtureId, data) {
  await fs.mkdir(baselineDir, { recursive: true });
  const baselinePath = path.join(baselineDir, `${fixtureId}.json`);
  await fs.writeFile(baselinePath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Compare current result against baseline
 */
export function compareWithBaseline(current, baseline, options = {}) {
  const { tolerance = 0 } = options;
  const differences = [];

  if (!baseline) {
    return { matched: false, differences: ["No baseline found"] };
  }

  // Compare matrix
  if (JSON.stringify(current.matrix) !== JSON.stringify(baseline.matrix)) {
    differences.push("Matrix differs from baseline");
  }

  // Compare status
  if (current.status !== baseline.status) {
    differences.push(`Status differs: expected ${baseline.status}, got ${current.status}`);
  }

  // Compare board usability
  if (current.diagnostics?.boardUsable !== baseline.diagnostics?.boardUsable) {
    differences.push("Board usability differs from baseline");
  }

  // Compare estimated cell count with tolerance
  const currentCellCount = current.diagnostics?.estimatedCellCount || 0;
  const baselineCellCount = baseline.diagnostics?.estimatedCellCount || 0;
  if (Math.abs(currentCellCount - baselineCellCount) > tolerance) {
    differences.push(`Estimated cell count differs: expected ${baselineCellCount}, got ${currentCellCount}`);
  }

  return {
    matched: differences.length === 0,
    differences
  };
}

/**
 * List all available baselines
 */
export async function listBaselines() {
  try {
    const files = await fs.readdir(baselineDir);
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Clear a specific baseline
 */
export async function clearBaseline(fixtureId) {
  const baselinePath = path.join(baselineDir, `${fixtureId}.json`);
  try {
    await fs.unlink(baselinePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
