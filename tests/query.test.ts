import { describe, expect, it } from "vitest";
import { compactEvidencePacket } from "../src/api/compact.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { validStore } from "./helpers.js";
import { queryFixture } from "./support/query-fixture.js";

describe("knowledge retrieval", () => {
  it("reports graph truncation only when the edge cap omits a relationship", async () => {
    const { store } = await validStore();
    const index = new KnowledgeIndex(store);
    const context = { patch: "1.14.00", spoilerCeiling: "ending" as const };
    const complete = index.relationshipGraph("resource.honey", context, 2, 500)!;
    const exactCap = index.relationshipGraph("resource.honey", context, 2, 8)!;
    const smallerCap = index.relationshipGraph("resource.honey", context, 2, 7)!;

    expect(complete.edges).toHaveLength(8);
    expect(complete.truncated).toBe(false);
    expect(exactCap).toEqual(complete);
    expect(smallerCap.edges).toHaveLength(7);
    expect(smallerCap.truncated).toBe(true);
  });

  it("uses bounded typo tolerance without changing deterministic ordering", async () => {
    const { store } = await validStore();
    const index = new KnowledgeIndex(store);
    const first = index.search("Refinment Token", {}, 10, 0);
    const second = index.search("Refinment Token", {}, 10, 0);
    expect(first).toEqual(second);
    expect(first.hits[0]).toMatchObject({ kind: "entity", title: "Refinement Token" });
  });
  it("exposes a review gap when a historical claim has not been reviewed through the requested patch", async () => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("Can I remap controller inputs?");
    expect(packet.answer_state).toBe("partial");
    expect(packet.assumptions.patch).toBe("1.14.00");
    expect(packet.claims[0]?.predicate).toBe("controls.remapping_available");
    expect(packet.evidence[0]?.evidence_id).toBe("evd_01jzcdpatch109official001");
    expect(packet.warnings.join(" ")).toContain("publisher-stated intent");
    expect(packet.warnings.join(" ")).toContain("assumed");
    expect(packet.gaps.map((gap) => gap.code)).toContain("post_patch_review_needed");
  });

  it("returns fully supported official intent at its reviewed patch", async () => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("Can I remap controller inputs?", {
      patch: "1.09.00",
    });
    expect(packet.answer_state).toBe("supported");
    expect(packet.gaps.map((gap) => gap.code)).not.toContain("post_patch_review_needed");
  });

  it("does not return a later claim outside its validity or an excluded patch statement", async () => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("controller remapping", { patch: "1.08.00" });
    expect(packet.answer_state).not.toBe("supported");
    expect(packet.claims).toHaveLength(0);
  });

  it("returns a fully unknown packet for uncovered concepts", async () => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("maximum airship sail durability");
    expect(packet.answer_state).toBe("unknown");
    expect(packet.concise_answer).toMatch(/^Unknown:/);
    expect(packet.gaps).not.toHaveLength(0);
  });

  it("matches all-platform claims to a specific platform", async () => {
    const { store } = await validStore();
    const entity = store.entities.find((item) => item.slug === "system.controller-remapping");
    expect(entity).toBeDefined();
    const claims = new KnowledgeIndex(store).claimsForEntity(entity!.entity_id, {
      platform: "playstation-5",
    });
    expect(claims.map((claim) => claim.predicate)).toContain("controls.remapping_available");
  });

  it("offers a smaller compact packet with a published codebook", async () => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("use seeds from quickslot");
    const compact = compactEvidencePacket(packet);
    expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(packet).length);
    expect(compact.codebook).toBe("/v1/codebook");
  });

  it("returns unknown instead of substituting related facts for a requested field", async () => {
    const { store } = await validStore();
    const index = new KnowledgeIndex(store);
    const cases = [
      ["What rewards does Serge's Request give?", "reward"],
      ["Where is St. Halssius's House of Healing?", "location or route"],
      ["What is the exact drop rate for Abyss Gear Blueprints?", "drop-rate"],
    ] as const;

    for (const [query, label] of cases) {
      const packet = index.answer(query);
      const compact = compactEvidencePacket(packet);
      expect(packet.answer_state, query).toBe("unknown");
      expect(packet.concise_answer, query).toContain("no supported " + label + " claim");
      expect(packet.gaps.map((gap) => gap.code), query).toContain("requested_fact_not_supported");
      expect(compact, query).not.toHaveProperty("claims");
      expect(compact, query).not.toHaveProperty("changes");
      expect(compact, query).not.toHaveProperty("evidence");
      expect(compact, query).not.toHaveProperty("strategies");
    }
  });

  it("maps ordinary requirement wording to item requirements as well as quest prerequisites", async () => {
    const { store } = await validStore();
    const fixture = structuredClone(store);
    const target = fixture.entities.find((entity) => entity.slug === "item.refinement-token")!;
    fixture.claims = fixture.claims.filter((claim) => claim.subject_entity_id !== target.entity_id);
    fixture.claims.push({
      ...fixture.claims[0]!,
      claim_id: "clm_syntheticrequirement001",
      subject_entity_id: target.entity_id,
      predicate: "item.requirement",
      object: { kind: "string", value: "Requires a synthetic test prerequisite." },
      status: "inferred",
      behavior_kind: "historical",
      validity: { from_patch: null, through_patch: null, reviewed_through_patch: null, platforms: ["all"], locales: ["en-US"] },
    });
    const packet = new KnowledgeIndex(fixture).answer("What requirements does Refinement Token have?");
    expect(packet.claims.map((claim) => claim.predicate)).toEqual(["item.requirement"]);
    expect(packet.concise_answer).toContain("synthetic test prerequisite");
    expect(packet.claims.map((claim) => claim.predicate)).not.toContain("patch.reviewed_no_named_change");
  });

  it("uses a labeled catalog summary instead of unrelated records for an unclaimed definition", async () => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("What is Abyss Gear?");
    const compact = compactEvidencePacket(packet);

    expect(packet.answer_state).toBe("partial");
    expect(packet.concise_answer).toContain("Crimson Desert system reference: Abyss Gear.");
    expect(packet.concise_answer).toContain("not a gameplay observation");
    expect(packet.gaps.map((gap) => gap.code)).toContain("requested_fact_catalog_summary_only");
    expect(compact).not.toHaveProperty("claims");
    expect(compact).not.toHaveProperty("changes");
    expect(compact).not.toHaveProperty("strategies");
    expect(compact.catalog).toEqual([
      "ent_acd927ab18d8eea4248813d2",
      store.receipts[0]!.receipt_id,
    ]);
  });


  it("keeps every compact entity and evidence index packet-local across the finite reference queries", async () => {
    const { store } = await validStore();
    const index = new KnowledgeIndex(store);
    const cases = [
      "Can I remap controller inputs?",
      "Can Oongka enter the Abyss?",
      "What is Abyss Gear?",
      "use seeds from quickslot",
      "Refinement Token",
      "In patch 1.14.00, explain the cross-save feature.",
      "maximum airship sail durability",
    ].flatMap((query) => ["1.09.00", "1.14.00"].map((patch) => ({
      query, context: { patch, platform: "all" as const, locale: "en-US", spoiler: "none" as const },
    })));

    for (const evalCase of cases) {
      const compact = compactEvidencePacket(index.answer(evalCase.query, {
        patch: evalCase.context.patch,
        platform: evalCase.context.platform,
        locale: evalCase.context.locale,
        spoilerCeiling: evalCase.context.spoiler,
      }));
      const entityCount = (compact.entities as unknown[][] | undefined)?.length ?? 0;
      const evidenceCount = (compact.evidence as unknown[][] | undefined)?.length ?? 0;
      const claimTuples = (compact.claims as unknown[][] | undefined) ?? [];
      const entityIndexes = [
        ...claimTuples.map((claim) => claim[1]),
      ];
      const evidenceIndexes = [
        ...claimTuples.flatMap((claim) => claim[7] as unknown[]),
      ];

      expect(entityIndexes.every((value) => Number.isInteger(value) && (value as number) >= 0 && (value as number) < entityCount)).toBe(true);
      expect(evidenceIndexes.every((value) => Number.isInteger(value) && (value as number) >= 0 && (value as number) < evidenceCount)).toBe(true);
    }
  }, 120_000);


  it("anchors named-character questions instead of returning a nearby character", async () => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("Can Oongka enter the Abyss?", { patch: "1.13.01" });
    expect(packet.answer_state).toBe("supported");
    expect(packet.claims.map((claim) => claim.claim_id)).toEqual([
      "clm_825506491fc78c279dca8190",
    ]);
  });


  it("still reports conflicting values for a scalar predicate", async () => {
    const { store } = await validStore();
    const baseline = store.claims.find((claim) => claim.predicate === "controls.remapping_available")!;
    const fixture = structuredClone(store);
    fixture.claims.push({ ...baseline, claim_id: "clm_scalarconflict000001", object: { kind: "boolean", value: false } });
    const packet = new KnowledgeIndex(fixture).answer("Can I remap controller inputs?", { patch: "1.09.00" });
    expect(packet.answer_state).toBe("conflicting");
    expect(packet.warnings.join(" ")).toContain("Conflicting or disputed claims");
  });

  it("preserves an explicit unknown instead of guessing a socket capacity", async () => {
    const { store } = await validStore();
    const fixture = structuredClone(store);
    const target = fixture.entities.find((entity) => entity.slug === "item.refinement-token")!;
    fixture.claims.push({
      ...fixture.claims[0]!,
      claim_id: "clm_syntheticunknown000001",
      subject_entity_id: target.entity_id,
      predicate: "item.socket_capacity",
      object: { kind: "unknown", state: "conflicting", reason: "Synthetic test sources disagree." },
      status: "disputed",
      behavior_kind: "historical",
      validity: { from_patch: null, through_patch: null, reviewed_through_patch: null, platforms: ["all"], locales: ["en-US"] },
    });
    const packet = new KnowledgeIndex(fixture).answer("Refinement Token socket capacity", { platform: "pc-steam" });
    expect(packet.answer_state).toBe("conflicting");
    expect(packet.claims).toHaveLength(1);
    expect(packet.claims[0]?.object).toMatchObject({ kind: "unknown", state: "conflicting" });
  });

  it("returns a source-bounded synthetic catalog identity without promoting gameplay verification", async () => {
    const { store } = await validStore();
    const fixture = structuredClone(store);
    const entity = { ...fixture.entities[0]!, entity_id: "ent_syntheticcatalog00001", entity_type: "item" as const, slug: "item.fixture-charm", canonical_name: { locale: "en-US", text: "Fixture Charm" }, summary: "Synthetic fixture only.", aliases: [], tags: [] };
    fixture.entities.push(entity);
    fixture.claims.push({ ...fixture.claims[0]!, claim_id: "clm_syntheticcatalog00001", subject_entity_id: entity.entity_id, predicate: "catalog.community_indexed_type", object: { kind: "string", value: "item" }, status: "inferred", behavior_kind: "historical", validity: { from_patch: null, through_patch: null, reviewed_through_patch: null, platforms: ["all"], locales: ["en-US"] } });
    const packet = new KnowledgeIndex(fixture).answer("Is Fixture Charm an item?");
    expect(packet.answer_state).toBe("supported");
    expect(packet.claims).toEqual(expect.arrayContaining([
      expect.objectContaining({ subject_entity_id: entity.entity_id, object: { kind: "string", value: "item" }, status: "inferred", behavior_kind: "historical" }),
    ]));
    expect(packet.evidence.length).toBeGreaterThanOrEqual(1);
  });
});

describe("claim-specific correctness with independent fixtures", () => {
  it.each(["9.99.00", "1.00.50", null])("does not assert applicability to an unresolved patch: %s", (patch) => {
    const store = queryFixture();
    const index = new KnowledgeIndex(store);
    const packet = index.answer("Is Synthetic Compass available?", { patch });
    expect(packet.answer_state).toBe("unknown");
    expect(packet.assumptions.patch).toBe(patch);
    expect(packet.gaps.map(({ code }) => code)).toContain("patch_unknown");
    expect(packet.concise_answer).toMatch(/^Unknown:/);
    expect(index.entityBundle(store.entities[0]!.entity_id, { patch })!.warnings.join(" ")).toMatch(/not indexed|No patch context/);
  });

  it("uses the requested claim's review boundary even when a newer patch is marked exhaustive", () => {
    const store = queryFixture();
    const claim = store.claims[0]!;
    store.patches[1]!.content_coverage.level = "exhaustive";
    const index = new KnowledgeIndex(store);
    expect(index.answer("Is Synthetic Compass available?", { patch: "1.00.00" }).answer_state).toBe("supported");
    const stale = index.answer("Is Synthetic Compass available?", { patch: "1.01.00" });
    expect(stale.answer_state).toBe("partial");
    expect(stale.gaps.map(({ code }) => code)).toContain("post_patch_review_needed");
    expect(index.entityBundle(claim.subject_entity_id, { patch: "1.01.00" })!.freshness.review_gap_record_ids).toEqual([claim.claim_id]);
    expect(claim.validity.reviewed_through_patch).toBe("1.00.00");
    claim.validity.reviewed_through_patch = "1.01.00";
    expect(new KnowledgeIndex(store).answer("Is Synthetic Compass available?", { patch: "1.01.00" }).answer_state).toBe("supported");
  });

  it("keeps a missing review boundary explicit for official claims", () => {
    const store = queryFixture();
    store.claims[0]!.validity.reviewed_through_patch = null;
    const packet = new KnowledgeIndex(store).answer("Is Synthetic Compass available?", { patch: "1.00.00" });
    expect(packet.answer_state).toBe("partial");
    expect(packet.gaps.map(({ code }) => code)).toContain("post_patch_review_needed");
  });

  it("does not replace a requested classification or property with an unrelated claim", () => {
    const store = queryFixture();
    const index = new KnowledgeIndex(store);
    for (const query of ["Is Synthetic Compass an item?", "Is Synthetic Compass a location?", "Can Synthetic Compass fly?"]) {
      const packet = index.answer(query, { patch: "1.00.00" });
      expect(packet.answer_state, query).not.toBe("supported");
      expect(packet.claims, query).toEqual([]);
      expect(packet.concise_answer, query).toMatch(/^Unknown:/);
    }
  });

  it("keeps a compound question partial when only one requested predicate is supported", () => {
    const store = queryFixture();
    store.claims[0]!.predicate = "item.requirement";
    store.claims[0]!.object = { kind: "string", value: "Requires a synthetic permit." };
    const packet = new KnowledgeIndex(store).answer("What requirements and costs does Synthetic Compass have?", { patch: "1.00.00" });
    expect(packet.answer_state).toBe("partial");
    expect(packet.claims.map(({ predicate }) => predicate)).toEqual(["item.requirement"]);
    expect(packet.gaps).toContainEqual(expect.objectContaining({ code: "requested_fact_not_supported", message: expect.stringContaining("cost") }));
    expect(packet.concise_answer).toContain("synthetic permit");
    expect(packet.concise_answer).toContain("no supported cost claim");
  });

  it.each(["Is Axiom Bracelet an item?", "Is City of Hernand a location?"])("does not promote retained related content to classification evidence: %s", async (query) => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer(query);
    expect(packet.answer_state).toBe("unknown");
    expect(packet.claims).toEqual([]);
    expect(packet.gaps.map(({ code }) => code)).toContain("requested_fact_not_supported");
  });

  it("does not treat patch-neutral catalog identity as evidence for an unknown patch", () => {
    const store = queryFixture();
    store.claims[0]!.predicate = "catalog.community_indexed_type";
    store.claims[0]!.object = { kind: "string", value: "system" };
    store.claims[0]!.validity.reviewed_through_patch = null;
    const index = new KnowledgeIndex(store);
    const known = index.answer("Is Synthetic Compass a system?", { patch: "1.01.00" });
    expect(known.answer_state).toBe("supported");
    expect(known.gaps.map(({ code }) => code)).not.toContain("post_patch_review_needed");
    expect(index.entityBundle(store.entities[0]!.entity_id, { patch: "1.01.00" })!.freshness.review_gap_record_ids).toEqual([]);
    expect(index.answer("Is Synthetic Compass a system?", { patch: "9.99.00" }).answer_state).toBe("unknown");
  });

  it("does not elevate stale, unknown, or audit-only retracted records into support", () => {
    const store = queryFixture();
    const claim = store.claims[0]!;
    claim.status = "stale";
    expect(new KnowledgeIndex(store).answer("Is Synthetic Compass available?", { patch: "1.00.00" }).answer_state).toBe("partial");
    claim.status = "official";
    claim.object = { kind: "unknown", state: "unmeasured", reason: "Synthetic unresolved measurement." };
    const unknown = new KnowledgeIndex(store).answer("Is Synthetic Compass available?", { patch: "1.00.00" });
    expect(unknown.answer_state).toBe("unknown");
    expect(unknown.claims[0]!.object).toEqual(claim.object);
    claim.status = "retracted";
    claim.object = { kind: "boolean", value: true };
    expect(new KnowledgeIndex(store).answer("Is Synthetic Compass available?", { patch: "1.00.00" }).claims).toEqual([]);
    expect(new KnowledgeIndex(store).answer("Is Synthetic Compass available?", { patch: "1.00.00", includeRetracted: true }).answer_state).toBe("partial");
  });

  it("preserves historical claims before a later applicable supersession", () => {
    const store = queryFixture();
    const older = store.claims[0]!;
    const newer = structuredClone(older);
    newer.claim_id = "clm_syntheticcompass00002";
    newer.object = { kind: "boolean", value: false };
    newer.validity.from_patch = "1.01.00";
    newer.validity.reviewed_through_patch = "1.01.00";
    newer.supersedes_claim_ids = [older.claim_id];
    store.claims.push(newer);
    const index = new KnowledgeIndex(store);
    const historical = index.answer("Is Synthetic Compass available?", { patch: "1.00.00" });
    expect(historical.answer_state).toBe("supported");
    expect(historical.claims.map(({ claim_id }) => claim_id)).toEqual([older.claim_id]);
    const current = index.answer("Is Synthetic Compass available?", { patch: "1.01.00" });
    expect(current.answer_state).toBe("supported");
    expect(current.claims.map(({ claim_id }) => claim_id)).toEqual([newer.claim_id]);
    expect(index.answer("Is Synthetic Compass available?", { patch: "1.01.00", includeSuperseded: true }).answer_state).toBe("conflicting");
    newer.status = "retracted";
    expect(new KnowledgeIndex(store).claimsForEntity(older.subject_entity_id, { patch: "1.01.00" }).map(({ claim_id }) => claim_id)).toEqual([older.claim_id]);
  });

  it.each([
    ["item.acquisition", "How do I obtain Synthetic Compass?", "discovery"],
    ["quest.reward", "What rewards does Synthetic Compass give?", "quest_minor"],
  ] as const)("does not raise the spoiler ceiling implicitly for %s requests", (predicate, query, spoilerLevel) => {
    const store = queryFixture();
    store.claims[0]!.predicate = predicate;
    store.claims[0]!.object = { kind: "string", value: "Synthetic spoiler-bearing fact." };
    store.claims[0]!.spoiler_level = spoilerLevel;
    const index = new KnowledgeIndex(store);
    const safe = index.answer(query, { patch: "1.00.00" });
    expect(safe.assumptions.spoiler_ceiling).toBe("none");
    expect(safe.claims).toEqual([]);
    expect(safe.concise_answer).not.toContain("Synthetic spoiler-bearing fact");
    const allowed = index.answer(query, { patch: "1.00.00", spoilerCeiling: spoilerLevel });
    expect(allowed.claims.map(({ claim_id }) => claim_id)).toEqual([store.claims[0]!.claim_id]);
  });

  it("applies platform, locale, spoiler and closed patch validity filters", () => {
    const store = queryFixture();
    const claim = store.claims[0]!;
    claim.validity.platforms = ["pc-steam"];
    claim.validity.through_patch = "1.00.00";
    claim.spoiler_level = "quest_major";
    const index = new KnowledgeIndex(store);
    const query = "Is Synthetic Compass available?";
    const allowed = { patch: "1.00.00", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "ending" as const };
    expect(index.answer(query, allowed).answer_state).toBe("supported");
    for (const context of [
      { ...allowed, patch: "1.01.00" },
      { ...allowed, platform: "playstation-5" as const },
      { ...allowed, locale: "de-DE" },
      { ...allowed, spoilerCeiling: "none" as const },
    ]) expect(index.answer(query, context).claims).toEqual([]);
  });

  it("answers an explicit patch-history request from claims introduced at that patch", () => {
    const store = queryFixture();
    store.claims = ["1.00.00", "1.01.00"].map((version, index) => ({
      ...store.claims[0]!, claim_id: `clm_syntheticlabel000000${index + 1}`, predicate: "patch.changed_interface",
      object: { kind: "string" as const, value: index === 0 ? "Added a synthetic compass label." : "Changed the synthetic compass label." },
      validity: { ...store.claims[0]!.validity, from_patch: version, reviewed_through_patch: version },
    }));
    const packet = new KnowledgeIndex(store).answer("In patch 1.01.00, explain the Synthetic Compass label update.");
    expect(packet.answer_state).toBe("supported");
    expect(packet.claims.map(({ claim_id }) => claim_id)).toEqual([store.claims[1]!.claim_id]);
    expect(packet.assumptions.patch).toBe("1.01.00");
  });

  it("does not silently answer a different patch from the one named in the question", () => {
    const store = queryFixture();
    const packet = new KnowledgeIndex(store).answer("Is Synthetic Compass available in patch 1.01.00?", { patch: "1.00.00" });
    expect(packet.answer_state).toBe("unknown");
    expect(packet.assumptions.patch).toBe("1.00.00");
    expect(packet.gaps.map(({ code }) => code)).toContain("patch_context_conflict");
    expect(packet.concise_answer).toMatch(/^Unknown:/);
  });

  it.each(["", "   ", "???"])("does not retrieve arbitrary facts from an empty query: %s", (query) => {
    const packet = new KnowledgeIndex(queryFixture()).answer(query);
    expect(packet.answer_state).toBe("unknown");
    expect(packet.claims).toEqual([]);
  });
});
