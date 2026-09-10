import type { Claim, Entity, Evidence, KnowledgeStore, PatchRecord } from "../../src/core/types.js";

// Entirely synthetic records: query behavior is independent of the retained game dataset.
export function queryFixture(): KnowledgeStore {
  const provenance = { created_at: "2026-09-10T00:00:00Z", created_by: "synthetic_test_fixture" };
  const entity: Entity = {
    schema_version: "pywel.entity.v1", entity_id: "ent_syntheticcompass00001", game_id: "crimson_desert",
    entity_type: "system", slug: "system.synthetic-compass", canonical_name: { locale: "en-US", text: "Synthetic Compass" },
    summary: "Synthetic query fixture.", aliases: [], tags: [], provenance,
  };
  const evidence: Evidence = {
    schema_version: "pywel.evidence.v1", evidence_id: "evd_syntheticcompass00001", evidence_type: "test_result",
    source: { url: "https://example.invalid/fixture", title: "Synthetic fixture", publisher: "Test fixture", locator: "Statement 1" },
    captured_at: provenance.created_at, rights: { retention_mode: "normalized_facts", license_status: "compatible_license" },
    reliability: { tier: "direct_observation", independence_group: "synthetic_fixture" }, provenance,
  };
  const claim: Claim = {
    schema_version: "pywel.claim.v1", claim_id: "clm_syntheticcompass00001", subject_entity_id: entity.entity_id,
    predicate: "system.available", object: { kind: "boolean", value: true }, status: "official", behavior_kind: "intended",
    confidence: 0.9, evidence_ids: [evidence.evidence_id],
    validity: { from_patch: "1.00.00", through_patch: null, reviewed_through_patch: "1.00.00", platforms: ["all"], locales: ["en-US"] },
    spoiler_level: "none", provenance,
  };
  const patches: PatchRecord[] = ["1.00.00", "1.01.00"].map((version, index) => ({
    schema_version: "pywel.patch.v1", patch_id: `pat_syntheticcompass0000${index + 1}`, game_id: "crimson_desert", version,
    released_at: "2026-09-10T00:00:00Z", platforms: ["all"], source_evidence_ids: [evidence.evidence_id], affected_entity_ids: [entity.entity_id],
    content_coverage: { level: "partial", normalized_claim_count: index === 0 ? 1 : 0, notes: "Synthetic fixture." }, provenance,
  }));
  return {
    entities: [entity], claims: [claim], evidence: [evidence], patches, strategies: [], receipts: [],
    predicateRegistry: { schema_version: "pywel.predicate_registry.v1", registry_version: 1, predicates: [] },
    entitySubtypeRegistry: { schema_version: "pywel.entity_subtype_registry.v1", registry_version: 1, subtypes: [] },
  };
}
