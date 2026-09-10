import { findProjectRoot } from "../src/core/paths.js";
import { validateCorpus } from "../src/core/validate.js";

export const TEST_BUILD_ID = "bld_000000000000000000000000";

async function loadValidStore() {
  const root = findProjectRoot();
  const { report, store } = await validateCorpus(root);
  if (!report.valid || store === undefined) throw new Error(JSON.stringify(report));
  return { root, store, report };
}

let cachedValidStore: ReturnType<typeof loadValidStore> | undefined;

export function validStore() {
  cachedValidStore ??= loadValidStore();
  return cachedValidStore;
}
