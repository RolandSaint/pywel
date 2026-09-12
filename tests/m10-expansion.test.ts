import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sha256 } from "../src/core/canonical-json.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { firstExpansionStore, originalReleaseStore } from "./helpers.js";

// Original M6 questions, not a new whole-game benchmark. Context is unchanged.
const queries = [
  "What is House Roberts?", "Who leads House Roberts?", "Where is House Roberts based?",
  "Which factions are rivals of House Roberts?", "Which quests belong to House Roberts?",
  "What unlocks the quest Shorthanded?", "Where can I get the Righteous Verdict weapon?",
  "What does the Witch's Ring do?", "What does Celestial Transference do?",
  "What is the maximum movement speed level?", "How do Hernand bonds work?",
  "Can pets harvest large animal carcasses?", "How do I recruit Damiane?",
  "How do I unlock housing?", "What is the relationship between Kliff and the Greymanes?",
  "What changed in the latest indexed patch?", "Can controller inputs be remapped?",
  "Can controller inputs be remapped?", "Can controller inputs be remapped?",
  "Is Axiom Bracelet an item?",
];
const historicalStates = ["partial", "partial", "supported", "partial", "partial", "unknown", "partial", "unknown", "unknown", "partial", "partial", "partial", "partial", "unknown", "partial", "unknown", "supported", "partial", "unknown", "unknown"];
const improvements = new Map([
  [0, ["organization.role", "ent_87a65ae57efbb95fe75d068c"]],
  [2, ["organization.location", "ent_87a65ae57efbb95fe75d068c"]],
  [4, ["quest.organization", null]],
  [6, ["item.acquisition", "ent_m8brighteousverdict0001"]],
  [7, ["item.effect_summary", "ent_m8bwitchsring0000001"]],
]);

describe("M10 published-expansion regression (not a new release acceptance)", () => {
  it("preserves the approved R01 content boundary and original publication scope", async () => {
    const { root, store } = await firstExpansionStore();
    const additions = JSON.parse(await readFile(resolve(root, "quality/corpus-additions.json"), "utf8"));
    // Reconstruct only the already-published additions; the live union is checked by m1:check.
    const published = { ...additions, scope_id: "pywel-post-release-m7-r01", evidence_cutoff: "2026-09-10",
      canonical_files: additions.canonical_files.filter((file: { path: string }) => !file.path.endsWith("/g02-official-catchup.json") && !file.path.endsWith("/s01-equipment.json") && !file.path.endsWith("/s02-acquisition.json") && !file.path.endsWith("/s03-recipe-inputs.json") && !file.path.endsWith("/s04-recipe-outputs.json")),
      record_ids: Object.fromEntries(Object.entries(additions.record_ids as Record<string, string[]>).map(([key, ids]) => [key, ids.filter(id => !id.startsWith("pat_g02") && !id.startsWith("evd_g02") && !id.startsWith("rcp_g02") && !id.includes("_s01") && !id.includes("_s02") && !id.includes("_s03") && !id.includes("_s04"))])),
      reviewed_sources: additions.reviewed_sources.filter((row: { evidence_id: string }) => !row.evidence_id.startsWith("evd_s01") && !row.evidence_id.startsWith("evd_s02")),
    };
    // Preserve the historical JSON key order; locale-based canonical sorting is different.
    expect(sha256(`${JSON.stringify(published, null, 2)}\n`)).toBe("17f6abb88ce201d6095efa2efd2a061e63076da3c3577f6e4184d2c0cc07c8f0");
    expect(sha256(await readFile(resolve(root, "quality/public-release-scope.json")))).toBe("9bea33a672f0d2043e19e706e4d67cd8537823ad47154242916422c53c7aeb7f");
    expect([store.entities.length, store.claims.length, store.evidence.length, store.patches.length, store.strategies.length, store.receipts.length]).toEqual([320, 1447, 88, 27, 1, 5]);
    expect(store.predicateRegistry.registry_version).toBe(14);
    const software = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
    expect(software.private).toBe(true);
  });

  it("reruns all twenty M6 questions without upgrading partial knowledge to completeness", async () => {
    const { store } = await firstExpansionStore();
    const original = (await originalReleaseStore()).store;
    const index = new KnowledgeIndex(store);
    const prior = new KnowledgeIndex(original);
    const results = queries.map((query, i) => {
      const context = { patch: i === 16 ? "1.09.00" : i === 18 ? "9.99.00" : "1.14.00", platform: "all" as const, locale: "en-US", spoilerCeiling: i < 16 ? "quest_major" as const : "none" as const };
      const packet = index.answer(query, context);
      const old = prior.answer(query, context);
      return {
        id: `Q${String(i + 1).padStart(2, "0")}`, query, context,
        historical_m6_recorded_state: historicalStates[i],
        original_records_current_engine: { state: old.answer_state, claim_ids: old.claims.map(c => c.claim_id) },
        candidate: { state: packet.answer_state, concise_answer: packet.concise_answer, claim_ids: packet.claims.map(c => c.claim_id), predicates: [...new Set(packet.claims.map(c => c.predicate))], evidence_ids: packet.evidence.map(e => e.evidence_id), gaps: packet.gaps.map(g => g.code) },
      };
    });
    console.log(`M10_QUESTION_RESULTS ${JSON.stringify(results)}`);
    for (const [i, result] of results.entries()) {
      const expected = improvements.get(i);
      if (expected !== undefined) {
        const packet = index.answer(result.query, result.context);
        expect(packet.answer_state, result.id).toBe("partial");
        expect(packet.claims.length, result.id).toBeGreaterThan(0);
        expect(packet.claims.every(c => c.predicate === expected[0] && (expected[1] === null || c.subject_entity_id === expected[1])), result.id).toBe(true);
        expect(packet.gaps.map(g => g.code), result.id).toContain("post_patch_review_needed");
        expect(packet.evidence.length, result.id).toBeGreaterThan(0);
        expect(result.original_records_current_engine.claim_ids, result.id).toEqual([]);
      } else if (i >= 16) {
        expect(result.candidate.state, result.id).toBe(["supported", "partial", "unknown", "unknown"][i - 16]);
        if (i < 19) expect(result.candidate.predicates, result.id).toEqual(["controls.remapping_available"]);
        else expect(result.candidate.claim_ids, result.id).toEqual([]);
      } else {
        expect(result.candidate.claim_ids, result.id).toEqual([]);
        expect(result.candidate.state, result.id).not.toBe("supported");
      }
    }
    // Published acceptance bytes remain in the immutable release. Do not write a
    // new M10-labelled acceptance artifact from a later source revision.
  });
});
