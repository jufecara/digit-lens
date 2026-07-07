import test from "node:test";
import { assertTierFixtures } from "./helpers/assert-tier-fixtures.mjs";

test("core-tier fixtures satisfy their reviewed runtime expectations", async () => {
  await assertTierFixtures("core");
});
