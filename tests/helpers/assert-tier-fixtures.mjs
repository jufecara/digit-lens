import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getAcceptanceSuitePath, loadAcceptanceSuite } from "./load-acceptance-suite.mjs";

const distEntryUrl = pathToFileURL(path.join(process.cwd(), "dist", "digit-lens.js")).href;

export async function assertTierFixtures(tier) {
  const mod = await import(distEntryUrl);
  const suite = await loadAcceptanceSuite();
  const fixtureRoot = path.dirname(getAcceptanceSuitePath());

  for (const fixture of suite.tiers[tier]) {
    const resolvedImagePath = path.join(fixtureRoot, fixture.imagePath);
    const bytes = new Uint8Array(await fs.readFile(resolvedImagePath));
    const result = await mod.scanSudoku(bytes);

    assert.equal(result.status, fixture.expectedStatus, fixture.id);
    assert.equal(result.diagnostics.boardDetected, fixture.expectedDiagnostics.boardDetected, fixture.id);
    assert.equal(result.diagnostics.boardUsable, fixture.expectedDiagnostics.boardUsable, fixture.id);
    if (Array.isArray(fixture.expectedDiagnostics.warnings)) {
      assert.deepEqual(result.diagnostics.warnings, fixture.expectedDiagnostics.warnings, fixture.id);
    }
    if (Array.isArray(fixture.expectedDiagnostics.issues)) {
      assert.deepEqual(result.diagnostics.issues, fixture.expectedDiagnostics.issues, fixture.id);
    }
    if (Object.hasOwn(fixture.expectedDiagnostics, "rotationDegrees")) {
      assert.equal(result.diagnostics.rotationDegrees, fixture.expectedDiagnostics.rotationDegrees, fixture.id);
    }
    if (Object.hasOwn(fixture.expectedDiagnostics, "estimatedCellCount")) {
      assert.equal(result.diagnostics.estimatedCellCount, fixture.expectedDiagnostics.estimatedCellCount, fixture.id);
    }
    assert.equal(result.validation.isStructurallyValid, fixture.expectedValidation.isStructurallyValid, fixture.id);
    assert.equal(result.validation.isSolvable, fixture.expectedValidation.isSolvable, fixture.id);
    if (Array.isArray(fixture.expectedValidation.messages)) {
      assert.deepEqual(result.validation.messages, fixture.expectedValidation.messages, fixture.id);
    }
    assert.deepEqual(result.matrix, fixture.expectedMatrix, fixture.id);
  }
}
