import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
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

// Keep absence regressions pinned to original release IDs without copying data.
export async function originalReleaseStore() {
  const current = await validStore();
  const scope = JSON.parse(await readFile(resolve(current.root, "quality/public-release-scope.json"), "utf8")) as { record_ids: Record<string, string[]> };
  const ids = Object.fromEntries(Object.entries(scope.record_ids).map(([family, values]) => [family, new Set(values)]));
  return {
    root: current.root,
    store: {
      ...current.store,
      entities: current.store.entities.filter(record => ids.entities!.has(record.entity_id)),
      claims: current.store.claims.filter(record => ids.claims!.has(record.claim_id)),
      evidence: current.store.evidence.filter(record => ids.evidence!.has(record.evidence_id)),
      patches: current.store.patches.filter(record => ids.patches!.has(record.patch_id)),
      strategies: current.store.strategies.filter(record => ids.strategies!.has(record.strategy_id)),
      receipts: current.store.receipts.filter(record => ids.receipts!.has(record.receipt_id)),
    },
  };
}
