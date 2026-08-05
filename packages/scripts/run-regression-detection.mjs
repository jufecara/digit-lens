import { runRegressionDetection, formatRegressionSummary } from '../core/tests/helpers/regression-detection.mjs';
import { loadAcceptanceSuite, getAcceptanceSuitePath } from '../core/tests/helpers/load-acceptance-suite.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Running regression detection...\n');

  const suite = await loadAcceptanceSuite();
  const suitePath = getAcceptanceSuitePath();
  const fixtureRoot = path.dirname(suitePath);

  // Import scanSudoku from built dist
  const distEntryUrl = path.join(__dirname, '..', 'core', 'dist', 'digit-lens.js');
  const { scanSudoku } = await import(distEntryUrl);
  
  const report = await runRegressionDetection(suite, fixtureRoot, scanSudoku);
  const summary = formatRegressionSummary(report);
  
  console.log(summary);
  
  // Exit with error code if regressions detected
  if (report.summary.withRegressions > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Regression detection failed:', error);
  process.exit(1);
});
