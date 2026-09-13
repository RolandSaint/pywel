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

const receiptId = "rcp_s05questrewards2026091201";
const context = { patch: "2.01.00", platform: "all" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };
const isS05 = (r: { provenance: { source_receipt_id?: string } }) => r.provenance.source_receipt_id === receiptId;
const idOf = (r: CanonicalRecord): string => {
  for (const key of ["entity_id", "claim_id", "evidence_id", "patch_id", "strategy_id", "receipt_id"] as const) {
    if (key in r) return (r as unknown as Record<string, string>)[key]!;
  }
  throw new Error("Missing record identity");
};
const hashRecords = (rows: CanonicalRecord[]) => stableRecordHash([...rows].sort((a, b) => idOf(a).localeCompare(idOf(b))));
// New contribution time changes corpus metadata, not the source assertions.
const answerContent = (p: EvidencePacket) => ({ ...p, freshness: { ...p.freshness, generated_from_corpus_at: null } });
type Mapping = {
  source_claim_id: string; quest_entity_id: string; disposition: string;
  target_entity_id: string | null; new_claim_id: string | null;
  source_text?: string; label?: string; quantity?: number | null;
};
type Ledger = {
  reward_mapping: Mapping[]; prerequisite_mapping: Array<{ source_claim_id: string; disposition: string }>;
  quest_subject_ids: string[]; source_evidence_ids: string[];
  prior_canonical_files: Record<string, string>; prior_record_hashes: Record<string, string>;
  frozen_prior_receipt_ids: string[]; receipt_payload_sha256: string;
};
async function setup() {
  const { root, store } = await validStore();
  const ledger = JSON.parse(await readFile(resolve(root, "quality/s05-quest-reward-review.json"), "utf8")) as Ledger;
  const receipts = new Set(ledger.frozen_prior_receipt_ids);
  const isPrior = (r: { provenance: { source_receipt_id?: string } }) => receipts.has(r.provenance.source_receipt_id ?? "");
  const prior = { ...store, entities: store.entities.filter(isPrior), claims: store.claims.filter(isPrior),
    evidence: store.evidence.filter(isPrior), patches: store.patches.filter(isPrior),
    strategies: store.strategies.filter(isPrior), receipts: store.receipts.filter(r => receipts.has(r.receipt_id)) };
  return { root, store, ledger, prior, index: new KnowledgeIndex(store), before: new KnowledgeIndex(prior) };
}

describe("S05 retained quest reward identities", () => {
  it("preserves all 74 prior canonical files and binds only twelve new claims to one receipt", async () => {
    const { root, store, ledger, prior } = await setup();
    expect(Object.keys(ledger.prior_canonical_files)).toHaveLength(74);
    expect(ledger.frozen_prior_receipt_ids).toHaveLength(9);
    for (const [path, digest] of Object.entries(ledger.prior_canonical_files)) expect(sha256(await readFile(resolve(root, path))), path).toBe(digest);
    for (const family of ["entities", "claims", "evidence", "patches", "strategies", "receipts"] as const) expect(hashRecords(prior[family]), family).toBe(ledger.prior_record_hashes[family]);
    expect([store.entities.length, store.claims.length, store.evidence.length, store.receipts.length]).toEqual([CURRENT_CORPUS.entity_records, CURRENT_CORPUS.claims, CURRENT_CORPUS.evidence, CURRENT_CORPUS.receipts]);
    const added = store.claims.filter(isS05);
    expect(added).toHaveLength(12);
    expect(new Set(added.map(c => c.subject_entity_id)).size).toBe(10);
    expect(store.entities.filter(isS05)).toEqual([]);
    expect(store.evidence.filter(isS05)).toEqual([]);
    const receipt = store.receipts.find(r => r.receipt_id === receiptId)!;
    expect(receipt.state).toBe("accepted");
    expect(receipt.related_record_ids).toEqual(added.map(c => c.claim_id).sort());
    expect(receipt.payload_sha256).toBe(hashRecords(added));
    expect(receipt.payload_sha256).toBe(ledger.receipt_payload_sha256);
  });

  it("accounts for all 65 rewards and four prerequisites without inventing links for held statements", async () => {
    const { store, ledger, prior } = await setup();
    expect(prior.entities.filter(e => e.entity_type === "quest")).toHaveLength(144);
    expect(ledger.reward_mapping).toHaveLength(65);
    expect(ledger.reward_mapping.map(m => m.source_claim_id).sort()).toEqual(prior.claims.filter(c => c.predicate === "quest.reward").map(c => c.claim_id).sort());
    expect(ledger.prerequisite_mapping).toHaveLength(4);
    expect(ledger.prerequisite_mapping.map(m => m.source_claim_id).sort()).toEqual(prior.claims.filter(c => c.predicate === "quest.prerequisite").map(c => c.claim_id).sort());
    expect(ledger.prerequisite_mapping.filter(m => m.disposition === "existing_typed_link")).toHaveLength(2);
    expect(store.claims.filter(isS05).every(c => c.predicate === "quest.reward" && c.object.kind === "entity")).toBe(true);
    expect(ledger.reward_mapping.filter(m => m.disposition === "held_no_exact_item")).toHaveLength(48);
    expect(ledger.reward_mapping.filter(m => m.disposition === "held_non_string")).toHaveLength(4);
    expect(ledger.reward_mapping.filter(m => m.disposition === "held_conditional")).toHaveLength(1);
    for (const m of ledger.reward_mapping.filter(m => m.disposition !== "linked_existing_item")) {
      expect(m.new_claim_id).toBeNull();
      expect(m.target_entity_id).toBeNull();
    }
  });

  it("inherits exact source context and selects existing items, never same-named recipes", async () => {
    const { store, ledger, prior, index } = await setup();
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
    const fields = ["subject_entity_id", "predicate", "status", "behavior_kind", "confidence", "evidence_ids", "validity", "spoiler_level"] as const;
    const linked = ledger.reward_mapping.filter(m => m.new_claim_id !== null);
    expect(linked).toHaveLength(12);
    expect(linked.map(m => m.new_claim_id).sort()).toEqual(store.claims.filter(isS05).map(c => c.claim_id).sort());
    expect(ledger.source_evidence_ids).toHaveLength(7);
    expect([...new Set(store.claims.filter(isS05).flatMap(c => c.evidence_ids))].sort()).toEqual(ledger.source_evidence_ids);
    for (const m of linked) {
      const parent = prior.claims.find(c => c.claim_id === m.source_claim_id)!;
      const link = store.claims.find(c => c.claim_id === m.new_claim_id)!;
      expect(parent.object).toEqual({ kind: "string", value: m.source_text });
      expect(link.object).toEqual({ kind: "entity", entity_id: m.target_entity_id });
      for (const field of fields) expect(link[field], `${m.label}: ${field}`).toEqual(parent[field]);
      expect(link.supersedes_claim_ids).toBeUndefined();
      expect(link.validity.reviewed_through_patch).toBeNull();
      expect(link.confidence).toBe(0.24);
      expect(index.getEntity(m.quest_entity_id)?.entity_type).toBe("quest");
      const matches = prior.entities.filter(e => e.entity_type === "item" && [e.canonical_name, ...e.aliases].some(n => normalize(n.text) === normalize(m.label!)));
      expect(matches.map(e => e.entity_id)).toEqual([m.target_entity_id]);
      expect(prior.claims.some(c => c.subject_entity_id === m.quest_entity_id && c.predicate === "quest.reward" && c.object.kind === "entity" && c.object.entity_id === m.target_entity_id)).toBe(false);
      expect(store.claims.filter(c => c.subject_entity_id === m.quest_entity_id && c.predicate === "quest.reward" && c.object.kind === "entity" && c.object.entity_id === m.target_entity_id)).toHaveLength(1);
      const quantity = /\s+×(\d+)$/.exec(m.source_text!);
      expect(m.quantity).toBe(quantity ? Number(quantity[1]) : null);
      expect(m.label).toBe(m.source_text!.replace(/\s+×\d+$/, ""));
      for (const id of link.evidence_ids) expect(store.evidence.find(e => e.evidence_id === id)?.rights).toMatchObject({ license_status: "compatible_license", retention_mode: "normalized_facts" });
    }
    for (const label of ["Palmar Pill", "Honey Tea"]) {
      const m = linked.find(m => m.label === label)!;
      expect(index.getEntity(m.target_entity_id!)?.entity_type).toBe("item");
      expect(prior.entities.some(e => e.canonical_name.text === label && e.entity_type === "recipe")).toBe(true);
    }
  });

  it("exposes all twelve typed rewards through exact claims, bidirectional graphs and qualified quest answers", async () => {
    const { ledger, index, before, prior } = await setup();
    const priorClaimIds = new Set(prior.claims.map(c => c.claim_id));
    for (const m of ledger.reward_mapping.filter(m => m.new_claim_id !== null)) {
      expect(index.filterClaims({ subjectEntityId: m.quest_entity_id, predicate: "quest.reward", context, limit: 100 }).some(c => c.claim_id === m.new_claim_id)).toBe(true);
      for (const id of [m.quest_entity_id, m.target_entity_id!]) expect(index.relationshipGraph(id, context, 1, 500)!.edges.some(e => e.claim_id === m.new_claim_id && e.subject_entity_id === m.quest_entity_id && e.object_entity_id === m.target_entity_id)).toBe(true);
    }
    for (const id of ledger.quest_subject_ids) {
      const q = `What rewards do I get from ${index.getEntity(id)!.canonical_name.text}?`;
      const packet = index.answer(q, context), old = before.answer(q, context);
      expect(packet.answer_state, q).toBe("partial");
      expect(packet.claims.every(c => c.subject_entity_id === id), q).toBe(true);
      // The existing parser also selects objectives/sequence for question-shaped names.
      // Freeze that prior set rather than claim S05 repairs free-text intent routing.
      const existingOtherClaims = id === "ent_255207fa0e179e9a053971a2" ? [
        "clm_58aac0d2f114877dfea25bf2", "clm_646adf6907ed8d09d633d0d4", "clm_900ef537acb62e8df9386ad7",
        "clm_b2544bf611dbbbd807368ff9", "clm_c9e2c9df225a0a9d5b23f986",
      ] : id === "ent_82b8f50d227e756f7291e2a8" ? [
        "clm_9a69cab52cb64e3ffa7dc289", "clm_eddee8a5588ad0681df85507",
      ] : [];
      expect(packet.claims.filter(c => c.predicate !== "quest.reward").map(c => c.claim_id).sort()).toEqual(existingOtherClaims);
      expect(packet.claims.filter(c => c.predicate !== "quest.reward")).toEqual(old.claims.filter(c => c.predicate !== "quest.reward"));
      expect(packet.claims.filter(isS05).map(c => c.claim_id).sort(), q).toEqual(ledger.reward_mapping.filter(m => m.quest_entity_id === id && m.new_claim_id !== null).map(m => m.new_claim_id).sort());
      // Compare the frozen prior cohort; later batch claims are tested independently.
      expect(packet.claims.filter(c => priorClaimIds.has(c.claim_id)).map(c => c.claim_id).sort(), q).toEqual(old.claims.map(c => c.claim_id).sort());
      expect(packet.gaps.map(g => g.code), q).toContain("post_patch_review_needed");
    }
  });

  it("retains spoiler gaps, unknown patches, non-item rewards, S02 withholding and G03 ingredient selection", async () => {
    const { root, ledger, index, before } = await setup();
    for (const id of ledger.quest_subject_ids) {
      const q = `What rewards do I get from ${index.getEntity(id)!.canonical_name.text}?`;
      const hidden = index.answer(q, { ...context, spoilerCeiling: "none" });
      expect(hidden.claims, q).toEqual([]);
      expect(hidden.evidence, q).toEqual([]);
      expect(JSON.stringify(hidden)).not.toContain("clm_s05");
      expect(index.answer(q, { ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
    }
    for (const q of ["What rewards do I get from The Count's Honor?", "What rewards do I get from Sealed in Stone?", "What rewards do I get from Zorblax Quest?", "Where can I get Palmar Pill?", "Where can I get Honey Tea?"]) expect(answerContent(index.answer(q, context))).toEqual(answerContent(before.answer(q, context)));
    const s02 = JSON.parse(await readFile(resolve(root, "quality/s02-acquisition-review.json"), "utf8")) as { affected_existing_entity_ids: string[] };
    for (const id of s02.affected_existing_entity_ids) expect(index.answer(`Where can I get ${index.getEntity(id)!.canonical_name.text}?`, { ...context, spoilerCeiling: "ending" }).claims).toEqual([]);
    const s03 = JSON.parse(await readFile(resolve(root, "quality/s03-recipe-input-review.json"), "utf8")) as { recipe_subject_ids: string[] };
    for (const id of s03.recipe_subject_ids) {
      const q = `What ingredients are needed for ${index.getEntity(id)!.canonical_name.text}?`;
      expect(answerContent(index.answer(q, context))).toEqual(answerContent(before.answer(q, context)));
    }
  });

  it("serves the same typed rewards through REST and actual stdio MCP without increasing compact caps", async () => {
    const { root, store, ledger } = await setup();
    const client = new Client({ name: "s05-reward-consumer", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", resolve(root, "src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const descriptor = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in descriptor)) throw new Error("Expected service JSON");
      const app = createApp(store, { buildId: JSON.parse(descriptor.text).build_id });
      for (const label of ["Palmar Pill", "Honey Tea", "Witch's Ring"]) {
        const m = ledger.reward_mapping.find(m => m.label === label && m.new_claim_id)!;
        const args = { subject: m.quest_entity_id, predicate: "quest.reward", limit: 100, patch: "2.01.00", platform: "all", locale: "en-US", spoiler: "quest_major" };
        const params = new URLSearchParams(Object.fromEntries(Object.entries(args).map(([k, v]) => [k, String(v)])));
        const response = await app.request(`/v1/claims?${params}`), body = await response.json();
        const mcp = await client.callTool({ name: "pywel_get_claims", arguments: args });
        expect(response.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(body.claims.some((c: { claim_id: string }) => c.claim_id === m.new_claim_id)).toBe(true);
      }
      for (const format of ["full", "compact"]) for (const name of ["Unexpected Gift", "Forbidden Knowledge", "Unwavering Steps", "Zorblax Quest"]) {
        const args = { q: `What rewards do I get from ${name}?`, format, patch: "2.01.00", platform: "all", locale: "en-US", spoiler: "quest_major" };
        const response = await app.request(`/v1/answer?${new URLSearchParams(args)}`), body = await response.json();
        const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
        expect(response.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(body[format === "compact" ? "state" : "answer_state"]).toBe(name === "Zorblax Quest" ? "unknown" : "partial");
        expect(JSON.stringify(body)).not.toMatch(/clm_s02|evd_s02|rcp_s02/);
        if (format === "compact") expect((body.claims ?? []).length).toBeLessThanOrEqual(5);
        else if (name !== "Zorblax Quest") expect(body.claims.some((c: { claim_id: string }) => c.claim_id.startsWith("clm_s05"))).toBe(true);
      }
    } finally { await client.close(); }
  }, 30_000);
});
