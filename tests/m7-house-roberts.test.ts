import { describe, expect, it } from "vitest";
import { KnowledgeIndex } from "../src/core/query.js";
import { compactEvidencePacket } from "../src/api/compact.js";
import { originalReleaseStore, validStore } from "./helpers.js";

const house = "ent_87a65ae57efbb95fe75d068c";
const count = "ent_7ea2ae660f60d58012dcb3a7";
const manor = "ent_089ced07950ace8407a29247";
const hernand = "ent_e964d1c5570c6dc429afbab4";
const quarry = "ent_6ca283919bf4d6fa26a0da9f";
const stolen = "ent_6dd97bc94c6fe241d0bb1a0e";
const sealed = "ent_d1b3b818dfa863a35aab7680";
const honor = "ent_d3de309d4578b75dc73ee5f2";
const trial = "ent_2beedf6ea02e8ba696464bb3";
const context = { patch: "1.14.00", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };
const questions = [
  ["What is House Roberts?", "organization.role", house],
  ["Where is House Roberts?", "organization.location", house],
  ["Where is Count Roberts?", "actor.location", count],
  ["Which quests belong to House Roberts?", "quest.organization", null],
  ["What are the prerequisites for The Count's Honor?", "quest.prerequisite", honor],
  ["Where is Stolen Quarry?", "quest.location", stolen],
  ["What are the objectives of Stolen Quarry?", "quest.objective", stolen],
] as const;

describe("M7 historical House Roberts pilot", () => {
  it.each(questions)("adds a bounded source-backed answer: %s", async (query, predicate, subject) => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer(query, context);
    expect(packet.answer_state).toBe("partial");
    expect(packet.claims.length).toBeGreaterThan(0);
    expect(packet.claims.every(claim => claim.predicate === predicate && (subject === null || claim.subject_entity_id === subject))).toBe(true);
    expect(packet.claims.every(claim => claim.status === "inferred" && claim.behavior_kind === "historical" && claim.validity.reviewed_through_patch === null)).toBe(true);
    expect(packet.evidence.length).toBeGreaterThan(0);
    expect(packet.gaps.map(gap => gap.code)).toContain("post_patch_review_needed");
    expect(compactEvidencePacket(packet).state).toBe("partial");
    const previous = new KnowledgeIndex((await originalReleaseStore()).store).answer(query, context);
    expect(previous.claims.filter(claim => claim.predicate === predicate)).toEqual([]);
  });

  it("keeps exact relationship targets and only four attested quest associations", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    const cases = [
      ["Where is House Roberts?", hernand],
      ["Where is Count Roberts?", manor],
      ["What are the prerequisites for The Count's Honor?", sealed],
      ["Where is Stolen Quarry?", quarry],
    ];
    for (const [query, id] of cases) expect(index.answer(query!, context).claims[0]?.object).toEqual({ kind: "entity", entity_id: id });
    const quests = index.answer("Which quests belong to House Roberts?", context).claims;
    expect(quests.map(claim => claim.subject_entity_id).sort()).toEqual([trial, stolen, sealed, honor].sort());
    expect(quests.every(claim => claim.object.kind === "entity" && claim.object.entity_id === house)).toBe(true);
    const graph = index.relationshipGraph(house, context, 1, 100)!;
    expect(graph.edges.filter(edge => edge.predicate === "quest.organization")).toHaveLength(4);
    expect(index.answer("What are the objectives of Stolen Quarry?", context).concise_answer).toContain("Excavatron");
  });

  it.each(["Who leads House Roberts?", "Who is the leader of House Roberts?"])("does not promote a quest contact into leadership: %s", async query => {
    const packet = new KnowledgeIndex((await validStore()).store).answer(query, context);
    expect(packet.answer_state).toBe("unknown");
    expect(packet.claims).toEqual([]);
    expect(packet.evidence).toEqual([]);
    expect(packet.concise_answer).not.toContain("Count Roberts");
  });

  it("keeps the fabricated house unknown after adding the real house", async () => {
    const packet = new KnowledgeIndex((await validStore()).store).answer("Where is House Zorblax?", context);
    expect(packet.answer_state).toBe("unknown");
    expect(packet.claims).toEqual([]);
  });

  it("does not manufacture current-patch applicability or escalate spoilers", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    const future = index.answer("Where is House Roberts?", { ...context, patch: "2.01.00" });
    expect(future.answer_state).toBe("unknown");
    expect(future.gaps.map(gap => gap.code)).toContain("patch_unknown");
    const hidden = index.answer("Which quests belong to House Roberts?", { ...context, spoilerCeiling: "none" });
    expect(hidden.claims).toEqual([]);
    expect(index.answer("Which quests belong to House Roberts?", { ...context, spoilerCeiling: "quest_minor" }).claims).toHaveLength(4);
  });

  it("follows only applicable incoming organization links, not unrelated organizations", async () => {
    const store = structuredClone((await validStore()).store);
    const exemplar = store.claims.find(claim => claim.predicate === "quest.organization")!;
    store.claims.push({ ...structuredClone(exemplar), claim_id: "clm_m7syntheticotherorg0001", object: { kind: "entity", entity_id: quarry } });
    const role = store.claims.find(claim => claim.subject_entity_id === house && claim.predicate === "organization.role")!;
    role.object = { kind: "string", value: "Faction with quest associations." };
    const hidden = store.claims.find(claim => claim.predicate === "quest.organization" && claim.subject_entity_id === sealed)!;
    hidden.validity.platforms = ["playstation-5"];
    const retracted = store.claims.find(claim => claim.predicate === "quest.organization" && claim.subject_entity_id === honor)!;
    retracted.status = "retracted";
    const packet = new KnowledgeIndex(store).answer("Which quests belong to House Roberts?", context);
    expect(packet.claims.map(claim => claim.subject_entity_id).sort()).toEqual([trial, stolen].sort());
    expect(packet.claims.every(claim => claim.object.kind === "entity" && claim.object.entity_id === house)).toBe(true);
  });
});
