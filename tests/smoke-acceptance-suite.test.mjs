import test from "node:test";
import { assertTierFixtures } from "./helpers/assert-tier-fixtures.mjs";

test("smoke-tier fixtures satisfy their reviewed runtime expectations", async () => {
  await assertTierFixtures("smoke");
});
