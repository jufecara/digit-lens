import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { getAcceptanceSuitePath, loadAcceptanceSuite } from "./helpers/load-acceptance-suite.mjs";

test("acceptance-suite manifest has the required root structure", async () => {
  const suite = await loadAcceptanceSuite();

  assert.equal(suite.version, 1);
  assert.ok(suite.tiers);
  assert.ok(Array.isArray(suite.tiers.smoke));
  assert.ok(Array.isArray(suite.tiers.core));
  assert.ok(Array.isArray(suite.tiers.hard));
});

test("acceptance-suite fixture image paths resolve inside tests/fixtures/images", async () => {
  const suite = await loadAcceptanceSuite();
  const fixtureRoot = path.dirname(getAcceptanceSuitePath());

  for (const tier of ["smoke", "core", "hard"]) {
    for (const fixture of suite.tiers[tier]) {
      assert.equal(typeof fixture.id, "string");
      assert.equal(typeof fixture.imagePath, "string");
      assert.equal(typeof fixture.expectedStatus, "string");
      assert.ok(Array.isArray(fixture.expectedMatrix));

      const resolvedImagePath = path.join(fixtureRoot, fixture.imagePath);
      assert.ok(resolvedImagePath.includes(`${path.sep}tests${path.sep}fixtures${path.sep}images${path.sep}`));
      await fs.access(resolvedImagePath);
    }
  }
});
