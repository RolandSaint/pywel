import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { sha256, stableRecordHash } from "../src/core/canonical-json.js";
import { KnowledgeIndex } from "../src/core/query.js";
import type { CanonicalRecord } from "../src/core/types.js";
import { validStore } from "./helpers.js";
import { CURRENT_CORPUS } from "./support/current-coverage.js";

const receiptId = "rcp_s04recipeoutputs2026091201";
const context = { patch: "2.01.00", platform: "all" as const, locale: "en-US", spoilerCeiling: "none" as const };
const isS04 = (r: { provenance: { source_receipt_id?: string } }) => r.provenance.source_receipt_id === receiptId;
const idOf = (r: CanonicalRecord): string => {
  for (const key of ["entity_id", "claim_id", "evidence_id", "patch_id", "strategy_id", "receipt_id"] as const) {
    if (key in r) return (r as unknown as Record<string, string>)[key]!;
  }
  throw new Error("Record has no canonical identity");
};
const hashRecords = (records: CanonicalRecord[]) => stableRecordHash([...records].sort((a, b) => idOf(a).localeCompare(idOf(b))));
type Mapping = {
  recipe_entity_id: string; output_label: string; prior_output_claim_ids: string[];
  source_output_claim_id: string; output_entity_id: string; typed_output_claim_id: string;
  disposition: "reuse_existing_link" | "new_output_identity_and_link";
};
type Ledger = {
  prior_canonical_files: Record<string, string>; prior_record_hashes: Record<string, string>;
  recipe_subject_ids: string[]; output_mapping: Mapping[]; source_evidence_ids: string[];
  receipt_payload_sha256: string;
};
async function setup() {
  const { root, store } = await validStore();
  const ledger = JSON.parse(await readFile(resolve(root, "quality/s04-recipe-output-review.json"), "utf8")) as Ledger;
  // The frozen pre-S04 files define this historical cohort, not absence of S04.
  const priorReceipts = new Set(await Promise.all(Object.keys(ledger.prior_canonical_files)
    .filter(path => path.startsWith("data/canonical/receipts/"))
    .map(async path => (JSON.parse(await readFile(resolve(root, path), "utf8")) as { receipt_id: string }).receipt_id)));
  const isPrior = (r: { provenance: { source_receipt_id?: string } }) => priorReceipts.has(r.provenance.source_receipt_id ?? "");
  const prior = { ...store, entities: store.entities.filter(isPrior), claims: store.claims.filter(isPrior),
    evidence: store.evidence.filter(isPrior), patches: store.patches.filter(isPrior),
    strategies: store.strategies.filter(isPrior), receipts: store.receipts.filter(r => priorReceipts.has(r.receipt_id)) };
  return { root, store, ledger, prior, index: new KnowledgeIndex(store), before: new KnowledgeIndex(prior) };
}

describe("S04 retained recipe output identities", () => {
  it("preserves every prior canonical byte and record while admitting precisely the finite batch", async () => {
    const { root, store, ledger, prior } = await setup();
    expect(Object.keys(ledger.prior_canonical_files)).toHaveLength(71);
    for (const [path, digest] of Object.entries(ledger.prior_canonical_files)) expect(sha256(await readFile(resolve(root, path))), path).toBe(digest);
    for (const family of ["entities", "claims", "evidence", "patches", "strategies", "receipts"] as const) expect(hashRecords(prior[family]), family).toBe(ledger.prior_record_hashes[family]);
    expect([store.entities.length, store.claims.length, store.evidence.length, store.receipts.length]).toEqual([CURRENT_CORPUS.entity_records, CURRENT_CORPUS.claims, CURRENT_CORPUS.evidence, CURRENT_CORPUS.receipts]);
    const entities = store.entities.filter(isS04), claims = store.claims.filter(isS04);
    expect([entities.length, claims.length]).toEqual([41, 41]);
    expect(store.evidence.filter(isS04)).toEqual([]);
    expect(entities.every(e => e.entity_type === "item" && e.subtype === "item")).toBe(true);
    expect(claims.every(c => c.predicate === "recipe.output" && c.object.kind === "entity")).toBe(true);
    const receipt = store.receipts.find(r => r.receipt_id === receiptId)!;
    expect(receipt.state).toBe("accepted");
    expect(receipt.related_record_ids).toEqual([...entities, ...claims].map(idOf).sort());
    expect(receipt.payload_sha256).toBe(hashRecords([...entities, ...claims]));
    expect(receipt.payload_sha256).toBe(ledger.receipt_payload_sha256);
  });

  it("accounts for all 48 earlier outputs and reuses the five already-linked identities", async () => {
    const { store, ledger, prior, index } = await setup();
    const s03 = JSON.parse(await readFile(resolve((await validStore()).root, "quality/s03-recipe-input-review.json"), "utf8")) as { recipe_subject_ids: string[] };
    expect(ledger.recipe_subject_ids).toEqual(s03.recipe_subject_ids);
    expect(new Set(ledger.recipe_subject_ids).size).toBe(46);
    expect(ledger.output_mapping.map(m => m.recipe_entity_id)).toEqual(ledger.recipe_subject_ids);
    expect(ledger.output_mapping.filter(m => m.disposition === "reuse_existing_link")).toHaveLength(5);
    const cohort = new Set(ledger.recipe_subject_ids);
    const oldOutputs = prior.claims.filter(c => cohort.has(c.subject_entity_id) && c.predicate === "recipe.output");
    expect(oldOutputs).toHaveLength(48);
    expect(ledger.output_mapping.flatMap(m => m.prior_output_claim_ids).sort()).toEqual(oldOutputs.map(c => c.claim_id).sort());
    for (const m of ledger.output_mapping) {
      const recipe = index.getEntity(m.recipe_entity_id)!, output = index.getEntity(m.output_entity_id)!;
      expect(recipe.entity_type).toBe("recipe");
      expect(output.entity_type).toBe("item");
      expect(output.entity_id).not.toBe(recipe.entity_id);
      expect(output.canonical_name.text).toBe(m.output_label);
      const typed = store.claims.filter(c => c.subject_entity_id === recipe.entity_id && c.predicate === "recipe.output" && c.object.kind === "entity");
      expect(typed).toHaveLength(1);
      expect(typed[0]!.claim_id).toBe(m.typed_output_claim_id);
      expect(typed[0]!.object).toEqual({ kind: "entity", entity_id: output.entity_id });
      expect(isS04(typed[0]!)).toBe(m.disposition === "new_output_identity_and_link");
      if (m.disposition === "reuse_existing_link") expect(prior.claims.find(c => c.claim_id === m.typed_output_claim_id)).toEqual(typed[0]);
      else {
        const normalize = (s: string) => s.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
        expect(prior.entities.filter(e => e.entity_type !== "recipe").some(e => [e.canonical_name, ...e.aliases].some(n => normalize(n.text) === normalize(m.output_label)))).toBe(false);
      }
    }
  });

  it("inherits exact source context and keeps output labels and quantities untouched", async () => {
    const { store, ledger } = await setup();
    const inherited = ["subject_entity_id", "predicate", "status", "behavior_kind", "confidence", "evidence_ids", "validity", "spoiler_level"] as const;
    const evidenceIds = new Set<string>();
    for (const m of ledger.output_mapping.filter(m => m.disposition === "new_output_identity_and_link")) {
      const parent = store.claims.find(c => c.claim_id === m.source_output_claim_id)!;
      const link = store.claims.find(c => c.claim_id === m.typed_output_claim_id)!;
      expect(parent.object).toEqual({ kind: "string", value: m.output_label });
      for (const field of inherited) expect(link[field], `${m.output_label}: ${field}`).toEqual(parent[field]);
      expect(link.supersedes_claim_ids).toBeUndefined();
      expect(link.validity.reviewed_through_patch).toBeNull();
      expect(link.validity.from_patch).toBeNull();
      expect(link.validity.through_patch).toBeNull();
      expect(link.confidence).toBeLessThanOrEqual(0.25);
      for (const id of link.evidence_ids) evidenceIds.add(id);
      expect(store.claims.some(c => c.subject_entity_id === m.output_entity_id)).toBe(false);
    }
    expect([...evidenceIds].sort()).toEqual(ledger.source_evidence_ids);
    for (const id of evidenceIds) {
      const e = store.evidence.find(e => e.evidence_id === id)!;
      expect(e.rights).toMatchObject({ license_status: "compatible_license", retention_mode: "normalized_facts" });
      expect(e.reliability).toEqual({ independence_group: "crimsonwiki-community-wiki", tier: "unverified" });
      expect(e.captured_at.startsWith("2026-07-16T")).toBe(true);
    }
  });

  it("makes every output traversable without changing the 46 ingredient answers", async () => {
    const { ledger, index, before } = await setup();
    for (const m of ledger.output_mapping) {
      const exact = index.filterClaims({ subjectEntityId: m.recipe_entity_id, predicate: "recipe.output", context, limit: 100 });
      expect(exact.some(c => c.claim_id === m.typed_output_claim_id && c.object.kind === "entity" && c.object.entity_id === m.output_entity_id)).toBe(true);
      for (const root of [m.recipe_entity_id, m.output_entity_id]) {
        const graph = index.relationshipGraph(root, context, 1, 500)!;
        expect(graph.edges.some(e => e.claim_id === m.typed_output_claim_id && e.subject_entity_id === m.recipe_entity_id && e.object_entity_id === m.output_entity_id)).toBe(true);
      }
      const q = `What ingredients are needed for ${m.output_label}?`;
      const after = index.answer(q, context), old = before.answer(q, context);
      expect(after.answer_state, q).toBe("partial");
      expect(after.claims, q).toEqual(old.claims);
      expect(after.evidence, q).toEqual(old.evidence);
      expect(after.claims.every(c => c.subject_entity_id === m.recipe_entity_id), q).toBe(true);
      expect(after.gaps.map(g => g.code), q).toContain("post_patch_review_needed");
      expect(index.searchEntities(m.output_label, 100).map(e => e.entity_id)).toEqual(expect.arrayContaining([m.recipe_entity_id, m.output_entity_id]));
    }
  });

  it("does not invent acquisition, effects, yield, freshness, or new S02 admission", async () => {
    const { store, ledger, index } = await setup();
    for (const m of ledger.output_mapping.filter(m => m.disposition === "new_output_identity_and_link")) {
      expect(index.answer(`Where can I get ${m.output_label}?`, context).claims, m.output_label).toEqual([]);
    }
    expect(index.answer("What ingredients are needed for Royal Gold Dye?", { ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
    expect(index.answer("What ingredients are needed for Zorblax Output Tonic?", context).claims).toEqual([]);
    expect(store.claims.some(c => c.claim_id.startsWith("clm_s02"))).toBe(false);
    expect(store.evidence.some(e => e.evidence_id.startsWith("evd_s02"))).toBe(false);
    expect(store.receipts.some(r => r.receipt_id === "rcp_s02acquisition2026091101")).toBe(false);
    expect(index.answer("Where can I get Aeserion Sword?", { ...context, spoilerCeiling: "ending" }).claims).toEqual([]);
  });

  it("serves typed output reads and bounded answers identically through REST and actual stdio MCP", async () => {
    const { root, store, ledger } = await setup();
    const client = new Client({ name: "s04-output-consumer", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", resolve(root, "src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const descriptor = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in descriptor)) throw new Error("Expected service JSON");
      const app = createApp(store, { buildId: JSON.parse(descriptor.text).build_id });
      for (const name of ["Royal Gold Dye", "Platinum", "Fruit Tea", "Meatball Soup", "Wine"]) {
        const m = ledger.output_mapping.find(m => m.output_label === name)!;
        const args = { subject: m.recipe_entity_id, predicate: "recipe.output", limit: 100, patch: "2.01.00", platform: "all", locale: "en-US", spoiler: "none" };
        const params = new URLSearchParams(Object.fromEntries(Object.entries(args).map(([k, v]) => [k, String(v)])));
        const response = await app.request(`/v1/claims?${params}`);
        const body = await response.json();
        const mcp = await client.callTool({ name: "pywel_get_claims", arguments: args });
        expect(response.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(body.claims.some((c: { claim_id: string }) => c.claim_id === m.typed_output_claim_id)).toBe(true);
        const graphArgs = { id: m.output_entity_id, depth: 1, limit: 100, patch: "2.01.00", platform: "all", locale: "en-US", spoiler: "none" };
        const graphResponse = await app.request(`/v1/entities/${m.output_entity_id}/relationships?depth=1&limit=100&patch=2.01.00&platform=all&locale=en-US&spoiler=none`);
        const graph = await graphResponse.json();
        const graphMcp = await client.callTool({ name: "pywel_get_relationships", arguments: graphArgs });
        expect(graphResponse.status).toBe(200);
        expect(graphMcp.isError).not.toBe(true);
        expect(graphMcp.structuredContent).toEqual(graph);
        expect(graph.edges.some((e: { claim_id: string }) => e.claim_id === m.typed_output_claim_id)).toBe(true);
      }
      for (const format of ["full", "compact"]) for (const q of ["What is the recipe for Royal Gold Dye?", "What ingredients are needed for Fruit Tea?", "What ingredients are needed for Haiden's Lesser Elixir?", "Where can I get Platinum?"]) {
        const args = { q, format, patch: "2.01.00", platform: "all", locale: "en-US", spoiler: "none" };
        const response = await app.request(`/v1/answer?${new URLSearchParams(args)}`);
        const body = await response.json();
        const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
        expect(response.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(body[format === "compact" ? "state" : "answer_state"]).toBe(q.startsWith("Where") ? "unknown" : "partial");
        expect(JSON.stringify(body)).not.toMatch(/clm_s02|evd_s02|rcp_s02/);
        if (format === "compact") expect((body.claims ?? []).length).toBeLessThanOrEqual(5);
        else if (q.includes("Royal Gold Dye")) expect(body.claims.some((c: { claim_id: string }) => c.claim_id === ledger.output_mapping.find(m => m.output_label === "Royal Gold Dye")!.typed_output_claim_id)).toBe(true);
      }
    } finally { await client.close(); }
  }, 30_000);
});
