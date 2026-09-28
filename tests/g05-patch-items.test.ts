import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { sha256, stableRecordHash } from "../src/core/canonical-json.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { validStore } from "./helpers.js";
import { CURRENT_CORPUS } from "./support/current-coverage.js";

const receiptId = "rcp_g05patchitems2026092701";
const isG05 = (r: { provenance: { source_receipt_id?: string } }) => r.provenance.source_receipt_id === receiptId;
const context = { patch: "2.03.02", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "discovery" as const };
const newFiles = new Set(["entities", "claims", "receipts"].map(f => `canonical/${f}/g05-patch-items.json`));
// Test-local Git object digest: proves the entire earlier data tree is unchanged,
// without requiring an old commit in a shallow CI checkout or duplicating its payload.
function objectHash(kind: string, bytes: Buffer): Buffer {
  return createHash("sha1").update(`${kind} ${bytes.length}\0`).update(bytes).digest();
}
async function priorDataTree(path: string, relative = ""): Promise<Buffer> {
  const entries = await readdir(path, { withFileTypes: true });
  const retained = entries.filter(e => !newFiles.has(relative ? `${relative}/${e.name}` : e.name));
  retained.sort((a, b) => Buffer.compare(Buffer.from(a.name + (a.isDirectory() ? "/" : "")), Buffer.from(b.name + (b.isDirectory() ? "/" : ""))));
  const parts: Buffer[] = [];
  for (const e of retained) {
    if (!e.isDirectory() && !e.isFile()) throw new Error(`Unexpected data entry: ${e.name}`);
    const next = relative ? `${relative}/${e.name}` : e.name;
    const hash = e.isDirectory() ? await priorDataTree(resolve(path, e.name), next) : objectHash("blob", await readFile(resolve(path, e.name)));
    parts.push(Buffer.from(`${e.isDirectory() ? "40000" : "100644"} ${e.name}\0`), hash);
  }
  return objectHash("tree", Buffer.concat(parts));
}
type Ledger = {
  prior_data_tree: string; receipt_payload_sha256: string; event_count: number;
  mapping: Array<{ claim_id: string; entity_id: string; predicate: string; evidence_id: string; patch: string; source_locator: string; event: string }>;
  canonical_files: Array<{ path: string; sha256: string }>;
  held_or_already_represented: Array<{ board: number; disposition: string; reason: string }>;
};
async function setup() {
  const { root, store } = await validStore();
  const ledger = JSON.parse(await readFile(resolve(root, "quality/g05-patch-item-review.json"), "utf8")) as Ledger;
  return { root, store, ledger, index: new KnowledgeIndex(store) };
}
const questions = [
  ["What changed for Crow Cloth Blindfold in patch 2.02.00?", "2.02.00", "clm_g05blindfoldvisual0001"],
  ["What changed for Lumberjacks' Witness Report in patch 2.03.00?", "2.03.00", "clm_g05reportrespawn0001"],
  ["What changed for Vaporwalker in patch 2.03.00?", "2.03.00", "clm_g05vaporwalkerchange0001"],
  ["What are the effects of Vaporwalker?", "2.03.00", "clm_g05vaporwalkereffect0001"],
] as const;

describe("G05 named item changes, not blanket equipment freshness", () => {
  it("preserves the full previous data tree and admits exactly three identities and four claim facets", async () => {
    const { root, store, ledger } = await setup();
    expect(ledger.prior_data_tree).toBe("065e1aeae0a3abb17f6c109a0c257dc94ce11372");
    expect((await priorDataTree(resolve(root, "data"))).toString("hex")).toBe(ledger.prior_data_tree);
    const entities = store.entities.filter(isG05), claims = store.claims.filter(isG05);
    expect(entities).toHaveLength(3);
    expect(claims).toHaveLength(4);
    expect(store.evidence.filter(isG05)).toEqual([]);
    expect(store.patches.filter(isG05)).toEqual([]);
    expect([store.entities.length, store.claims.length, store.evidence.length, store.patches.length, store.receipts.length]).toEqual([CURRENT_CORPUS.entity_records, CURRENT_CORPUS.claims, CURRENT_CORPUS.evidence, CURRENT_CORPUS.patches, CURRENT_CORPUS.receipts]);
    expect([store.entities.filter(e => !isG05(e)).length, store.claims.filter(c => !isG05(c)).length, store.evidence.length, store.patches.length, store.receipts.filter(r => r.receipt_id !== receiptId).length]).toEqual([592,2696,310,48,11]);
    const records = [...entities, ...claims].sort((a, b) => ("claim_id" in a ? a.claim_id : a.entity_id).localeCompare("claim_id" in b ? b.claim_id : b.entity_id));
    const receipt = store.receipts.find(r => r.receipt_id === receiptId)!;
    expect(receipt.state).toBe("accepted");
    expect(receipt.related_record_ids).toEqual(records.map(r => "claim_id" in r ? r.claim_id : r.entity_id));
    expect(receipt.payload_sha256).toBe(stableRecordHash(records));
    expect(receipt.payload_sha256).toBe(ledger.receipt_payload_sha256);
    for (const f of ledger.canonical_files) expect(sha256(await readFile(resolve(root, f.path))), f.path).toBe(f.sha256);
    for (const entity of entities) {
      expect(entity).toMatchObject({ entity_type: "item", subtype: "item", aliases: [] });
      expect(store.entities.filter(e => [e.canonical_name, ...e.aliases].some(n => n.text.toLowerCase() === entity.canonical_name.text.toLowerCase())).map(e => e.entity_id)).toEqual([entity.entity_id]);
    }
  });

  it("binds all item assertions to the exact supporting notice without changing source ownership or review bounds", async () => {
    const { store, ledger, index } = await setup();
    expect(ledger.mapping.map(m => m.claim_id).sort()).toEqual(store.claims.filter(isG05).map(c => c.claim_id).sort());
    expect(new Set(ledger.mapping.map(m => m.event)).size).toBe(3);
    expect(ledger.event_count).toBe(3);
    for (const m of ledger.mapping) {
      const c = store.claims.find(c => c.claim_id === m.claim_id)!;
      expect(c).toMatchObject({ subject_entity_id: m.entity_id, predicate: m.predicate, status: "official", behavior_kind: "intended", confidence: 0.98, evidence_ids: [m.evidence_id], spoiler_level: "discovery" });
      expect(c.validity).toMatchObject({ from_patch: m.patch, reviewed_through_patch: m.patch, through_patch: null, locales: ["en-US"] });
      expect(m.source_locator.length).toBeGreaterThan(10);
      expect(c.supersedes_claim_ids).toBeUndefined();
      const e = store.evidence.find(e => e.evidence_id === m.evidence_id)!;
      expect(e).toMatchObject({ evidence_type: "official_patch", rights: { license_status: "publisher_owned", retention_mode: "normalized_facts" }, reliability: { independence_group: "pearl-abyss-official-updates", tier: "primary_official" } });
      expect(e.captured_at).toBe("2026-09-27T22:24:01Z");
      expect(index.claimsForEntity(m.entity_id, { ...context, patch: "2.01.00" })).toEqual([]);
      expect(index.claimsForEntity(m.entity_id, { ...context, spoilerCeiling: "none" })).toEqual([]);
      if (m.patch === "2.03.00") expect(index.claimsForEntity(m.entity_id, { ...context, platform: "mac-app-store" })).toEqual([]);
    }
    expect(index.claimsForEntity("ent_g05crowblindfold0001", { ...context, patch: "2.02.00", platform: "mac-app-store" }).map(c => c.claim_id)).toEqual(["clm_g05blindfoldvisual0001"]);
    const old = store.claims.find(c => c.claim_id === "clm_g046e24575629f8da1d9616354b")!;
    expect(old.subject_entity_id).toBe("ent_g04b34d1c5c4f538f0331ae1ee0");
    expect(old.evidence_ids).toEqual(["evd_g04notice1310001"]);
  });

  it("answers named item effects and patch history positively while preserving current-patch uncertainty", async () => {
    const { index } = await setup();
    for (const [q, patch, claim] of questions) {
      const answer = index.answer(q, { ...context, patch });
      expect(answer.claims.map(c => c.claim_id), q).toEqual([claim]);
      expect(answer.answer_state, q).toBe("supported");
      expect(index.answer(q, { ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
    }
    const current = index.answer("What are the effects of Vaporwalker?", context);
    expect(current.claims.map(c => c.claim_id)).toEqual(["clm_g05vaporwalkereffect0001"]);
    expect(current.answer_state).toBe("partial");
    expect(current.gaps.map(g => g.code)).toContain("post_patch_review_needed");
    for (const name of ["Vaporwalker", "Crow Cloth Blindfold", "Lumberjacks' Witness Report"]) {
      expect(index.answer(`Where can I get ${name}?`, context).claims).toEqual([]);
    }
  });

  it("does not invent item targets for broad fixes, item statistics, or unwithheld S02 records", async () => {
    const { store, ledger } = await setup();
    expect(ledger.held_or_already_represented).toHaveLength(12);
    expect(ledger.held_or_already_represented.every(r => r.reason.length > 20)).toBe(true);
    expect(store.claims.filter(isG05).every(c => ["patch.resolved_issue", "patch.changed_availability", "patch.changed_behavior", "item.effect_summary"].includes(c.predicate))).toBe(true);
    const poster = store.entities.find(e => e.entity_id === "ent_g05lumberjackreport0001")!;
    expect(poster.summary).toContain("does not establish inventory collectability");
    expect(store.claims.some(c => c.claim_id.startsWith("clm_s02"))).toBe(false);
    expect(store.evidence.some(e => e.evidence_id.startsWith("evd_s02"))).toBe(false);
    expect(store.receipts.some(r => r.receipt_id === "rcp_s02acquisition2026091101")).toBe(false);
  });

  it("returns the same nonempty item answers through full/compact REST and actual stdio MCP", async () => {
    const { root, store } = await setup();
    const client = new Client({ name: "g05-item-consumer", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", resolve(root, "src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const descriptor = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in descriptor)) throw new Error("Expected service JSON");
      const app = createApp(store, { buildId: JSON.parse(descriptor.text).build_id });
      for (const format of ["full", "compact"]) for (const [q, patch, claim] of questions) {
        const args = { q, patch, format, platform: "pc-steam", locale: "en-US", spoiler: "discovery" };
        const rest = await app.request(`/v1/answer?${new URLSearchParams(args)}`), body = await rest.json();
        const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
        expect(rest.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(JSON.stringify(body)).toContain(claim);
        expect(body[format === "compact" ? "state" : "answer_state"]).toBe("supported");
        expect(body.claims).toHaveLength(1);
      }
    } finally { await client.close(); }
  }, 30_000);
});
