import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { compactEvidencePacket } from "../src/api/compact.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { validStore } from "./helpers.js";

const receipt = "rcp_r01equipment2026091001";
const sword = "ent_m8brighteousverdict0001";
const ring = "ent_m8bwitchsring0000001";
const context = { patch: "1.14.00", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };
const old = ["clm_m8bswordcrit2026091001", "clm_m8bringspeed2026091001", "clm_m8bringstamina2026091001"];
const selected = [
  ["clm_r01swordattack05", sword, "+5", "Attack 24"],
  ["clm_r01swordattack10", sword, "+10", "Attack 39"],
  ["clm_r01swordcritical05", sword, "+5", "Critical Rate Level 2"],
  ["clm_r01swordcritical10", sword, "+10", "Critical Rate Level 3"],
  ["clm_r01ringattack05", ring, "+5", "Attack 2"],
  ["clm_r01ringattack10", ring, "+10", "Attack 3"],
  ["clm_r01ringspeed05", ring, "+5", "Attack Speed Level 2"],
  ["clm_r01ringspeed10", ring, "+10", "Attack Speed Level 4"],
] as const;

describe("R01 database-backed equipment reconciliation", () => {
  it.each(selected)("retains one qualified source field at its refinement: %s", async (id, subject, refinement, value) => {
    const { store } = await validStore();
    const claim = store.claims.find(record => record.claim_id === id);
    expect(claim).toMatchObject({ subject_entity_id: subject, predicate: "item.effect_summary", status: "inferred", behavior_kind: "historical", object: { kind: "string" } });
    if (claim?.object.kind !== "string") throw new Error("Missing database field");
    expect(claim.object.value).toContain(refinement);
    expect(claim.object.value).toContain(value);
    expect(claim.object.value).toMatch(/database/i);
    expect(claim.validity).toMatchObject({ from_patch: null, through_patch: null, reviewed_through_patch: null, platforms: ["pc-steam"] });
    expect(claim.evidence_ids.length).toBeGreaterThan(0);
  });

  it("replaces three less precise summaries without deleting their historical records", async () => {
    const { store } = await validStore();
    expect(store.claims.filter(claim => claim.provenance.source_receipt_id === receipt)).toHaveLength(12);
    expect(store.claims.filter(claim => old.includes(claim.claim_id))).toHaveLength(3);
    const index = new KnowledgeIndex(store);
    for (const name of ["Righteous Verdict", "Witch's Ring"]) {
      const current = index.answer(`What effects does ${name} have?`, context);
      expect(current.answer_state).toBe("partial");
      expect(current.claims.some(claim => old.includes(claim.claim_id))).toBe(false);
      expect(current.gaps.map(gap => gap.code)).toContain("post_patch_review_needed");
    }
    const historical = new KnowledgeIndex({ ...store, claims: store.claims.filter(claim => claim.provenance.source_receipt_id !== receipt) });
    expect(historical.answer("What effects does Righteous Verdict have?", context).claims.map(claim => claim.claim_id)).toContain(old[0]);
    expect(historical.answer("What effects does Witch's Ring have?", context).claims.map(claim => claim.claim_id)).toEqual(expect.arrayContaining(old.slice(1)));
    expect(index.claimsForEntity(ring, { ...context, includeSuperseded: true }).map(claim => claim.claim_id)).toEqual(expect.arrayContaining(old.slice(1)));
  });

  it("keeps the stamina field unresolved rather than calling its percentage verified regeneration", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    const packet = index.answer("What effects does Witch's Ring have?", context);
    const gap = packet.claims.find(claim => claim.claim_id === "clm_r01ringstaminameaning");
    expect(gap?.object).toMatchObject({ kind: "unknown", state: "unknown" });
    if (gap?.object.kind !== "unknown") throw new Error("Missing typed stamina uncertainty");
    expect(gap.object.reason).toContain("Stamina_UseResourceIncreaseRate");
    expect(gap.object.reason).toContain("+6%");
    expect(gap.object.reason).toMatch(/meaning.*unresolved/i);
    expect(packet.claims.some(claim => claim.claim_id === old[2])).toBe(false);
    expect(compactEvidencePacket(packet).state).toBe("partial");
  });

  it("adds bounded vendor and quest links without promising stock or exclusive acquisition", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    const weapon = index.answer("Where can I get Righteous Verdict?", context);
    const accessory = index.answer("Where can I get Witch's Ring?", context);
    expect(weapon.claims).toHaveLength(2);
    expect(accessory.claims).toHaveLength(3);
    expect(weapon.concise_answer).toContain("Kathor");
    expect(weapon.concise_answer).toContain("Nightfell Expedition Camp");
    expect(accessory.concise_answer).toContain("Areciel");
    expect(accessory.concise_answer).toContain("Unwavering Steps");
    for (const packet of [weapon, accessory]) {
      expect(packet.answer_state).toBe("partial");
      expect(packet.concise_answer).toContain("not verified");
      expect(packet.concise_answer).not.toMatch(/only way|always in stock|guaranteed available/);
    }
  });

  it("resolves database evidence without asserting independent corroboration or new game coverage", async () => {
    const { store } = await validStore();
    const evidence = store.evidence.filter(record => record.provenance.source_receipt_id === receipt);
    expect(evidence).toHaveLength(3);
    expect(new Set(evidence.map(record => record.reliability.independence_group)).size).toBe(1);
    expect(evidence.every(record => record.evidence_type === "community_report" && record.rights.retention_mode === "normalized_facts")).toBe(true);
    const ids = new Set(store.evidence.map(record => record.evidence_id));
    for (const claim of store.claims.filter(record => record.provenance.source_receipt_id === receipt)) {
      expect(claim.evidence_ids.every(id => ids.has(id))).toBe(true);
      expect(claim.validity.reviewed_through_patch).toBeNull();
    }
  });

  it("preserves named-platform exclusion, default spoilers, and packet-level story boundaries", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    for (const name of ["Righteous Verdict", "Witch's Ring"]) {
      const query = `What effects does ${name} have?`;
      expect(index.answer(query, { ...context, platform: "playstation-5" }).claims).toEqual([]);
      expect(index.answer(query, { ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
      expect(index.answer(query, { ...context, spoilerCeiling: "none" }).claims).toEqual([]);
    }
    for (const spoilerCeiling of ["discovery", "quest_minor"] as const) {
      const packet = index.answer("What effects does Witch's Ring have?", { ...context, spoilerCeiling });
      for (const value of [packet, compactEvidencePacket(packet)]) expect(JSON.stringify(value)).not.toMatch(/Goyen|Nest of Valor|Thinning Blade|Chapter 9|Unwavering Steps/i);
      const acquisition = index.answer("Where can I get Witch's Ring?", { ...context, spoilerCeiling });
      expect(acquisition.claims.map(claim => claim.claim_id)).toEqual(["clm_r01ringvendor"]);
      expect(JSON.stringify(acquisition)).not.toMatch(/Goyen|Unwavering Steps|Thinning Blade|Chapter 9/i);
    }
    expect(index.answer("Where can I get Zorblax Verdict?", context).claims).toEqual([]);
  });

  it("returns reconciled records through full/compact REST and a real stdio MCP process", async () => {
    const { root, store } = await validStore();
    const client = new Client({ name: "pywel-r01-test", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", resolve(root, "src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const resource = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in resource)) throw new Error("Expected JSON descriptor");
      const app = createApp(store, { buildId: JSON.parse(resource.text).build_id });
      for (const [q, count] of [["Where can I get Righteous Verdict?", 2], ["What effects does Righteous Verdict have?", 6], ["Where can I get Witch's Ring?", 3], ["What effects does Witch's Ring have?", 5]] as const) {
        for (const format of ["full", "compact"]) {
          const args = { q, patch: context.patch, platform: context.platform, locale: context.locale, spoiler: context.spoilerCeiling, format };
          const response = await app.request(`/v1/answer?${new URLSearchParams(args)}`);
          const body = await response.json();
          expect(response.status).toBe(200);
          expect(body[format === "full" ? "answer_state" : "state"]).toBe("partial");
          if (format === "full") { expect(body.claims).toHaveLength(count); expect(body.claims.some((claim: { claim_id: string }) => old.includes(claim.claim_id))).toBe(false); }
          const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
          expect(mcp.isError).not.toBe(true);
          expect(mcp.structuredContent).toEqual(body);
        }
      }
    } finally { await client.close(); }
  }, 30_000);
});
