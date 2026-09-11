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

// Named first-expansion checkpoint. Later receipt families do not redefine it.
export async function firstExpansionStore() {
  const current = await validStore();
  const receipts = new Set([
    "rcp_m1publicscope202609100001", "rcp_m7houseroberts2026091001",
    "rcp_m8aprogression2026091001", "rcp_m8bequipment2026091001", "rcp_r01equipment2026091001",
  ]);
  const retained = (record: { provenance: { source_receipt_id?: string } }) => receipts.has(record.provenance.source_receipt_id ?? "");
  return { ...current, store: { ...current.store,
    entities: current.store.entities.filter(retained), claims: current.store.claims.filter(retained),
    evidence: current.store.evidence.filter(retained), patches: current.store.patches.filter(retained),
    strategies: current.store.strategies.filter(retained), receipts: current.store.receipts.filter(r => receipts.has(r.receipt_id)),
  } };
}
