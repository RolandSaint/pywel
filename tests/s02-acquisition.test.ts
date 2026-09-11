import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { sha256, stableRecordHash } from "../src/core/canonical-json.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { validStore } from "./helpers.js";

const receipt = "rcp_s02acquisition2026091101";
const context = { patch: "2.01.00", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };
const isS02 = (r: { provenance: { source_receipt_id?: string } }) => r.provenance.source_receipt_id === receipt;
type Entry = { kind: string; claim_id: string; label?: string; url?: string; station_label?: string; seller_label?: string; shop_label?: string; target_entity_id?: string; stage_label?: string };
type Row = { entity_id: string; name: string; evidence_id: string; entries: Entry[] };
type Ledger = { counts: { claim_kinds: Record<string, number> }; selection: Row[]; prior_canonical_files: Record<string, string>; prior_claims_sha256: string; prior_entities_sha256: string };
async function setup() {
  const { root, store } = await validStore();
  const ledger = JSON.parse(await readFile(resolve(root, "quality/s02-acquisition-review.json"), "utf8")) as Ledger;
  return { root, store, ledger, index: new KnowledgeIndex(store) };
}

describe("S02 acquisition depth without implied current availability", () => {
  it("preserves every prior canonical file and admits only the approved 100 existing subjects", async () => {
    const { root, store, ledger } = await setup();
    for (const [path, hash] of Object.entries(ledger.prior_canonical_files)) expect(sha256(await readFile(resolve(root, path))), path).toBe(hash);
    expect(store.entities.filter(isS02)).toEqual([]);
    const claims = store.claims.filter(isS02), evidence = store.evidence.filter(isS02);
    expect([claims.length, evidence.length]).toEqual([245, 103]);
    expect(store.receipts.filter(r => r.receipt_id === receipt)).toHaveLength(1);
    expect(new Set(claims.map(c => c.subject_entity_id)).size).toBe(100);
    expect(ledger.selection).toHaveLength(100);
    expect(stableRecordHash(store.claims.filter(c => !isS02(c)).sort((a,b) => a.claim_id.localeCompare(b.claim_id)))).toBe(ledger.prior_claims_sha256);
    expect(stableRecordHash([...store.entities].sort((a,b) => a.entity_id.localeCompare(b.entity_id)))).toBe(ledger.prior_entities_sha256);
    const evidenceIds = new Set(evidence.map(e => e.evidence_id));
    const claimIds = new Set(claims.map(c => c.claim_id));
    expect(claimIds.size).toBe(245);
    expect(evidenceIds.size).toBe(103);
    for (const c of claims) {
      expect(c.evidence_ids.every(id => evidenceIds.has(id))).toBe(true);
      expect([c.status, c.behavior_kind]).toEqual(["inferred", "historical"]);
      expect(c.validity).toEqual({ from_patch: null, through_patch: null, reviewed_through_patch: null, platforms: ["pc-steam"], locales: ["en-US"] });
      expect(c.supersedes_claim_ids).toBeUndefined();
      expect(["item.acquisition", "item.requirement", "relation.obtained_from"]).toContain(c.predicate);
    }
    const kindCounts: Record<string, number> = {};
    for (const row of ledger.selection) {
      expect(store.entities.find(e => e.entity_id === row.entity_id)?.canonical_name.text).toBe(row.name);
      expect(store.claims.filter(c => !isS02(c) && c.subject_entity_id === row.entity_id && c.predicate === "item.acquisition")).toEqual([]);
      for (const entry of row.entries) {
        kindCounts[entry.kind] = (kindCounts[entry.kind] ?? 0) + 1;
        expect(claimIds.has(entry.claim_id)).toBe(true);
      }
      expect(row.entries.some(e => ["crafting_station", "vendor", "quest_listing", "guide_route"].includes(e.kind))).toBe(true);
    }
    expect(kindCounts).toEqual(ledger.counts.claim_kinds);
    const sources = JSON.parse(await readFile(resolve(root, "quality/corpus-additions.json"), "utf8")) as { reviewed_sources: Array<{ evidence_id: string; url: string }> };
    for (const e of evidence) {
      expect(sources.reviewed_sources.find(s => s.evidence_id === e.evidence_id)?.url).toBe(e.source.url);
      expect(e.rights).toMatchObject({ retention_mode: "normalized_facts", license_status: "publisher_owned" });
    }
  });

  it("improves all 100 standard acquisition questions without substituting another subject", async () => {
    const { store, ledger, index } = await setup();
    const oldIndex = new KnowledgeIndex({ ...store, claims: store.claims.filter(c => !isS02(c)), evidence: store.evidence.filter(e => !isS02(e)), receipts: store.receipts.filter(r => r.receipt_id !== receipt) });
    for (const row of ledger.selection) {
      const q = `Where can I get ${row.name}?`;
      expect(oldIndex.answer(q, context).claims, q).toEqual([]);
      const answer = index.answer(q, context);
      expect(answer.answer_state, q).toBe("partial");
      expect(answer.claims.length, q).toBeGreaterThan(0);
      expect(answer.claims.every(c => isS02(c) && c.subject_entity_id === row.entity_id), q).toBe(true);
      expect(answer.gaps.map(g => g.code), q).toContain("post_patch_review_needed");
    }
  });

  it("keeps every crafting station and learning record tied to its stated route", async () => {
    const { store, ledger } = await setup();
    for (const row of ledger.selection) for (const entry of row.entries) {
      const c = store.claims.find(c => c.claim_id === entry.claim_id)!;
      if (entry.kind === "crafting_requirement") {
        expect(c.predicate).toBe("item.requirement");
        expect(c.object.kind).toBe("string");
        if (c.object.kind === "string") {
          expect(c.object.value).toContain("For the crafting route only");
          expect(c.object.value).toContain(entry.label);
          expect(c.object.value).toContain(entry.url);
          expect(c.object.value).toContain("not a prerequisite for every acquisition route");
        }
      }
      if (entry.kind === "crafting_station" && c.object.kind === "string") expect(c.object.value).toContain(`station label "${entry.station_label}"`);
      if (entry.kind === "vendor" && c.object.kind === "string") {
        expect(c.object.value).toContain(entry.seller_label);
        expect(c.object.value).toContain(`shop label "${entry.shop_label}"`);
        expect(c.object.value).toContain("not verified");
      }
      if (entry.kind === "map_lead" && c.object.kind === "string") {
        expect(c.object.value).toContain(entry.url);
        expect(c.object.value).toContain("does not establish a pickup method");
      }
    }
  });

  it.each([
    ["Aeserion Sword", "Aeserion Gear Blueprint"],
    ["Fluttering Radiance Plate Boots", "/miscellaneous/fluttering-radiance-plate-boots"],
    ["Kuku Bismuth Spear", "Kuku Spear Special Blueprint"],
    ["Kuku Rishi's Boots", "Kuku Gear Special Blueprint"],
  ])("returns the supported crafting requirement for %s without self-reference", async (name, label) => {
    const { index } = await setup();
    const answer = index.answer(`What is required to craft ${name}?`, context);
    expect(answer.answer_state).toBe("partial");
    expect(answer.claims.some(c => c.predicate === "item.requirement" && c.object.kind === "string" && c.object.value.includes(label))).toBe(true);
    expect(answer.claims.some(c => c.predicate === "item.requirement" && c.object.kind === "entity" && c.object.entity_id === c.subject_entity_id)).toBe(false);
  });

  it("links exact quest stages rather than series names or same-named actors", async () => {
    const { store } = await setup();
    const relations = store.claims.filter(c => isS02(c) && c.predicate === "relation.obtained_from");
    expect(relations).toHaveLength(3);
    const names = relations.map(c => {
      if (c.object.kind !== "entity") return null;
      const targetId = c.object.entity_id;
      return store.entities.find(e => e.entity_id === targetId)?.canonical_name.text;
    });
    expect(names.sort()).toEqual(["Lonely Jackals", "Master of a Forgotten Land", "Toward the Nest"].sort());
    expect(names).not.toContain("Black and White");
    expect(names).not.toContain("Priscus the Ancient");
  });

  it("withholds acquisition metadata below the spoiler ceiling and keeps epilogue context at ending", async () => {
    const { ledger, index } = await setup();
    for (const row of ledger.selection) {
      for (const ceiling of ["none", "discovery", "quest_minor"] as const) {
        const packet = index.answer(`Where can I get ${row.name}?`, { ...context, spoilerCeiling: ceiling });
        expect(packet.claims, row.name).toEqual([]);
        expect(packet.evidence, row.name).toEqual([]);
      }
      const effects = index.answer(`What are the effects of ${row.name}?`, { ...context, spoilerCeiling: "discovery" });
      expect(effects.claims.some(isS02), row.name).toBe(false);
      expect(effects.evidence.some(isS02), row.name).toBe(false);
    }
    const q = "Where can I get Dark Executioner Leather Armor?";
    const lower = index.answer(q, context);
    expect(JSON.stringify(lower)).not.toContain("The Heart of Pywel");
    expect(JSON.stringify(lower)).not.toContain("Epilogue");
    const ending = index.answer(q, { ...context, spoilerCeiling: "ending" });
    expect(ending.claims.some(c => c.spoiler_level === "ending" && c.object.kind === "string" && c.object.value.includes("The Heart of Pywel"))).toBe(true);
  });

  it("retains platform, unknown-patch and absent-name boundaries", async () => {
    const { index } = await setup();
    expect(index.answer("Where can I get Aeserion Sword?", { ...context, platform: "playstation-5" }).claims).toEqual([]);
    expect(index.answer("Where can I get Aeserion Sword?", { ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
    expect(index.answer("Where can I get Zorblax Alloy Cuirass?", context).claims).toEqual([]);
  });

  it("preserves the same qualified answers through full/compact REST and real stdio MCP", async () => {
    const { root, store } = await setup();
    const client = new Client({ name: "s02-acquisition-consumer", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", resolve(root, "src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const descriptor = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in descriptor)) throw new Error("Expected service JSON");
      const app = createApp(store, { buildId: JSON.parse(descriptor.text).build_id });
      for (const format of ["compact", "full"]) for (const q of ["What is required to craft Aeserion Sword?", "Where can I get Kuku Bismuth Spear?", "Where can I get Blackwing Mask?", "Where can I get Kadel Mace?", "Where can I get Dark Executioner Leather Armor?"]) {
        const args = { q, patch: "2.01.00", platform: "pc-steam", locale: "en-US", spoiler: "quest_major", format };
        const response = await app.request(`/v1/answer?${new URLSearchParams(args)}`);
        const body = await response.json();
        const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
        expect(response.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(body[format === "compact" ? "state" : "answer_state"]).toBe("partial");
        expect(body.claims.length).toBeGreaterThan(0);
        if (q.includes("Dark Executioner")) expect(JSON.stringify(body)).not.toContain("The Heart of Pywel");
      }
    } finally { await client.close(); }
  }, 30_000);
});
