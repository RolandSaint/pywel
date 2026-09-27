import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { sha256, stableRecordHash } from "../src/core/canonical-json.js";
import { KnowledgeIndex } from "../src/core/query.js";
import type { CanonicalRecord, Platform } from "../src/core/types.js";
import { validStore } from "./helpers.js";
import { CURRENT_CORPUS } from "./support/current-coverage.js";

const receiptId = "rcp_g04currentpatch2026092701";
const versions = ["2.02.00", "2.03.00", "2.03.01", "2.03.02"];
const isG04 = (r: { provenance: { source_receipt_id?: string } }) => r.provenance.source_receipt_id === receiptId;
const context = { patch: "2.03.02", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "ending" as const };
const idOf = (r: CanonicalRecord) => {
  for (const k of ["entity_id", "claim_id", "evidence_id", "patch_id", "strategy_id", "receipt_id"] as const) {
    if (k in r) return (r as unknown as Record<string, string>)[k]!;
  }
  throw new Error("Record lacks an ID");
};
const hashRecords = (rows: CanonicalRecord[]) => stableRecordHash([...rows].sort((a,b) => idOf(a).localeCompare(idOf(b))));
type Ledger = {
  prior_canonical_files: Record<string,string>; prior_record_hashes: Record<string,string>;
  frozen_prior_receipt_ids: string[]; receipt_payload_sha256: string;
  notice_reviews: Array<{ version: string; evidence_id: string; published_at: string; available_platforms: Platform[]; pending_platforms: Platform[]; selected_claim_count: number; method: string; human_manual_collection: boolean }>;
  claim_mapping: Array<{ claim_id: string; entity_id: string; source_evidence_id: string; source_locator: string; version: string }>;
  new_entity_sources: Array<{ entity_id: string; source_evidence_id: string; name: string }>;
};
async function setup() {
  const { root, store } = await validStore();
  const ledger = JSON.parse(await readFile(resolve(root,"quality/g04-current-patch-review.json"),"utf8")) as Ledger;
  return { root, store, ledger, index: new KnowledgeIndex(store) };
}

describe("G04 selected official changes, not blanket gameplay freshness", () => {
  it("preserves all 76 prior canonical files and every prior record/review bound", async () => {
    const { root, store, ledger } = await setup();
    expect(Object.keys(ledger.prior_canonical_files)).toHaveLength(76);
    for (const [path,digest] of Object.entries(ledger.prior_canonical_files)) expect(sha256(await readFile(resolve(root,path))),path).toBe(digest);
    const old = new Set(ledger.frozen_prior_receipt_ids);
    expect(old.size).toBe(10);
    for (const family of ["entities","claims","evidence","patches","strategies"] as const) {
      const prior = store[family].filter(r => old.has(r.provenance.source_receipt_id ?? ""));
      expect(hashRecords(prior),family).toBe(ledger.prior_record_hashes[family]);
    }
    expect(hashRecords(store.receipts.filter(r => old.has(r.receipt_id)))).toBe(ledger.prior_record_hashes.receipts);
    expect([store.entities.length,store.claims.length,store.evidence.length,store.patches.length,store.receipts.length]).toEqual([592,2696,310,48,11]);
    expect([CURRENT_CORPUS.entity_records,CURRENT_CORPUS.claims,CURRENT_CORPUS.evidence,CURRENT_CORPUS.patches,CURRENT_CORPUS.receipts]).toEqual([592,2696,310,48,11]);
    const added = [...store.entities.filter(isG04),...store.claims.filter(isG04),...store.evidence.filter(isG04),...store.patches.filter(isG04)];
    expect(added).toHaveLength(30);
    const receipt = store.receipts.find(r => r.receipt_id === receiptId)!;
    expect(receipt.state).toBe("accepted");
    expect(receipt.related_record_ids).toEqual(added.map(idOf).sort());
    expect(receipt.payload_sha256).toBe(hashRecords(added));
    expect(receipt.payload_sha256).toBe(ledger.receipt_payload_sha256);
  });

  it("binds four partial patch identities to exact publication and rollout evidence", async () => {
    const { store, ledger } = await setup();
    const added = store.patches.filter(isG04);
    expect(added.map(p => p.version)).toEqual(versions);
    expect(new Set(store.patches.map(p => p.version)).size).toBe(48);
    expect(ledger.notice_reviews).toHaveLength(4);
    expect(store.evidence.filter(isG04)).toHaveLength(4);
    for (const n of ledger.notice_reviews) {
      const p = added.find(p => p.version === n.version)!;
      const e = store.evidence.find(e => e.evidence_id === n.evidence_id)!;
      const claims = store.claims.filter(c => isG04(c) && c.validity.from_patch === p.version);
      expect(p.released_at).toBe(n.published_at);
      expect(e.source.published_at).toBe(n.published_at);
      expect(p.platforms).toEqual(n.available_platforms);
      expect(p.source_evidence_ids).toEqual([n.evidence_id]);
      expect(p.content_coverage).toMatchObject({ level: "partial", normalized_claim_count: claims.length });
      expect(claims).toHaveLength(n.selected_claim_count);
      expect(p.affected_entity_ids).toEqual([...new Set(claims.map(c => c.subject_entity_id))].sort());
      expect(e).toMatchObject({ evidence_type: "official_patch", rights: { retention_mode: "normalized_facts", license_status: "publisher_owned" }, reliability: { tier: "primary_official", independence_group: "pearl-abyss-official-updates" } });
      expect(e.source.content_sha256).toBeUndefined();
      expect(n.method).toBe("interactive_agent_web_read");
      expect(n.human_manual_collection).toBe(false);
      expect(n.pending_platforms).toEqual(n.version === "2.02.00" ? [] : ["mac-app-store"]);
      for (const platform of n.pending_platforms) expect(p.platforms).not.toContain(platform);
    }
  });

  it("retains exactly sixteen mapped official-intent claims and six necessary identities", async () => {
    const { store, ledger, index } = await setup();
    const added = store.claims.filter(isG04);
    expect(added).toHaveLength(16);
    expect(ledger.claim_mapping.map(m => m.claim_id).sort()).toEqual(added.map(c => c.claim_id).sort());
    for (const m of ledger.claim_mapping) {
      const c = added.find(c => c.claim_id === m.claim_id)!;
      expect(c.subject_entity_id).toBe(m.entity_id);
      expect(c.evidence_ids).toEqual([m.source_evidence_id]);
      expect(c).toMatchObject({ status: "official", behavior_kind: "intended", confidence: 0.98 });
      expect(c.validity).toMatchObject({ from_patch: m.version, reviewed_through_patch: m.version, through_patch: null, locales: ["en-US"] });
      expect(m.source_locator.length).toBeGreaterThan(10);
      const own = index.claimsForEntity(c.subject_entity_id,{ ...context, patch: m.version, platform: c.validity.platforms[0]! });
      expect(own.some(r => r.claim_id === c.claim_id)).toBe(true);
      expect(index.claimsForEntity(c.subject_entity_id,{ ...context, patch: "2.01.00" }).some(r => r.claim_id === c.claim_id)).toBe(false);
      if (m.version !== "2.02.00") expect(index.claimsForEntity(c.subject_entity_id,{ ...context, platform: "mac-app-store" }).some(r => r.claim_id === c.claim_id)).toBe(false);
    }
    const entities = store.entities.filter(isG04);
    expect(entities).toHaveLength(6);
    expect(ledger.new_entity_sources.map(e => e.entity_id).sort()).toEqual(entities.map(e => e.entity_id).sort());
    for (const e of entities) {
      expect(added.some(c => c.subject_entity_id === e.entity_id)).toBe(true);
      expect(store.entities.filter(x => x.canonical_name.text.toLowerCase() === e.canonical_name.text.toLowerCase())).toHaveLength(1);
    }
    const water = added.filter(c => c.subject_entity_id === "ent_g04b34d1c5c4f538f0331ae1ee0");
    expect(water.map(c => c.predicate)).toEqual(["ability.effect","ability.effect"]);
    expect(water.some(c => c.object.kind === "string" && c.object.value.includes("Vaporwalker"))).toBe(true);
  });

  it("updates the default without refreshing old claims or bypassing unknown and spoiler limits", async () => {
    const { store, index } = await setup();
    const old = index.answer("Can I remap controller inputs?");
    expect(old.assumptions.patch).toBe("2.03.02");
    expect(old.answer_state).toBe("partial");
    expect(old.gaps.map(g => g.code)).toContain("post_patch_review_needed");
    expect(index.answer("Can I remap controller inputs?",{ patch: "1.09.00" }).answer_state).toBe("supported");
    expect(index.answer("What changed for Ether Rest in patch 9.99.00?",{ ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
    const quest = store.claims.find(c => isG04(c) && c.subject_entity_id === "ent_ebe2c1cf987ea4158af92be1")!;
    expect(index.claimsForEntity(quest.subject_entity_id,{ ...context, spoilerCeiling: "none" }).some(c => c.claim_id === quest.claim_id)).toBe(false);
    expect(store.claims.some(c => c.claim_id.startsWith("clm_s02"))).toBe(false);
    expect(store.evidence.some(e => e.evidence_id.startsWith("evd_s02"))).toBe(false);
    expect(store.receipts.some(r => r.receipt_id === "rcp_s02acquisition2026091101")).toBe(false);
  });

  it("preserves same-build full/compact REST and actual stdio MCP results", async () => {
    const { root, store, index } = await setup();
    const client = new Client({ name: "g04-patch-consumer", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import","tsx",resolve(root,"src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const descriptor = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in descriptor)) throw new Error("Expected service JSON");
      const app = createApp(store,{ buildId: JSON.parse(descriptor.text).build_id });
      expect((await (await app.request("/v1/patches/latest")).json()).patch.version).toBe("2.03.02");
      for (const version of versions) {
        const rest = await (await app.request(`/v1/patches/${version}`)).json();
        const mcp = await client.callTool({ name: "pywel_get_patches", arguments: { version } });
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(rest);
        expect(rest.patch.version).toBe(version);
      }
      for (const format of ["full","compact"]) for (const q of ["What changed for Ether Rest in patch 2.03.02?","What changed for World Map System in patch 2.03.02?","What are the effects of Water Stride?","Can I remap controller inputs?","What ingredients are needed for Wine?"]) {
        const args = { q, format, patch: "2.03.02", platform: "pc-steam", locale: "en-US", spoiler: "ending" };
        const response = await app.request(`/v1/answer?${new URLSearchParams(args)}`);
        const body = await response.json();
        const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
        expect(response.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        const expectedFix = q.includes("Ether Rest") ? "clm_g049d456c7a657d5247dd718e28"
          : q.includes("World Map") ? "clm_g0424e6283745106bc0a4429b8f" : null;
        if (expectedFix) {
          expect(index.answer(q,context).claims.map(c => c.claim_id)).toEqual([expectedFix]);
          expect(JSON.stringify(body)).toContain(expectedFix);
          expect(body[format === "compact" ? "state" : "answer_state"]).toBe("supported");
        }
        expect(body[format === "compact" ? "state" : "answer_state"]).toBe(index.answer(q,context).answer_state);
        expect(JSON.stringify(body)).not.toMatch(/clm_s02|evd_s02|rcp_s02/);
      }
    } finally { await client.close(); }
  }, 30_000);
});
