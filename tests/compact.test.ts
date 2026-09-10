import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { TEST_BUILD_ID } from "./helpers.js";
import { COMPACT_CODEBOOK, compactEvidencePacket } from "../src/api/compact.js";
import { KnowledgeIndex } from "../src/core/query.js";
import type { ClaimObject, Strategy } from "../src/core/types.js";
import { queryFixture } from "./support/query-fixture.js";

function fixtureStrategy(index: number): Strategy {
  const store = queryFixture();
  const claim = store.claims[0]!;
  return {
    schema_version: "pywel.strategy.v1", strategy_id: `str_syntheticcompass${String(index).padStart(5, "0")}`,
    slug: `synthetic-compass-${index}`, title: "Synthetic Compass availability procedure",
    goal_entity_id: store.entities[0]!.entity_id, status: "source_supported", prerequisites: [],
    entry_node_id: "start", nodes: [{ node_id: "start", action: "inspect", instruction: "Synthetic fixture only.", transitions: [] }],
    priorities: { speed: 0.5, safety: 0.5, resource_efficiency: 0.5, accessibility: 0.5 },
    verification: { attempts: 0, successful_attempts: 0, independent_sources: 0 },
    validity: claim.validity, spoiler_level: "none", evidence_ids: claim.evidence_ids, provenance: claim.provenance,
  };
}

function boundedFixture() {
  const store = queryFixture();
  const baseline = store.claims[0]!;
  store.claims = Array.from({ length: 23 }, (_, index) => ({
    ...baseline, claim_id: `clm_syntheticbounded${String(index).padStart(5, "0")}`, confidence: 1 - index / 100,
  }));
  store.strategies = Array.from({ length: 9 }, (_, index) => fixtureStrategy(index));
  return store;
}

describe("compact v3 facts", () => {
  it.each<ClaimObject>([
    { kind: "string", value: "Synthetic requirement", unit: "label" },
    { kind: "number", value: 2.5, unit: "seconds" },
    { kind: "boolean", value: false },
    { kind: "range", minimum: 2, maximum: 7, unit: "percent" },
    { kind: "unknown", state: "unmeasured", reason: "Synthetic measurement pending." },
    { kind: "entity", entity_id: "ent_synthetictarget00001" },
  ])("retains the machine-readable predicate and $kind object with complete context", (object) => {
    const store = queryFixture();
    const target = { ...store.entities[0]!, entity_id: "ent_synthetictarget00001", slug: "system.synthetic-target", canonical_name: { locale: "en-US", text: "Synthetic Target" } };
    store.entities.push(target);
    store.claims[0]!.object = object;
    store.claims[0]!.validity.platforms = ["pc-steam"];
    store.claims[0]!.validity.locales = ["en-US", "fr-FR"];
    const packet = new KnowledgeIndex(store).answer("Synthetic Compass", { patch: "1.00.00", platform: "pc-steam", locale: "fr-FR" });
    const compact = compactEvidencePacket(packet);
    const claims = compact.claims as unknown[][];
    expect(compact.schema_version).toBe("pywel.answer.compact.v3");
    expect(claims).toHaveLength(1);
    expect(claims[0]).toEqual([
      store.claims[0]!.claim_id, 0, "system.available", object,
      "official", "intended", 0.9, [0],
      { from_patch: "1.00.00", through_patch: null, reviewed_through_patch: "1.00.00", platforms: ["pc-steam"], locales: ["en-US", "fr-FR"] },
    ]);
    if (object.kind === "entity") {
      expect(packet.entities.map(({ entity_id }) => entity_id)).toContain(target.entity_id);
      expect(compact.entities).toContainEqual([target.entity_id, "Synthetic Target", "system"]);
    }
  });

  it("keeps supported parts, evidence, and uncertainty in a compound question", () => {
    const store = queryFixture();
    store.claims[0]!.predicate = "item.requirement";
    store.claims[0]!.object = { kind: "string", value: "Requires a synthetic permit." };
    const packet = new KnowledgeIndex(store).answer("What requirements and costs does Synthetic Compass have?");
    packet.warnings.push("Synthetic source is temporarily unavailable.");
    const compact = compactEvidencePacket(packet);
    expect(compact.state).toBe("partial");
    expect((compact.claims as unknown[][])[0]![2]).toBe("item.requirement");
    expect(compact.evidence).toHaveLength(1);
    expect(compact.gaps).toEqual(expect.arrayContaining(["requested_fact_not_supported", "post_patch_review_needed"]));
    expect(compact.warnings).toEqual(expect.arrayContaining([
      "latest_patch_assumed", "review_gap", "official_intent_not_observed", "Synthetic source is temporarily unavailable.",
    ]));
  });

  it("uses explicit counts for both answer bounds and keeps strategy links in context", () => {
    const packet = new KnowledgeIndex(boundedFixture()).answer("Is Synthetic Compass available?", {
      patch: "1.00.00", platform: "pc-steam", locale: "en-US", spoilerCeiling: "discovery",
    });
    expect(packet.claims).toHaveLength(20);
    expect(packet.strategies).toHaveLength(8);
    expect(packet.selection).toEqual({ claims: { matched: 23, returned: 20 }, strategies: { matched: 9, returned: 8 } });
    expect(packet.answer_state).toBe("partial");
    expect(packet.gaps.map(({ code }) => code)).toContain("result_truncated");
    const compact = compactEvidencePacket(packet);
    expect(compact.claims).toHaveLength(5);
    expect(compact.strategies).toHaveLength(2);
    expect(compact.selection).toEqual({ claims: { matched: 23, returned: 5 }, strategies: { matched: 9, returned: 2 } });
    expect(compact.more).toEqual([0, 15, 0, 6, "format=full"]);
    expect(compact.gaps).toContain("result_truncated");
    const href = ((compact.strategies as unknown[][])[0]![2]) as string;
    const url = new URL(href, "https://example.invalid");
    expect(Object.fromEntries(url.searchParams)).toEqual({ patch: "1.00.00", platform: "pc-steam", locale: "en-US", spoiler: "discovery" });
    expect(COMPACT_CODEBOOK).toMatchObject({ schema_version: "pywel.codebook.v2", answer_compact: { limits: { claims: 5, strategies: 2, full_claims: 20, full_strategies: 8 } } });
  });

  it("keeps retracted strategy links readable when historical records were explicitly requested", async () => {
    const store = queryFixture();
    const strategy = fixtureStrategy(1);
    strategy.status = "retracted";
    store.strategies.push(strategy);
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    const response = await app.request("/v1/answer?q=Is+Synthetic+Compass+available%3F&patch=1.00.00&include_retracted=true");
    expect(response.status).toBe(200);
    const compact = await response.json();
    expect(compact.strategies).toHaveLength(1);
    const href = compact.strategies[0][2] as string;
    const url = new URL(href, "https://example.invalid");
    expect(url.searchParams.get("include_retracted")).toBe("true");
    expect(url.searchParams.has("include_superseded")).toBe(false);
    const linked = await app.request(href);
    expect(linked.status).toBe(200);
    expect((await linked.json()).strategy).toMatchObject({ strategy_id: strategy.strategy_id, status: "retracted" });
    url.searchParams.delete("include_retracted");
    expect((await app.request(url.pathname + url.search)).status).toBe(404);
  });

  it.each(["entity", "evidence"])("rejects a broken %s reference instead of emitting a null tuple index", (kind) => {
    const packet = new KnowledgeIndex(queryFixture()).answer("Is Synthetic Compass available?", { patch: "1.00.00" });
    if (kind === "entity") packet.entities = [];
    else packet.evidence = [];
    expect(() => compactEvidencePacket(packet)).toThrow(`missing referenced ${kind}`);
  });

  it.each(["disputed", "stale"] as const)("keeps an omitted %s claim from producing false support", (status) => {
    const store = boundedFixture();
    const last = store.claims.at(-1)!;
    last.status = status;
    if (status === "disputed") last.object = { kind: "boolean", value: false };
    const packet = new KnowledgeIndex(store).answer("Is Synthetic Compass available?", { patch: "1.00.00" });
    expect(packet.claims.some(({ claim_id }) => claim_id === last.claim_id)).toBe(false);
    expect(packet.answer_state).toBe(status === "disputed" ? "conflicting" : "partial");
    expect(compactEvidencePacket(packet).warnings).toContain(status === "disputed" ? "conflict_visible" : "stale_claims_included");
  });
});
