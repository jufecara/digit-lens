import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const suitePath = path.join(rootDir, "tests", "fixtures", "acceptance-suite.json");

export async function loadAcceptanceSuite() {
  const text = await fs.readFile(suitePath, "utf8");
  return JSON.parse(text);
}

export function getAcceptanceSuitePath() {
  return suitePath;
}
