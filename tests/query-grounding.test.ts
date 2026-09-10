import { describe, expect, it } from "vitest";
import { compactEvidencePacket } from "../src/api/compact.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { originalReleaseStore as validStore } from "./helpers.js";

const context = { patch: "1.14.00", platform: "all" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };

// Frozen-corpus regressions from M6, not new canonical game assertions.
describe("G01 answer subject and predicate grounding", () => {
  it.each([
    "Where is House Roberts based?",
    "Where is House Zorblax based?",
    "What is House Roberts?",
    "Where can I get the Righteous Verdict weapon?",
    "What is the maximum movement speed level?",
    "What is the relationship between Kliff and the Greymanes?",
  ])("withholds unrelated facts for an ungrounded subject: %s", async (query) => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer(query, context);
    expect(packet.answer_state).toBe("unknown");
    expect(packet.concise_answer).toMatch(/^Unknown:/);
    expect(packet.claims).toEqual([]);
    expect(packet.evidence).toEqual([]);
    expect(packet.strategies).toEqual([]);
    expect(packet.gaps.map(({ code }) => code)).toContain("no_supported_claim");
    const compact = compactEvidencePacket(packet);
    expect(compact.state).toBe("unknown");
    for (const key of ["claims", "evidence", "strategies", "catalog"]) expect(compact).not.toHaveProperty(key);
  });

  it.each(["none", "discovery", "quest_minor", "quest_major", "ending"] as const)("does not borrow another house under spoiler ceiling %s", async (spoilerCeiling) => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("Where is House Roberts based?", { ...context, spoilerCeiling });
    expect(packet.answer_state).toBe("unknown");
    expect(packet.claims).toEqual([]);
  });

  it("preserves the known location answer instead of blocking the entire predicate", async () => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("Where is St. Halssius's House of Healing?", context);
    expect(packet.answer_state).toBe("supported");
    expect(packet.claims.map(({ claim_id }) => claim_id)).toEqual(["clm_c26a38f457062d1e0f6d5805"]);
    expect(packet.claims.every(({ subject_entity_id }) => subject_entity_id === "ent_6544449c3131fe4782f2e829")).toBe(true);
  });

  it("prefers the exact recipe name over a fuzzy neighboring recipe", async () => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer("What is Creamy Meat Soup?", context);
    expect(packet.claims.map(({ claim_id }) => claim_id)).toEqual(["clm_183c6a48d848c6a671885900"]);
    expect(packet.concise_answer).not.toContain("Meatball Soup");
    expect(packet.answer_state).toBe("partial");
    expect(packet.gaps.map(({ code }) => code)).toContain("post_patch_review_needed");
  });

  it.each([
    "How do I complete Return of the Comrad?",
    "how do i complete return of the comrad?",
    "How do I complete Return of the Comrade?",
  ])("keeps the specific quest instead of its exact short-name neighbor: %s", async (query) => {
    const { store } = await validStore();
    const quest = store.entities.find(({ canonical_name }) => canonical_name.text === "Return of the Comrade");
    expect(quest).toBeDefined();
    const packet = new KnowledgeIndex(store).answer(query, context);
    expect(packet.claims.length).toBeGreaterThan(0);
    expect(packet.claims.every(({ subject_entity_id }) => subject_entity_id === quest!.entity_id)).toBe(true);
    expect(packet.concise_answer).not.toContain("Return: ");
  });

  it("keeps the short exact quest when it is actually requested", async () => {
    const { store } = await validStore();
    const quest = store.entities.find(({ canonical_name }) => canonical_name.text === "Return");
    expect(quest).toBeDefined();
    const packet = new KnowledgeIndex(store).answer("How do I complete Return?", context);
    expect(packet.claims.length).toBeGreaterThan(0);
    expect(packet.claims.every(({ subject_entity_id }) => subject_entity_id === quest!.entity_id)).toBe(true);
  });

  it.each([
    "What ingredients are needed to make Creamy Meat Soup?",
    "Which ingredients are required to craft Creamy Meat Soup?",
  ])("returns recipe inputs rather than scroll-learning requirements: %s", async (query) => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer(query, context);
    const inputs = packet.claims.filter(({ predicate }) => predicate === "recipe.input");
    expect(inputs.map(({ object }) => object)).toEqual(expect.arrayContaining([
      { kind: "string", value: "Salt ×1" }, { kind: "string", value: "Milk ×3" },
      { kind: "string", value: "Water ×3" }, { kind: "string", value: "Fine Meat ×3" },
      { kind: "string", value: "Vegetable ×3" },
    ]));
    expect(inputs).toHaveLength(5);
    expect(packet.claims.every(({ subject_entity_id, predicate }) => subject_entity_id === "ent_3f8a9d8c6073e808a0b25f2d" && ["recipe.input", "relation.crafted_from"].includes(predicate))).toBe(true);
    expect(packet.concise_answer).not.toContain("Learning route");
    expect(packet.answer_state).toBe("partial");
    expect(packet.gaps.map(({ code }) => code)).toContain("post_patch_review_needed");
  });

  it("keeps bounded typo/alias answers and exploratory search usable", async () => {
    const { store } = await validStore();
    const index = new KnowledgeIndex(store);
    for (const query of ["Refinment Token", "Refinement Tokens"]) {
      const packet = index.answer(query, context);
      expect(packet.claims.length).toBeGreaterThan(0);
      expect(packet.claims.every(({ subject_entity_id }) => subject_entity_id === "ent_d53fbb61a6cb4b11c3e3b502")).toBe(true);
    }
    expect(index.search("Refinment Token", context, 10, 0).hits[0]?.title).toBe("Refinement Token");
    expect(index.search("House", context, 10, 0).hits.length).toBeGreaterThan(0);
    expect(index.search("use seeds from quickslot", context, 10, 0).hits.length).toBeGreaterThan(0);
    expect(index.answer("Farming: use seeds from quickslot", context).claims.length).toBeGreaterThan(0);
  });

  it.each([
    ["Can controller inputs be remapped?", "1.09.00", "supported"],
    ["Can controller inputs be remapped?", "1.14.00", "partial"],
    ["Can controller inputs be remapped?", "9.99.00", "unknown"],
    ["Is Axiom Bracelet an item?", "1.14.00", "unknown"],
  ])("preserves the published control: %s at %s", async (query, patch, state) => {
    const { store } = await validStore();
    const packet = new KnowledgeIndex(store).answer(query, { ...context, patch, spoilerCeiling: "none" });
    expect(packet.answer_state).toBe(state);
    if (query.startsWith("Can controller")) expect(packet.claims.map(({ predicate }) => predicate)).toEqual(["controls.remapping_available"]);
    else expect(packet.claims).toEqual([]);
  });
});
