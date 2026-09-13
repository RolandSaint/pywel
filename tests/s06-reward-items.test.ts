import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { sha256, stableRecordHash } from "../src/core/canonical-json.js";
import { KnowledgeIndex } from "../src/core/query.js";
import type { CanonicalRecord, EvidencePacket } from "../src/core/types.js";
import { validStore } from "./helpers.js";
import { CURRENT_CORPUS } from "./support/current-coverage.js";

const receiptId = "rcp_s06rewarditems2026091301";
const context = { patch: "2.01.00", platform: "all" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };
const isS06 = (r: { provenance: { source_receipt_id?: string } }) => r.provenance.source_receipt_id === receiptId;
const idOf = (r: CanonicalRecord): string => {
  for (const key of ["entity_id", "claim_id", "evidence_id", "patch_id", "strategy_id", "receipt_id"] as const) {
    if (key in r) return (r as unknown as Record<string, string>)[key]!;
  }
  throw new Error("Missing record identity");
};
const hashRecords = (rows: CanonicalRecord[]) => stableRecordHash([...rows].sort((a, b) => idOf(a).localeCompare(idOf(b))));
const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
const answerContent = (p: EvidencePacket) => ({ ...p, freshness: { ...p.freshness, generated_from_corpus_at: null } });
type Mapping = {
  source_claim_id: string; quest_entity_id: string; target_entity_id: string; new_claim_id: string;
  label: string; source_text: string; quantity: number | null; evidence_ids: string[];
};
type Ledger = {
  selected_labels: string[]; reward_mapping: Mapping[]; prior_canonical_files: Record<string, string>;
  prior_record_hashes: Record<string, string>; frozen_prior_receipt_ids: string[];
  source_evidence_ids: string[]; receipt_payload_sha256: string; unchanged_reward_claim_ids: string[];
};
async function setup() {
  const { root, store } = await validStore();
  const ledger = JSON.parse(await readFile(resolve(root, "quality/s06-reward-item-review.json"), "utf8")) as Ledger;
  const receipts = new Set(ledger.frozen_prior_receipt_ids);
  const isPrior = (r: { provenance: { source_receipt_id?: string } }) => receipts.has(r.provenance.source_receipt_id ?? "");
  const prior = { ...store, entities: store.entities.filter(isPrior), claims: store.claims.filter(isPrior),
    evidence: store.evidence.filter(isPrior), patches: store.patches.filter(isPrior),
    strategies: store.strategies.filter(isPrior), receipts: store.receipts.filter(r => receipts.has(r.receipt_id)) };
  return { root, store, ledger, prior, index: new KnowledgeIndex(store), before: new KnowledgeIndex(prior) };
}

describe("S06 retained explicit reward items", () => {
  it("preserves every prior canonical byte and binds exactly the approved additions", async () => {
    const { root, store, ledger, prior } = await setup();
    expect(Object.keys(ledger.prior_canonical_files)).toHaveLength(76);
    expect(ledger.frozen_prior_receipt_ids).toHaveLength(10);
    for (const [path, digest] of Object.entries(ledger.prior_canonical_files)) expect(sha256(await readFile(resolve(root, path))), path).toBe(digest);
    for (const family of ["entities", "claims", "evidence", "patches", "strategies", "receipts"] as const) expect(hashRecords(prior[family]), family).toBe(ledger.prior_record_hashes[family]);
    expect([prior.entities.length, prior.claims.length, prior.evidence.length, prior.receipts.length]).toEqual([586, 2680, 306, 10]);
    expect([store.entities.length, store.claims.length, store.evidence.length, store.receipts.length]).toEqual([CURRENT_CORPUS.entity_records, CURRENT_CORPUS.claims, CURRENT_CORPUS.evidence, CURRENT_CORPUS.receipts]);
    const entities = store.entities.filter(isS06), claims = store.claims.filter(isS06);
    expect([entities.length, claims.length]).toEqual([25, 29]);
    expect(new Set(claims.map(c => c.subject_entity_id)).size).toBe(12);
    expect(store.evidence.filter(isS06)).toEqual([]);
    const receipt = store.receipts.find(r => r.receipt_id === receiptId)!;
    expect(receipt.state).toBe("accepted");
    expect(receipt.related_record_ids).toEqual([...entities, ...claims].map(idOf).sort());
    expect(receipt.payload_sha256).toBe(hashRecords([...entities, ...claims]));
    expect(receipt.payload_sha256).toBe(ledger.receipt_payload_sha256);
  });

  it("requires explicit licensed parent labels, unique targets, and identical source context", async () => {
    const { store, ledger, prior, index } = await setup();
    const fields = ["subject_entity_id", "predicate", "status", "behavior_kind", "confidence", "evidence_ids", "validity", "spoiler_level"] as const;
    expect(ledger.selected_labels).toHaveLength(25);
    expect(new Set(ledger.selected_labels).size).toBe(25);
    expect(ledger.reward_mapping).toHaveLength(29);
    expect(ledger.reward_mapping.map(m => m.new_claim_id).sort()).toEqual(store.claims.filter(isS06).map(c => c.claim_id).sort());
    expect(ledger.source_evidence_ids).toHaveLength(7);
    expect([...new Set(store.claims.filter(isS06).flatMap(c => c.evidence_ids))].sort()).toEqual(ledger.source_evidence_ids);
    for (const m of ledger.reward_mapping) {
      const parent = prior.claims.find(c => c.claim_id === m.source_claim_id)!;
      const link = store.claims.find(c => c.claim_id === m.new_claim_id)!;
      expect(parent.object).toEqual({ kind: "string", value: m.source_text });
      expect(link.object).toEqual({ kind: "entity", entity_id: m.target_entity_id });
      for (const field of fields) expect(link[field], `${m.label}: ${field}`).toEqual(parent[field]);
      expect(link.supersedes_claim_ids).toBeUndefined();
      expect(link.validity.reviewed_through_patch).toBeNull();
      expect(index.getEntity(m.quest_entity_id)?.entity_type).toBe("quest");
      const target = index.getEntity(m.target_entity_id)!;
      expect(target).toMatchObject({ entity_type: "item", subtype: "item", aliases: [], canonical_name: { text: m.label } });
      expect(prior.entities.some(e => [e.canonical_name, ...e.aliases].some(n => normalize(n.text) === normalize(m.label)))).toBe(false);
      expect(store.entities.filter(e => e.entity_type === "item" && [e.canonical_name, ...e.aliases].some(n => normalize(n.text) === normalize(m.label)))).toHaveLength(1);
      expect(store.claims.filter(c => c.subject_entity_id === m.quest_entity_id && c.predicate === "quest.reward" && c.object.kind === "entity" && c.object.entity_id === m.target_entity_id)).toHaveLength(1);
      const quantity = /\s+×(\d+)$/.exec(m.source_text);
      expect(m.quantity).toBe(quantity ? Number(quantity[1]) : null);
      expect(m.label).toBe(m.source_text.replace(/\s+×\d+$/, ""));
      expect(m.source_text).not.toMatch(/\[if|alliance/i);
      for (const id of link.evidence_ids) expect(store.evidence.find(e => e.evidence_id === id)?.rights).toMatchObject({ license_status: "compatible_license", retention_mode: "normalized_facts" });
    }
    expect(new Set(ledger.reward_mapping.filter(m => m.label === "Abyss Artifact").map(m => m.target_entity_id)).size).toBe(1);
    expect(ledger.reward_mapping.filter(m => m.label === "Abyss Artifact")).toHaveLength(4);
    expect(ledger.reward_mapping.filter(m => m.label === "Iron Ore")).toHaveLength(2);
    expect(store.entities.filter(isS06).some(e => ["Medium Bags", "Ignir", "Golden Vanguard", "Shackle of Might", "Core Blueprint: Haste"].includes(e.canonical_name.text))).toBe(false);
    expect(ledger.unchanged_reward_claim_ids).toEqual(prior.claims.filter(c => c.predicate === "quest.reward").map(c => c.claim_id).sort());
  });

  it("exposes every exact link and retains all prior reward facts without broadening other predicates", async () => {
    const { ledger, index, before } = await setup();
    for (const m of ledger.reward_mapping) {
      expect(index.filterClaims({ subjectEntityId: m.quest_entity_id, predicate: "quest.reward", context, limit: 200 }).some(c => c.claim_id === m.new_claim_id)).toBe(true);
      for (const id of [m.quest_entity_id, m.target_entity_id]) expect(index.relationshipGraph(id, context, 1, 500)!.edges.some(e => e.claim_id === m.new_claim_id && e.object_entity_id === m.target_entity_id)).toBe(true);
    }
    for (const id of new Set(ledger.reward_mapping.map(m => m.quest_entity_id))) {
      const q = `What rewards do I get from ${index.getEntity(id)!.canonical_name.text}?`;
      const packet = index.answer(q, context), old = before.answer(q, context);
      expect(packet.answer_state, q).toBe("partial");
      expect(packet.claims.every(c => c.subject_entity_id === id), q).toBe(true);
      expect(packet.claims.filter(isS06).map(c => c.claim_id).sort(), q).toEqual(ledger.reward_mapping.filter(m => m.quest_entity_id === id).map(m => m.new_claim_id).sort());
      expect(packet.claims.filter(c => !isS06(c)).map(c => c.claim_id).sort(), q).toEqual(old.claims.map(c => c.claim_id).sort());
      expect(packet.claims.filter(c => c.predicate !== "quest.reward")).toEqual(old.claims.filter(c => c.predicate !== "quest.reward"));
      expect(packet.gaps.map(g => g.code)).toContain("post_patch_review_needed");
    }
  });

  it("keeps spoilers, unknown patches, S02 withholding and all 46 ingredient answers intact", async () => {
    const { root, ledger, index, before } = await setup();
    for (const id of new Set(ledger.reward_mapping.map(m => m.quest_entity_id))) {
      const q = `What rewards do I get from ${index.getEntity(id)!.canonical_name.text}?`;
      const hidden = index.answer(q, { ...context, spoilerCeiling: "none" });
      expect(hidden.claims).toEqual([]);
      expect(hidden.evidence).toEqual([]);
      expect(JSON.stringify(hidden)).not.toContain("clm_s06");
      expect(index.answer(q, { ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
    }
    for (const q of ["What rewards do I get from Zorblax Quest?", "What rewards do I get from The Count's Honor?", "What rewards do I get from Sealed in Stone?"]) expect(answerContent(index.answer(q, context))).toEqual(answerContent(before.answer(q, context)));
    const s02 = JSON.parse(await readFile(resolve(root, "quality/s02-acquisition-review.json"), "utf8")) as { affected_existing_entity_ids: string[] };
    for (const id of s02.affected_existing_entity_ids) for (const spoilerCeiling of ["none", "discovery", "quest_minor", "quest_major", "ending"] as const) expect(index.answer(`Where can I get ${index.getEntity(id)!.canonical_name.text}?`, { ...context, spoilerCeiling }).claims).toEqual([]);
    const s03 = JSON.parse(await readFile(resolve(root, "quality/s03-recipe-input-review.json"), "utf8")) as { recipe_subject_ids: string[] };
    expect(s03.recipe_subject_ids).toHaveLength(46);
    for (const id of s03.recipe_subject_ids) {
      const q = `What ingredients are needed for ${index.getEntity(id)!.canonical_name.text}?`;
      expect(answerContent(index.answer(q, context))).toEqual(answerContent(before.answer(q, context)));
    }
  });

  it("matches actual stdio MCP and full/compact REST, including exact reward reads", async () => {
    const { root, store, ledger } = await setup();
    const client = new Client({ name: "s06-reward-consumer", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", resolve(root, "src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const descriptor = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in descriptor)) throw new Error("Expected service JSON");
      const app = createApp(store, { buildId: JSON.parse(descriptor.text).build_id });
      for (const m of ledger.reward_mapping) {
        const args = { subject: m.quest_entity_id, predicate: "quest.reward", limit: 200, patch: "2.01.00", platform: "all", locale: "en-US", spoiler: "quest_major" };
        const params = new URLSearchParams(Object.fromEntries(Object.entries(args).map(([k, v]) => [k, String(v)])));
        const response = await app.request(`/v1/claims?${params}`), body = await response.json();
        const mcp = await client.callTool({ name: "pywel_get_claims", arguments: args });
        expect(response.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(body.claims.some((c: { claim_id: string }) => c.claim_id === m.new_claim_id)).toBe(true);
      }
      for (const format of ["full", "compact"]) for (const name of ["Unknown Space", "Hernand in Chaos", "Forbidden Knowledge", "Zorblax Quest"]) {
        const args = { q: `What rewards do I get from ${name}?`, format, patch: "2.01.00", platform: "all", locale: "en-US", spoiler: "quest_major" };
        const response = await app.request(`/v1/answer?${new URLSearchParams(args)}`), body = await response.json();
        const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
        expect(response.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(body[format === "compact" ? "state" : "answer_state"]).toBe(name === "Zorblax Quest" ? "unknown" : "partial");
        expect(JSON.stringify(body)).not.toMatch(/clm_s02|evd_s02|rcp_s02/);
        if (format === "compact") expect((body.claims ?? []).length).toBeLessThanOrEqual(5);
        else if (name !== "Zorblax Quest") expect(body.claims.some((c: { claim_id: string }) => c.claim_id.startsWith("clm_s06"))).toBe(true);
      }
    } finally { await client.close(); }
  }, 30_000);
});
