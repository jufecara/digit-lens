import test from "node:test";
import { assertTierFixtures } from "./helpers/assert-tier-fixtures.mjs";

test("hard-tier fixtures satisfy their reviewed runtime expectations", async () => {
  await assertTierFixtures("hard");
});
