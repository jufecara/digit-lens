import { runCommand, datasetSummaryPath, logStep } from "./dataset-utils.js";
import fs from "node:fs/promises";

const steps = [
  { name: "download", script: "scripts/download-datasets.js" },
  { name: "organize", script: "scripts/organize-images.js" },
  { name: "split", script: "scripts/create-splits.js" }
];

for (const step of steps) {
  logStep(`running ${step.name}`);
  await runCommand("node", [step.script], { stdio: "inherit" });
}

const summary = JSON.parse(await fs.readFile(datasetSummaryPath, "utf8"));
logStep("final summary");
console.log(JSON.stringify(summary, null, 2));
logStep("augmentation is intentionally excluded from the default build; run dataset:build:stage2 when you want the future robustness pass");
