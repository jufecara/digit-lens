import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const suitePath = path.join(__dirname, "..", "fixtures", "acceptance-suite.json");

export async function loadAcceptanceSuite() {
  const text = await fs.readFile(suitePath, "utf8");
  return JSON.parse(text);
}

export function getAcceptanceSuitePath() {
  return suitePath;
}
