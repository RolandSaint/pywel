import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { compactEvidencePacket } from "../src/api/compact.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { validStore } from "./helpers.js";

const receipt = "rcp_m8aprogression2026091001";
const trial = "ent_2beedf6ea02e8ba696464bb3";
const stolen = "ent_6dd97bc94c6fe241d0bb1a0e";
const sealed = "ent_d1b3b818dfa863a35aab7680";
const honor = "ent_d3de309d4578b75dc73ee5f2";
const context = { patch: "1.14.00", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };
const questions = [
  ["How do I unlock First Trial of Trust?", trial, "quest.prerequisite", 1, true],
  ["What rewards does First Trial of Trust give?", trial, "quest.reward", 1, true],
  ["How do I unlock Stolen Quarry?", stolen, "quest.prerequisite", 1, true],
  ["What rewards does Stolen Quarry give?", stolen, "quest.reward", 3, true],
  ["How do I unlock Sealed in Stone?", sealed, "quest.prerequisite", 1, true],
  ["What rewards does Sealed in Stone give?", sealed, "quest.reward", 1, true],
  ["How do I unlock The Count's Honor?", honor, "quest.prerequisite", 1, false],
  ["What rewards does The Count's Honor give?", honor, "quest.reward", 5, true],
] as const;

// Historical guide assertions, not independent gameplay or exhaustive unlock conditions.
describe("M8A four-quest entry and selected rewards", () => {
  it.each(questions)("answers the agreed question with qualified facts: %s", async (query, subject, predicate, count) => {
    const packet = new KnowledgeIndex((await validStore()).store).answer(query, context);
    expect(packet.answer_state).toBe("partial");
    expect(packet.claims).toHaveLength(count);
    expect(packet.claims.every(claim => claim.subject_entity_id === subject && claim.predicate === predicate)).toBe(true);
    expect(packet.claims.every(claim => claim.status === "inferred" && claim.behavior_kind === "historical" && claim.validity.reviewed_through_patch === null)).toBe(true);
    expect(packet.evidence.length).toBeGreaterThan(0);
    for (const claim of packet.claims) {
      expect(claim.validity.platforms).toEqual(["pc-steam"]);
      expect(claim.evidence_ids.every(id => packet.evidence.some(evidence => evidence.evidence_id === id))).toBe(true);
    }
    expect(packet.gaps.map(gap => gap.code)).toContain("post_patch_review_needed");
    expect(compactEvidencePacket(packet).state).toBe("partial");
  });

  it("distinguishes seven new answers from the prerequisite already accepted in M7", async () => {
    const { store } = await validStore();
    const prior = new KnowledgeIndex({ ...store, claims: store.claims.filter(claim => claim.provenance.source_receipt_id !== receipt) });
    for (const [query, subject, predicate, , added] of questions) {
      const matches = prior.answer(query, context).claims.filter(claim => claim.subject_entity_id === subject && claim.predicate === predicate);
      expect(matches).toHaveLength(added ? 0 : 1);
    }
    expect(prior.answer(questions[6][0], context).claims[0]?.claim_id).toBe("clm_5331d0c7c8d821bd1c38dbfd");
  });

  it("keeps exact entry conditions, reward amounts and the no-direct-item distinction", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    expect(index.answer(questions[0][0], context).concise_answer).toContain("House Roberts's Servant");
    expect(index.answer(questions[0][0], context).concise_answer).toContain("Bluemont Manor");
    expect(index.answer(questions[2][0], context).claims[0]?.object).toEqual({ kind: "string", value: "Complete Troubled Count." });
    expect(index.answer(questions[4][0], context).claims[0]?.object).toEqual({ kind: "entity", entity_id: stolen });
    expect(index.answer(questions[6][0], context).claims[0]?.object).toEqual({ kind: "entity", entity_id: sealed });
    expect(index.answer(questions[1][0], context).claims[0]?.object).toEqual({ kind: "number", value: 100, unit: "Hernandian Contribution" });
    const quarryRewards = index.answer(questions[3][0], context).claims.map(claim => claim.object);
    expect(quarryRewards).toEqual(expect.arrayContaining([
      { kind: "string", value: "Gold Vein Map x1 (Excavatron encounter reward)." },
      { kind: "string", value: "Mining Knuckledrill x1 (Excavatron encounter reward)." },
      { kind: "number", value: 100, unit: "Hernandian Contribution" },
    ]));
    const noItems = index.answer(questions[5][0], context);
    expect(noItems.concise_answer).toContain("No direct item reward");
    expect(noItems.concise_answer).not.toMatch(/Palmar|Transporter|Treasure/);
    expect(index.answer(questions[7][0], context).claims.map(claim => claim.object)).toEqual(expect.arrayContaining([
      { kind: "string", value: "Azurite x3." },
      { kind: "string", value: "Bloodstone x3." },
      { kind: "string", value: "Engraved Gold Earring x1." },
      { kind: "number", value: 200, unit: "Hernandian Contribution" },
      { kind: "string", value: "Formal Alliance with House Roberts." },
    ]));
  });

  it("preserves source, platform, spoiler and unknown-patch boundaries", async () => {
    const { store } = await validStore();
    const additions = store.claims.filter(claim => claim.provenance.source_receipt_id === receipt);
    expect(additions).toHaveLength(13);
    expect(additions.every(claim => [trial, stolen, sealed, honor].includes(claim.subject_entity_id))).toBe(true);
    for (const claim of additions) {
      expect(claim.validity).toMatchObject({ from_patch: null, through_patch: null, reviewed_through_patch: null, platforms: ["pc-steam"] });
    }
    const index = new KnowledgeIndex(store);
    for (const [query] of questions) {
      for (const platform of ["playstation-5", "xbox-series", "pc-epic"] as const) {
        expect(index.answer(query, { ...context, platform }).claims).toEqual([]);
      }
      expect(index.answer(query, { ...context, spoilerCeiling: "none" }).claims).toEqual([]);
      expect(index.answer(query, { ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
    }
    expect(index.answer("What rewards does House Zorblax give?", context).claims).toEqual([]);
    expect(index.answer("Who leads House Roberts?", context).answer_state).toBe("unknown");
  });

  it("keeps the four associations and requested reward records in a combined query", async () => {
    const packet = new KnowledgeIndex((await validStore()).store).answer("Which quests belong to House Roberts and what are their rewards?", context);
    expect(packet.answer_state).toBe("partial");
    expect(packet.claims.filter(claim => claim.predicate === "quest.organization")).toHaveLength(4);
    expect(packet.claims.filter(claim => claim.predicate === "quest.reward")).toHaveLength(10);
    expect(packet.claims.every(claim => [trial, stolen, sealed, honor].includes(claim.subject_entity_id))).toBe(true);
  });

  it("returns the same qualified answers through full/compact REST and real stdio MCP", async () => {
    const { root, store } = await validStore();
    const client = new Client({ name: "pywel-m8a-contract-test", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", resolve(root, "src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const resource = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in resource)) throw new Error("Expected JSON service descriptor");
      const service = JSON.parse(resource.text) as { build_id: string };
      const app = createApp(store, { buildId: service.build_id });
      for (const [q, subject, predicate, count] of questions) {
        for (const format of ["full", "compact"]) {
          const args = { q, patch: context.patch, platform: context.platform, locale: context.locale, spoiler: context.spoilerCeiling, format };
          const response = await app.request(`/v1/answer?${new URLSearchParams(args)}`);
          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body[format === "full" ? "answer_state" : "state"]).toBe("partial");
          if (format === "full") {
            expect(body.claims).toHaveLength(count);
            expect(body.claims.every((claim: { subject_entity_id: string; predicate: string }) => claim.subject_entity_id === subject && claim.predicate === predicate)).toBe(true);
          }
          const result = await client.callTool({ name: "pywel_answer", arguments: args });
          expect(result.isError).not.toBe(true);
          expect(result.structuredContent).toEqual(body);
        }
      }
    } finally { await client.close(); }
  }, 30_000);
});
