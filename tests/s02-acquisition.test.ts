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
type Ledger = {
  status: string;
  rights_holder_authorization: unknown;
  permitted_replacement_intake: unknown;
  affected_existing_entity_ids: string[];
  withdrawn_receipt_id: string;
  withdrawn_counts: Record<string, number>;
  withdrawn_files: Array<{ path: string; sha256: string }>;
  prior_canonical_files: Record<string, string>;
  prior_claims_sha256: string;
  prior_entities_sha256: string;
};
async function setup() {
  const { root, store } = await validStore();
  const ledger = JSON.parse(await readFile(resolve(root, "quality/s02-acquisition-review.json"), "utf8")) as Ledger;
  const subjects = ledger.affected_existing_entity_ids.map(id => {
    const entity = store.entities.find(e => e.entity_id === id);
    if (!entity) throw new Error(`Missing preserved S01 subject: ${id}`);
    return entity;
  });
  return { root, store, ledger, subjects, index: new KnowledgeIndex(store) };
}

describe("S02 source-intake containment, not accepted acquisition depth", () => {
  it("preserves all 68 earlier canonical files and their original record hashes", async () => {
    const { root, store, ledger, subjects } = await setup();
    expect(Object.keys(ledger.prior_canonical_files)).toHaveLength(68);
    for (const [path, hash] of Object.entries(ledger.prior_canonical_files)) expect(sha256(await readFile(resolve(root, path))), path).toBe(hash);
    // Freeze the pre-S02 cohort; later independent additions do not redefine its hashes.
    const priorReceipts = new Set([
      "rcp_m1publicscope202609100001", "rcp_m7houseroberts2026091001",
      "rcp_m8aprogression2026091001", "rcp_m8bequipment2026091001",
      "rcp_r01equipment2026091001", "rcp_g02patchcatchup2026091001",
      "rcp_s01equipment2026091101",
    ]);
    const inPrior = (r: { provenance: { source_receipt_id?: string } }) => priorReceipts.has(r.provenance.source_receipt_id ?? "");
    const priorClaims = store.claims.filter(inPrior), priorEntities = store.entities.filter(inPrior);
    expect(stableRecordHash(priorClaims.sort((a,b) => a.claim_id.localeCompare(b.claim_id)))).toBe(ledger.prior_claims_sha256);
    expect(stableRecordHash(priorEntities.sort((a,b) => a.entity_id.localeCompare(b.entity_id)))).toBe(ledger.prior_entities_sha256);
    expect([priorEntities.length, priorClaims.length, store.evidence.filter(inPrior).length, store.receipts.filter(r => priorReceipts.has(r.receipt_id)).length]).toEqual([520, 2591, 306, 7]);
    expect(subjects).toHaveLength(100);
    expect(new Set(subjects.map(e => e.entity_id)).size).toBe(100);
    for (const entity of subjects) expect(store.claims.some(c => c.subject_entity_id === entity.entity_id), entity.entity_id).toBe(true);
  });

  it("withdraws the exact receipt and all its dependents from current canonical source and admission", async () => {
    const { root, store, ledger } = await setup();
    expect(store.entities.filter(isS02)).toEqual([]);
    expect(store.claims.filter(isS02)).toEqual([]);
    expect(store.evidence.filter(isS02)).toEqual([]);
    expect(store.receipts.filter(r => r.receipt_id === receipt)).toEqual([]);
    expect(ledger.withdrawn_receipt_id).toBe(receipt);
    expect(ledger.withdrawn_counts).toEqual({ entities: 0, claims: 245, evidence: 103, receipts: 1, existing_subjects: 100 });
    expect(ledger.withdrawn_files.map(f => f.path).sort()).toEqual([
      "data/canonical/claims/s02-acquisition.json", "data/canonical/evidence/s02-acquisition.json", "data/canonical/receipts/s02-acquisition.json",
    ]);
    const additions = JSON.parse(await readFile(resolve(root, "quality/corpus-additions.json"), "utf8")) as {
      canonical_files: Array<{ path: string }>;
      record_ids: Record<string, string[]>;
      reviewed_sources: Array<{ evidence_id: string }>;
    };
    for (const file of ledger.withdrawn_files) {
      expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
      await expect(readFile(resolve(root, file.path))).rejects.toMatchObject({ code: "ENOENT" });
      expect(additions.canonical_files.some(f => f.path === file.path)).toBe(false);
    }
    const admitted = Object.values(additions.record_ids).flat();
    expect(admitted.some(id => /^(clm_s02|evd_s02|rcp_s02)/.test(id))).toBe(false);
    expect(additions.reviewed_sources.some(s => s.evidence_id.startsWith("evd_s02"))).toBe(false);
    expect(store.claims.some(c => c.claim_id.startsWith("clm_s02") || c.evidence_ids.some(id => id.startsWith("evd_s02")))).toBe(false);
    expect(store.evidence.some(e => e.evidence_id.startsWith("evd_s02"))).toBe(false);
  });

  it("records the unresolved method blocker without retaining the old field projection in the audit ledger", async () => {
    const { root, ledger } = await setup();
    expect(ledger.status).toBe("blocked_source_intake");
    expect(ledger.rights_holder_authorization).toBeNull();
    expect(ledger.permitted_replacement_intake).toBeNull();
    const text = await readFile(resolve(root, "quality/s02-acquisition-review.json"), "utf8");
    for (const key of ["selection", "entries", "station_label", "seller_label", "shop_label", "stage_label"]) expect(text).not.toContain(`"${key}":`);
    expect(await readFile(resolve(root, "000_LOAD_FIRST_PYWEL.yaml"), "utf8")).toContain("status: post_release_s02_intake_blocked");
    expect(await readFile(resolve(root, "docs/S02_ACQUISITION.md"), "utf8")).toContain("S02 is not complete or accepted.");
  });

  it("returns acquisition gaps for every affected subject without substituting another item's records", async () => {
    const { subjects, index } = await setup();
    for (const entity of subjects) {
      const q = `Where can I get ${entity.canonical_name.text}?`;
      const answer = index.answer(q, context);
      expect(answer.claims, q).toEqual([]);
      expect(answer.evidence, q).toEqual([]);
      expect(answer.answer_state, q).not.toBe("supported");
    }
  });

  it("does not reveal withdrawn acquisitions at any spoiler ceiling or contaminate preserved effects", async () => {
    const { subjects, index } = await setup();
    for (const entity of subjects) {
      const name = entity.canonical_name.text;
      for (const ceiling of ["none", "discovery", "quest_minor", "quest_major", "ending"] as const) {
        const packet = index.answer(`Where can I get ${name}?`, { ...context, spoilerCeiling: ceiling });
        expect(packet.claims, name).toEqual([]);
        expect(packet.evidence, name).toEqual([]);
      }
      const effects = index.answer(`What are the effects of ${name}?`, { ...context, spoilerCeiling: "discovery" });
      expect(effects.claims.some(isS02), name).toBe(false);
      expect(effects.evidence.some(isS02), name).toBe(false);
    }
    expect(JSON.stringify(index.answer("Where can I get Dark Executioner Leather Armor?", { ...context, spoilerCeiling: "ending" }))).not.toContain("The Heart of Pywel");
  });

  it("retains crafting, platform, unknown-patch and absent-name boundaries", async () => {
    const { index } = await setup();
    for (const name of ["Aeserion Sword", "Fluttering Radiance Plate Boots", "Kuku Bismuth Spear", "Kuku Rishi's Boots"]) {
      expect(index.answer(`What is required to craft ${name}?`, context).claims).toEqual([]);
    }
    expect(index.answer("Where can I get Aeserion Sword?", { ...context, platform: "playstation-5" }).claims).toEqual([]);
    expect(index.answer("Where can I get Aeserion Sword?", { ...context, patch: "9.99.00" }).answer_state).toBe("unknown");
    expect(index.answer("Where can I get Zorblax Alloy Cuirass?", context).claims).toEqual([]);
  });

  it("preserves identical withholding through full/compact REST and actual stdio MCP", async () => {
    const { root, store } = await setup();
    const client = new Client({ name: "s02-containment-consumer", version: "1.0.0" });
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
        // Compact v3 omits empty arrays; full packets retain them.
        expect(body[format === "compact" ? "state" : "answer_state"]).toBe("unknown");
        if (format === "compact") {
          expect(body.claims).toBeUndefined();
          expect(body.evidence).toBeUndefined();
        } else {
          expect(body.claims).toEqual([]);
          expect(body.evidence).toEqual([]);
        }
        expect(JSON.stringify(body)).not.toMatch(/clm_s02|evd_s02|rcp_s02/);
        if (q.includes("Dark Executioner")) expect(JSON.stringify(body)).not.toContain("The Heart of Pywel");
      }
    } finally { await client.close(); }
  }, 30_000);
});
