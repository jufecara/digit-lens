import { loadAcceptanceSuite } from '../tests/helpers/load-acceptance-suite.mjs';
import { runTestWithMetrics } from '../tests/helpers/quality-metrics.mjs';
import { measurePerformance } from '../tests/helpers/performance-measure.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Running performance analysis on acceptance suite...\n');
  
  const suite = await loadAcceptanceSuite();
  const fixtureRoot = path.join(__dirname, '..', 'tests', 'fixtures');
  
  // Import scanSudoku from built dist
  const distEntryUrl = path.join(__dirname, '..', 'dist', 'digit-lens.js');
  const { scanSudoku } = await import(distEntryUrl);
  
  const results = [];
  
  for (const tier of ['smoke', 'core', 'hard']) {
    const fixtures = suite.tiers[tier] || [];
    console.log(`\n=== ${tier.toUpperCase()} TIER ===`);
    
    for (const fixture of fixtures) {
      const imagePath = path.join(fixtureRoot, fixture.imagePath);
      const imageBuffer = await import('node:fs/promises').then(fs => fs.readFile(imagePath));
      
      const perf = await measurePerformance(async () => {
        return await scanSudoku(new Uint8Array(imageBuffer));
      });
      
      results.push({
        fixtureId: fixture.id,
        tier,
        durationMs: perf.durationMs,
        memoryDeltaBytes: perf.memoryDelta.heapUsed,
        memoryAfterBytes: perf.memoryAfter.heapUsed,
        status: perf.result.status,
        boardDetected: perf.result.diagnostics.boardDetected,
        boardUsable: perf.result.diagnostics.boardUsable,
        estimatedCellCount: perf.result.diagnostics.estimatedCellCount
      });
      
      console.log(`${fixture.id}:`);
      console.log(`  Duration: ${perf.durationMs.toFixed(2)}ms`);
      console.log(`  Memory delta: ${(perf.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Status: ${perf.result.status}`);
      console.log(`  Board detected: ${perf.result.diagnostics.boardDetected}`);
      console.log(`  Board usable: ${perf.result.diagnostics.boardUsable}`);
    }
  }
  
  // Summary analysis
  console.log('\n=== PERFORMANCE SUMMARY ===');
  
  const byTier = { smoke: [], core: [], hard: [] };
  for (const r of results) {
    byTier[r.tier].push(r);
  }
  
  for (const tier of ['smoke', 'core', 'hard']) {
    const tierResults = byTier[tier];
    if (tierResults.length === 0) continue;
    
    const avgDuration = tierResults.reduce((sum, r) => sum + r.durationMs, 0) / tierResults.length;
    const maxDuration = Math.max(...tierResults.map(r => r.durationMs));
    const minDuration = Math.min(...tierResults.map(r => r.durationMs));
    const avgMemory = tierResults.reduce((sum, r) => sum + r.memoryDeltaBytes, 0) / tierResults.length;
    
    console.log(`\n${tier.toUpperCase()} tier:`);
    console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min duration: ${minDuration.toFixed(2)}ms`);
    console.log(`  Max duration: ${maxDuration.toFixed(2)}ms`);
    console.log(`  Average memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
    
    // Find slowest fixtures
    const sorted = [...tierResults].sort((a, b) => b.durationMs - a.durationMs);
    console.log(`  Slowest: ${sorted[0].fixtureId} (${sorted[0].durationMs.toFixed(2)}ms)`);
  }
  
  // Overall summary
  const allDuration = results.map(r => r.durationMs);
  const avgDuration = allDuration.reduce((sum, d) => sum + d, 0) / allDuration.length;
  const maxDuration = Math.max(...allDuration);
  const minDuration = Math.min(...allDuration);
  
  console.log(`\nOVERALL:`);
  console.log(`  Total fixtures: ${results.length}`);
  console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Min duration: ${minDuration.toFixed(2)}ms`);
  console.log(`  Max duration: ${maxDuration.toFixed(2)}ms`);
  
  // Identify potential bottlenecks (fixtures > 2x average)
  const slowFixtures = results.filter(r => r.durationMs > avgDuration * 2);
  if (slowFixtures.length > 0) {
    console.log(`\nPOTENTIAL BOTTLENECKS (> 2x average):`);
    for (const f of slowFixtures) {
      console.log(`  ${f.fixtureId}: ${f.durationMs.toFixed(2)}ms (${(f.durationMs / avgDuration).toFixed(1)}x avg)`);
    }
  }
}

main().catch(error => {
  console.error('Performance analysis failed:', error);
  process.exit(1);
});
