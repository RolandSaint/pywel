import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { sha256, stableRecordHash } from "../src/core/canonical-json.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { validStore } from "./helpers.js";
import { CURRENT_CORPUS } from "./support/current-coverage.js";

const receiptId = "rcp_s03recipeinputs2026091101";
const context = { patch: "2.01.00", platform: "all" as const, locale: "en-US", spoilerCeiling: "none" as const };
const isS03 = (r: { provenance: { source_receipt_id?: string } }) => r.provenance.source_receipt_id === receiptId;
type Mapping = {
  source_input_claim_id: string; recipe_entity_id: string; source_label: string; source_text: string;
  quantity: number | null; quantity_status: string; target_entity_id: string | null;
  relation_claim_id: string | null; disposition: string; supersedes_claim_ids?: string[];
};
type Ledger = {
  frozen_prior_receipt_ids: string[];
  prior_canonical_files: Record<string,string>; prior_claims_sha256: string; prior_entities_sha256: string;
  recipe_subject_ids: string[]; recipes_gaining_input_links: string[]; input_mapping: Mapping[];
  superseded_wrong_target_claim_ids: string[];
  label_mapping: Array<{ source_label: string; disposition: string; target_entity_id: string | null }>;
  food_output_mapping: Array<{ source_output_claim_id: string; new_output_claim_id: string; recipe_entity_id: string; item_entity_id: string; label: string }>;
};
async function setup() {
  const { root, store } = await validStore();
  const ledger = JSON.parse(await readFile(resolve(root,"quality/s03-recipe-input-review.json"),"utf8")) as Ledger;
  return { root, store, ledger, index: new KnowledgeIndex(store) };
}

describe("S03 retained recipe ingredient identities", () => {
  it("preserves every prior canonical byte and admits only the finite proposal", async () => {
    const { root, store, ledger } = await setup();
    expect(Object.keys(ledger.prior_canonical_files)).toHaveLength(68);
    for (const [path, hash] of Object.entries(ledger.prior_canonical_files)) expect(sha256(await readFile(resolve(root,path))),path).toBe(hash);
    const priorReceipts = new Set(ledger.frozen_prior_receipt_ids);
    expect(priorReceipts.size).toBe(7);
    const isPrior = (r: { provenance: { source_receipt_id?: string } }) => priorReceipts.has(r.provenance.source_receipt_id ?? "");
    expect(stableRecordHash(store.claims.filter(isPrior).sort((a,b) => a.claim_id.localeCompare(b.claim_id)))).toBe(ledger.prior_claims_sha256);
    expect(stableRecordHash(store.entities.filter(isPrior).sort((a,b) => a.entity_id.localeCompare(b.entity_id)))).toBe(ledger.prior_entities_sha256);
    expect([store.entities.length,store.claims.length,store.evidence.length,store.receipts.length]).toEqual([CURRENT_CORPUS.entity_records,CURRENT_CORPUS.claims,CURRENT_CORPUS.evidence,CURRENT_CORPUS.receipts]);
    const admission = store.receipts.find(r => r.receipt_id === receiptId)!;
    expect(admission.state).toBe("accepted");
    expect(admission.payload_sha256).toBe("39ac6dae746052f3ec99900ef3431cb183c6ed8b2fcc6f32d0da4e92d61d4eff");
    const entities = store.entities.filter(isS03), claims = store.claims.filter(isS03);
    expect([entities.length,claims.length]).toEqual([25,36]);
    expect(entities.filter(e => e.entity_type === "resource" && e.subtype === "material")).toHaveLength(23);
    expect(entities.filter(e => e.entity_type === "item" && e.subtype === "consumable")).toHaveLength(2);
    expect(claims.filter(c => c.predicate === "relation.crafted_from")).toHaveLength(34);
    expect(claims.filter(c => c.predicate === "recipe.output")).toHaveLength(2);
    expect(store.evidence.filter(isS03)).toEqual([]);
    expect(new Set(claims.flatMap(c => c.evidence_ids))).toEqual(new Set(["evd_06652a8fff4f0593f8ce8431","evd_62f7da1955faa80092f4449a"]));
  });

  it("accounts for all inputs, retains quantities, and never duplicates a valid existing edge", async () => {
    const { store, ledger } = await setup();
    expect(ledger.input_mapping).toHaveLength(161);
    expect(new Set(ledger.input_mapping.map(m => m.source_input_claim_id)).size).toBe(161);
    expect(ledger.recipe_subject_ids).toHaveLength(46);
    expect(ledger.recipes_gaining_input_links).toHaveLength(16);
    expect(ledger.input_mapping.filter(m => m.target_entity_id !== null)).toHaveLength(102);
    expect(ledger.input_mapping.filter(m => m.disposition === "existing_link_unchanged")).toHaveLength(68);
    for (const mapping of ledger.input_mapping) {
      const source = store.claims.find(c => c.claim_id === mapping.source_input_claim_id)!;
      expect(source.predicate).toBe("recipe.input");
      expect(source.object).toEqual({ kind: "string", value: mapping.source_text });
      expect(isS03(source)).toBe(false);
      const parsed = mapping.source_text.match(/^(.*?)(?:\s*×([1-9][0-9]*))?$/)!;
      expect(parsed[1]).toBe(mapping.source_label);
      expect(mapping.quantity).toBe(parsed[2] === undefined ? null : Number(parsed[2]));
      if (mapping.target_entity_id === null) { expect(mapping.relation_claim_id).toBeNull(); continue; }
      const linked = store.claims.find(c => c.claim_id === mapping.relation_claim_id)!;
      expect(linked.subject_entity_id).toBe(source.subject_entity_id);
      expect(linked.predicate).toBe("relation.crafted_from");
      expect(linked.object).toEqual({ kind: "entity", entity_id: mapping.target_entity_id });
      expect(store.entities.find(e => e.entity_id === mapping.target_entity_id)?.entity_type).not.toBe("recipe");
      const duplicates = store.claims.filter(c => c.subject_entity_id === linked.subject_entity_id && c.predicate === linked.predicate && c.object.kind === "entity" && c.object.entity_id === mapping.target_entity_id && c.status !== "retracted");
      expect(duplicates).toHaveLength(1);
      if (isS03(linked)) {
        expect(linked.validity).toEqual(source.validity);
        expect(linked.evidence_ids).toEqual(source.evidence_ids);
        expect(linked.spoiler_level).toBe(source.spoiler_level);
        expect(linked.confidence).toBeLessThanOrEqual(source.confidence);
        expect([linked.status,linked.behavior_kind]).toEqual([source.status,source.behavior_kind]);
      }
    }
  });

  it("holds ambiguous group labels without retracting their input text", async () => {
    const { store, ledger } = await setup();
    const held = ledger.label_mapping.filter(m => m.disposition === "held_category_identity");
    expect(held.map(m => m.source_label).sort()).toEqual(["Fruit","Grain","Meat","Medicinal Herb","Medium Fish","Quality Medicinal Herb","Seafood","Small Fish","Vegetable"].sort());
    expect(ledger.input_mapping.filter(m => m.target_entity_id === null)).toHaveLength(59);
    for (const row of held) expect(store.entities.some(e => isS03(e) && e.canonical_name.text === row.source_label)).toBe(false);
    for (const c of store.claims.filter(isS03)) expect(["relation.crafted_from","recipe.output"]).toContain(c.predicate);
  });

  it("separates food outputs from recipes and preserves superseded history", async () => {
    const { store, index, ledger } = await setup();
    expect(ledger.food_output_mapping).toHaveLength(2);
    expect(ledger.superseded_wrong_target_claim_ids.sort()).toEqual(["clm_463b6ce020d36f7aa4304197","clm_71437fca877548d0908c25bb"].sort());
    for (const row of ledger.food_output_mapping) {
      const recipe = index.getEntity(row.recipe_entity_id)!, item = index.getEntity(row.item_entity_id)!;
      expect([recipe.entity_type,item.entity_type]).toEqual(["recipe","item"]);
      expect(recipe.entity_id).not.toBe(item.entity_id);
      expect([recipe.canonical_name.text,item.canonical_name.text]).toEqual([row.label,row.label]);
      expect(index.claimsForEntity(recipe.entity_id,context).some(c => c.claim_id === row.new_output_claim_id && c.object.kind === "entity" && c.object.entity_id === item.entity_id)).toBe(true);
    }
    const soup = store.entities.find(e => e.canonical_name.text === "Meatball Soup")!;
    const current = index.relationshipGraph(soup.entity_id,context,1,500)!;
    const historical = index.relationshipGraph(soup.entity_id,{ ...context, includeSuperseded: true },1,500)!;
    for (const oldId of ledger.superseded_wrong_target_claim_ids) {
      expect(store.claims.some(c => c.claim_id === oldId)).toBe(true);
      expect(current.edges.some(e => e.claim_id === oldId)).toBe(false);
      expect(historical.edges.some(e => e.claim_id === oldId)).toBe(true);
    }
    expect(current.edges.filter(e => e.predicate === "relation.crafted_from").every(e => index.getEntity(e.object_entity_id)?.entity_type !== "recipe")).toBe(true);
  });

  it("exposes all typed ingredient links through exact-ID graph reads without inventing freshness", async () => {
    const { store, index, ledger } = await setup();
    for (const m of ledger.input_mapping.filter(m => m.target_entity_id !== null)) {
      const graph = index.relationshipGraph(m.recipe_entity_id,context,1,500)!;
      expect(graph.edges.some(e => e.claim_id === m.relation_claim_id && e.object_entity_id === m.target_entity_id)).toBe(true);
    }
    for (const id of ledger.recipe_subject_ids) {
      const name = index.getEntity(id)!.canonical_name.text;
      const packet = index.answer(`What ingredients are needed for ${name}?`,context);
      expect(packet.answer_state).toBe("partial");
      expect(packet.claims.length).toBeGreaterThan(0);
      expect(packet.claims.every(c => ["recipe.input","relation.crafted_from"].includes(c.predicate))).toBe(true);
      expect(packet.claims.filter(isS03).every(c => c.subject_entity_id === id)).toBe(true);
      // These exact same-name item edges predate S03. Preserve and expose the
      // known ambiguity, rather than claiming every natural-language result is recipe-only.
      const preexistingAmbiguity: Record<string,string[]> = {
        "ent_0f44e2bac85651e4e5b136e8": ["clm_95b8f15c8fc6897bc00872ce","clm_ee5a7b76900f77d3dd8cc0b7"],
        "ent_4158856feae336a21a199238": ["clm_8f4c1ef8699aa90203516450"],
      };
      expect(packet.claims.filter(c => c.subject_entity_id !== id).map(c => c.claim_id).sort()).toEqual((preexistingAmbiguity[id] ?? []).sort());
      expect(packet.gaps.map(g => g.code)).toContain("post_patch_review_needed");
      const exact = index.filterClaims({ subjectEntityId: id, predicate: "recipe.input", context, limit: 200 });
      expect(exact.map(c => c.claim_id).sort()).toEqual(ledger.input_mapping.filter(m => m.recipe_entity_id === id).map(m => m.source_input_claim_id).sort());
    }
    expect(store.claims.filter(isS03).every(c => c.validity.reviewed_through_patch === null)).toBe(true);
  });

  it("preserves unknown acquisition, fabricated names, contexts and S02 withholding", async () => {
    const { index } = await setup();
    for (const platform of ["all","pc-steam","playstation-5"] as const) {
      expect(index.answer("Where can I get Gold Dust?",{ ...context, platform }).claims).toEqual([]);
      expect(index.answer("What ingredients are needed for Zorblax Elixir?",{ ...context, platform }).claims).toEqual([]);
      expect(index.answer("Where can I get Aeserion Sword?",{ ...context, platform, spoilerCeiling: "ending" }).claims).toEqual([]);
    }
    expect(index.answer("What ingredients are needed for Freya's Elixir?",{ ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
  });

  it("matches full/compact REST and real stdio MCP without overclaiming compact completeness", async () => {
    const { root, store } = await setup();
    const client = new Client({ name: "s03-recipe-consumer", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import","tsx",resolve(root,"src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const descriptor = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in descriptor)) throw new Error("Expected service JSON");
      const app = createApp(store,{ buildId: JSON.parse(descriptor.text).build_id });
      for (const format of ["full","compact"]) for (const q of ["What ingredients are needed for Freya's Elixir?","What ingredients are needed for Meatball Soup?","What ingredients are needed for Midnight Black Dye?","Where can I get Gold Dust?","What ingredients are needed for Zorblax Elixir?"]) {
        const args = { q, format, patch: "2.01.00", platform: "all", locale: "en-US", spoiler: "none" };
        const response = await app.request(`/v1/answer?${new URLSearchParams(args)}`);
        const body = await response.json();
        const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
        expect(response.status).toBe(200); expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(body[format === "compact" ? "state" : "answer_state"]).toBe(q.includes("Gold Dust") || q.includes("Zorblax") ? "unknown" : "partial");
        expect(JSON.stringify(body)).not.toMatch(/clm_s02|evd_s02|rcp_s02/);
        if (format === "compact") expect((body.claims ?? []).length).toBeLessThanOrEqual(5);
      }
    } finally { await client.close(); }
  },30_000);
});
