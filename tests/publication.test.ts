import { describe, expect, it } from "vitest";
import { stableRecordHash } from "../src/core/canonical-json.js";
import { validateIntegrity } from "../src/core/validate.js";
import {
  buildPublicationRecordAudit,
  inspectPublicationText,
  loadPublicationContract,
  publicKnowledgeProjection,
} from "../src/quality/publication.js";
import { validStore } from "./helpers.js";
import { CURRENT_CORPUS } from "./support/current-coverage.js";

describe("publication boundary", () => {
  it("retains the fixed evidence-backed corpus without rights holds", async () => {
    const { root, store } = await validStore();
    const report = buildPublicationRecordAudit(store, await loadPublicationContract(root));
    expect(report.automated_violations).toEqual([]);
    expect(report.public_family_counts).toMatchObject({
      entities: CURRENT_CORPUS.entity_records,
      claims: CURRENT_CORPUS.claims,
      evidence: CURRENT_CORPUS.evidence,
    });
    expect(report.record_specific_rights_holds).toEqual([]);
  });

  it("preserves independently verifiable public provenance using only retained families", async () => {
    const { store } = await validStore();
    const projection = publicKnowledgeProjection(store);
    expect(Object.keys(projection).sort()).toEqual([
      "claims", "entities", "entitySubtypeRegistry", "evidence", "patches",
      "predicateRegistry", "receipts", "strategies",
    ]);
    expect(projection.entities).toHaveLength(store.entities.length);
    expect(projection.claims).toHaveLength(store.claims.length);
    expect(projection.receipts.length).toBeGreaterThan(0);
    expect(validateIntegrity(projection).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("rejects runtime fields for removed operational families", async () => {
    const { store } = await validStore();
    for (const family of ["policies", "sourceEvents", "patchChanges", "privateContext"]) {
      const mutated = { ...store, [family]: [{ note: "Unreviewed input must not be published." }] };
      expect(() => publicKnowledgeProjection(mutated)).toThrow("unsupported record family");
    }
  });

  it("refuses missing, altered, or privately scoped provenance instead of dropping receipts", async () => {
    const { store } = await validStore();
    const missing = structuredClone(store);
    missing.receipts = [];
    expect(() => publicKnowledgeProjection(missing)).toThrow("public hash scope");
    const changed = structuredClone(store);
    changed.receipts[0]!.payload_sha256 = "0".repeat(64);
    expect(() => publicKnowledgeProjection(changed)).toThrow("does not match");
    const privateScope = structuredClone(store);
    privateScope.receipts[0]!.related_record_ids!.push(`evt_${"a".repeat(24)}`);
    expect(() => publicKnowledgeProjection(privateScope)).toThrow("public hash scope");
    const extra = structuredClone(store);
    extra.receipts.push({
      ...extra.receipts[0]!, receipt_id: `rcp_${"f".repeat(24)}`,
      state: "quarantined", payload_hash_scope: "external_payload",
    });
    expect(publicKnowledgeProjection(extra).receipts).toHaveLength(store.receipts.length);
  });

  it("rejects an internally correct digest that omits a record citing the receipt", async () => {
    const { store } = await validStore();
    const mutated = structuredClone(store);
    const claim = mutated.claims[0]!;
    const receipt = mutated.receipts.find(item => item.receipt_id === claim.provenance.source_receipt_id)!;
    receipt.related_record_ids = [claim.claim_id];
    receipt.payload_sha256 = stableRecordHash([claim]);
    expect(() => publicKnowledgeProjection(mutated)).toThrow("omits a referring record");
  });

  it("rejects invalid rights and attribution combinations without granting publication rights", async () => {
    const { root, store } = await validStore();
    const mutated = structuredClone(store);
    mutated.evidence[0]!.rights = {
      retention_mode: "authorized_excerpt", license_status: "unknown", attribution_required: false,
    };
    const report = buildPublicationRecordAudit(mutated, await loadPublicationContract(root));
    expect(report.automated_violations.map((item) => item.code)).toEqual(expect.arrayContaining([
      "authorized_excerpt_without_reuse_rights", "external_source_without_attribution",
    ]));
    mutated.evidence[0]!.rights.retention_mode = "normalized_facts";
    const held = buildPublicationRecordAudit(mutated, await loadPublicationContract(root));
    expect(held.record_specific_rights_holds.map(item => item.record_id)).toContain(mutated.evidence[0]!.evidence_id);
  });

  it("rejects private source locators, secrets in records, and unsafe receipt summaries", async () => {
    const { root, store } = await validStore();
    const mutated = structuredClone(store);
    mutated.evidence[0]!.source.url = "urn:pywel:artifact:fixture";
    mutated.entities[0]!.summary = "Fixture " + "ghp_" + "A".repeat(40);
    const report = buildPublicationRecordAudit(mutated, await loadPublicationContract(root));
    expect(report.automated_violations.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "source_scheme_not_public", "github_token_material",
    ]));
    const privateReceipt = structuredClone(store);
    privateReceipt.receipts[0]!.safe_summary = "Fixture " + "/Users/" + "example/private-note";
    expect(() => publicKnowledgeProjection(privateReceipt)).toThrow("non-public material");
  });

  it("scans generated text without exposing the matched secret or private path", () => {
    const text = "private=" + "C:" + "\\\\Users\\\\example" + "\nsecret=" + "ghp_" + "A".repeat(40);
    const issues = inspectPublicationText(text, "README.md");
    expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "github_token_material", "user_profile_path",
    ]));
    expect(issues.every(issue => issue.path === "README.md")).toBe(true);
    expect(JSON.stringify(issues)).not.toContain("example");
    expect(JSON.stringify(issues)).not.toContain("A".repeat(40));
  });
});
