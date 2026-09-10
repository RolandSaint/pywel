import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { compactEvidencePacket } from "../src/api/compact.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { validStore } from "./helpers.js";

const receipt = "rcp_m8bequipment2026091001";
const sword = "ent_m8brighteousverdict0001";
const ring = "ent_m8bwitchsring0000001";
const context = { patch: "1.14.00", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };
const questions = [
  ["Where can I get Righteous Verdict?", sword, "item.acquisition", 1],
  ["What effects does Righteous Verdict have?", sword, "item.effect_summary", 3],
  ["Where can I get Witch's Ring?", ring, "item.acquisition", 1],
  ["What effects does Witch's Ring have?", ring, "item.effect_summary", 2],
] as const;

describe("M8B two-item acquisition and qualified effects", () => {
  it.each(questions)("answers the frozen equipment question: %s", async (query, subject, predicate, count) => {
    const packet = new KnowledgeIndex((await validStore()).store).answer(query, context);
    expect(packet.answer_state).toBe("partial");
    expect(packet.claims).toHaveLength(count);
    expect(packet.claims.every(claim => claim.subject_entity_id === subject && claim.predicate === predicate)).toBe(true);
    expect(packet.claims.every(claim => claim.status === "inferred" && claim.behavior_kind === "historical")).toBe(true);
    for (const claim of packet.claims) {
      expect(claim.validity).toMatchObject({ from_patch: null, through_patch: null, reviewed_through_patch: null, platforms: ["pc-steam"] });
      expect(claim.evidence_ids.length).toBeGreaterThan(0);
      expect(claim.evidence_ids.every(id => packet.evidence.some(evidence => evidence.evidence_id === id))).toBe(true);
    }
    expect(packet.gaps.map(gap => gap.code)).toContain("post_patch_review_needed");
    expect(compactEvidencePacket(packet).state).toBe("partial");
  });

  it("demonstrates four new answers rather than counting old or unrelated facts", async () => {
    const { store } = await validStore();
    const prior = new KnowledgeIndex({ ...store, entities: store.entities.filter(entity => entity.provenance.source_receipt_id !== receipt), claims: store.claims.filter(claim => claim.provenance.source_receipt_id !== receipt) });
    for (const [query] of questions) {
      expect(prior.answer(query, context).claims).toEqual([]);
      expect(prior.answer(query, context).answer_state).toBe("unknown");
    }
  });

  it("keeps the two acquisition routes distinct and avoids inventing exclusivity", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    const weapon = index.answer(questions[0][0], context).concise_answer;
    expect(weapon).toContain("Demeniss Ancestors' Ruins");
    expect(weapon).toContain("Nightfell Expedition Camp");
    expect(weapon).not.toContain("Goyen");
    const accessory = index.answer(questions[2][0], context).concise_answer;
    for (const term of ["Goyen", "Nest of Valor", "Thinning Blade", "Chapter 9"]) expect(accessory).toContain(term);
    expect(accessory).not.toContain("Demeniss Ancestors");
    expect(`${weapon} ${accessory}`).not.toMatch(/only way|cannot be crafted|cannot be purchased/i);
  });

  it("does not flatten source configurations into intrinsic or current numeric stats", async () => {
    const { store } = await validStore();
    const additions = store.claims.filter(claim => claim.provenance.source_receipt_id === receipt);
    expect(additions).toHaveLength(9);
    expect(additions.every(claim => [sword, ring].includes(claim.subject_entity_id))).toBe(true);
    expect(additions.some(claim => claim.predicate.startsWith("stat."))).toBe(false);
    const index = new KnowledgeIndex(store);
    const weapon = index.answer(questions[1][0], context).concise_answer;
    for (const term of ["Swift II", "Destruction I", "Insight I", "refinement-5", "Attack Speed Level 2", "Critical Rate Level 3"]) expect(weapon).toContain(term);
    expect(weapon).toContain("unsocketed");
    const accessory = index.answer(questions[3][0], context).concise_answer;
    expect(accessory).toContain("Attack Speed Level 4");
    expect(accessory).toContain("refined");
    expect(accessory).toContain("stamina regeneration");
    expect(accessory).toContain("magnitude is unresolved");
    expect(accessory).not.toMatch(/6%|8%|\+10/);
  });

  it("preserves platform, spoiler, fabricated-name and unknown-patch limits", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    for (const [query] of questions) {
      for (const platform of ["pc-epic", "mac-steam", "playstation-5", "xbox-series"] as const) expect(index.answer(query, { ...context, platform }).claims).toEqual([]);
      expect(index.answer(query, { ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
    }
    const hidden = index.answer(questions[2][0], { ...context, spoilerCeiling: "quest_minor" });
    expect(hidden.claims).toEqual([]);
    expect(hidden.concise_answer).not.toContain("Goyen");
    expect(index.answer("Where can I get Zorblax Verdict?", context).claims).toEqual([]);
    expect(index.answer("Where can I get Witch's Ring?", { ...context, spoilerCeiling: "none" }).evidence).toEqual([]);
  });

  it("keeps acquisition and effects together without cross-item substitutions", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    for (const [name, subject] of [["Righteous Verdict", sword], ["Witch's Ring", ring]]) {
      const packet = index.answer(`Where can I get ${name} and what effects does it have?`, context);
      expect(packet.claims.some(claim => claim.predicate === "item.acquisition")).toBe(true);
      expect(packet.claims.some(claim => claim.predicate === "item.effect_summary")).toBe(true);
      expect(packet.claims.every(claim => claim.subject_entity_id === subject)).toBe(true);
    }
  });

  it("returns matching full/compact REST and actual stdio MCP answers", async () => {
    const { root, store } = await validStore();
    const client = new Client({ name: "pywel-m8b-test", version: "1.0.0" });
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
