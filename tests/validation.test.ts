import { describe, expect, it } from "vitest";
import { validStore } from "./helpers.js";
import { CURRENT_CORPUS } from "./support/current-coverage.js";
import { compileStandaloneValidator, validateCorpus, validateIntegrity } from "../src/core/validate.js";
import { loadDocuments } from "../src/core/loader.js";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

describe("canonical validation", () => {
  it("rejects operational metadata placed inside canon instead of silently ignoring it", async () => {
    const { root: project } = await validStore();
    const root = await mkdtemp(resolve(tmpdir(), "pywel-canonical-metadata-"));
    try {
      await cp(resolve(project, "data"), resolve(root, "data"), { recursive: true });
      await cp(resolve(project, "schemas"), resolve(root, "schemas"), { recursive: true });
      for (const file of ["publication-contract-v1.json", "corpus-additions.json"]) {
        await cp(resolve(project, "quality", file), resolve(root, "data", "canonical", "ignored-metadata.json"));
        const { report } = await validateCorpus(root);
        expect(report.valid).toBe(false);
        expect(report.errors).toContainEqual(expect.objectContaining({ code: "schema_version_unknown", path: "data/canonical/ignored-metadata.json" }));
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects symlinked data ancestors, canonical roots, and schema inputs", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "pywel-input-boundary-"));
    try {
      const outside = resolve(root, "outside");
      const source = resolve(root, "source");
      await mkdir(outside);
      await mkdir(source);
      await symlink(outside, resolve(source, "data"), "dir");
      await expect(loadDocuments(source)).rejects.toThrow("real directory");
      await rm(resolve(source, "data"));
      await mkdir(resolve(source, "data"));
      await symlink(outside, resolve(source, "data", "canonical"), "dir");
      await expect(loadDocuments(source)).rejects.toThrow("real directory");
      await symlink(outside, resolve(source, "schemas"), "dir");
      await expect(compileStandaloneValidator(source, "pywel.entity.v1")).rejects.toThrow("real directory");
      await rm(resolve(source, "schemas"));
      await mkdir(resolve(source, "schemas"));
      await writeFile(resolve(outside, "external.json"), "{}");
      await symlink(resolve(outside, "external.json"), resolve(source, "schemas", "entity.schema.json"));
      await expect(compileStandaloneValidator(source, "pywel.entity.v1")).rejects.toThrow("regular files");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects a historical patch counter that exceeds its retained source-linked assertions", async () => {
    const store = structuredClone((await validStore()).store);
    const patch = store.patches.find((record) => record.content_coverage.level === "partial")!;
    patch.content_coverage.normalized_claim_count = store.claims.length + 1;
    expect(validateIntegrity(store)).toContainEqual(expect.objectContaining({
      severity: "error", code: "patch_normalized_claim_count_mismatch", record_id: patch.patch_id,
    }));
  });

  it("rejects duplicated identities and missing evidence even when records have valid shapes", async () => {
    const store = structuredClone((await validStore()).store);
    const claim = store.claims[0]!;
    store.claims.push(structuredClone(claim));
    claim.evidence_ids = ["evd_000000000000000000000000"];
    const issues = validateIntegrity(store);
    expect(issues).toContainEqual(expect.objectContaining({ code: "record_id_duplicate", record_id: claim.claim_id }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "reference_missing", record_id: claim.claim_id }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "receipt_payload_hash_mismatch" }));
  });

  it("validates schema, references, graphs, and receipt hashes", async () => {
    const { report, store } = await validStore();
    expect(report.errors).toEqual([]);
    expect(report.warnings).toHaveLength(CURRENT_CORPUS.strategies);
    expect(new Set(report.warnings.map((warning) => warning.code))).toEqual(
      new Set(["strategy_unobserved"]),
    );
    expect(store.predicateRegistry.predicates).toHaveLength(177);
    expect(store.predicateRegistry.registry_version).toBe(14);
    expect(store.predicateRegistry.predicates.find((item) => item.predicate === "quest.organization")).toMatchObject({ cardinality: "many", object_kinds: ["entity", "unknown"], status: "core" });
    expect(store.predicateRegistry.predicates.find((item) => item.predicate === "build.uses_effect")?.cardinality).toBe("many");
    expect(store.predicateRegistry.predicates.find((item) => item.predicate === "quest.objective")?.cardinality).toBe("many");
    expect(store.predicateRegistry.predicates.find((item) => item.predicate === "build.patch_baseline")?.cardinality).toBeUndefined();
    expect(store.entitySubtypeRegistry.registry_version).toBe(9);
    expect(store.entitySubtypeRegistry.subtypes).toHaveLength(71);
    expect(store.patches).toHaveLength(CURRENT_CORPUS.patches);
    expect(store.entities).toHaveLength(CURRENT_CORPUS.entity_records);
    expect(store.claims).toHaveLength(CURRENT_CORPUS.claims);
    expect(store.evidence).toHaveLength(CURRENT_CORPUS.evidence);
    expect(store.strategies).toHaveLength(CURRENT_CORPUS.strategies);
    expect(store.receipts).toHaveLength(CURRENT_CORPUS.receipts);
    for (const patch of store.patches) {
      const claims = store.claims.filter((claim) => claim.status === "official" && claim.validity.from_patch === patch.version && claim.evidence_ids.some((id) => patch.source_evidence_ids.includes(id)));
      expect(patch.content_coverage.level).toBe(claims.length > 0 ? "partial" : "identity_only");
      // The historical counter describes a subset and is not a completeness claim.
      expect(patch.content_coverage.normalized_claim_count).toBeLessThanOrEqual(claims.length);
      expect(patch.content_coverage.notes).toContain(patch.patch_id.startsWith("pat_g02")
        ? "no normalized gameplay claims or claim-review advancement"
        : "complete note or observed gameplay coverage is not claimed");
    }
  });
});
