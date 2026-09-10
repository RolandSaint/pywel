import type { EvidencePacket, Strategy } from "../core/types.js";

function compactWarning(warning: string): string {
  if (warning.startsWith("No patch was supplied;")) return "latest_patch_assumed";
  if (warning === "One or more matching claims are stale; returned stale claims are explicitly labeled.") return "stale_claims_included";
  if (warning.includes("not been reviewed through patch")) return "review_gap";
  if (warning.includes("identity-only coverage")) return "patch_identity_only";
  if (warning.includes("publisher-stated intent")) return "official_intent_not_observed";
  if (warning.startsWith("Matching claims include inferred statements")) return "inference_not_observation";
  if (warning.includes("Conflicting or disputed claims")) return "conflict_visible";
  return warning;
}

function requiredIndex(indexes: Map<string, number>, id: string, kind: string): number {
  const index = indexes.get(id);
  if (index === undefined) throw new Error(`Compact packet is missing referenced ${kind} ${id}.`);
  return index;
}

function strategyPath(strategy: Strategy, packet: EvidencePacket): string {
  const context = new URLSearchParams({
    patch: packet.assumptions.patch ?? "null",
    platform: packet.assumptions.platform,
    locale: packet.assumptions.locale,
    spoiler: packet.assumptions.spoiler_ceiling,
    ...(strategy.status === "retracted" ? { include_retracted: "true" } : {}),
  });
  return `/v1/strategies/${encodeURIComponent(strategy.strategy_id)}?${context.toString()}`;
}

export function compactEvidencePacket(packet: EvidencePacket): Record<string, unknown> {
  const catalogSummaryOnly = packet.gaps.some((gap) => gap.code === "requested_fact_catalog_summary_only");
  const claims = packet.claims.slice(0, 5);
  const strategies = packet.strategies.slice(0, 2);
  const referencedEntityIds = new Set([
    ...(claims.length === 0 ? packet.entities.slice(0, 1).map((entity) => entity.entity_id) : []),
    ...claims.flatMap((claim) => [
      claim.subject_entity_id,
      ...(claim.object.kind === "entity" ? [claim.object.entity_id] : []),
    ]),
  ]);
  const entities = packet.entities.filter((entity) => referencedEntityIds.has(entity.entity_id));
  const referencedEvidenceIds = new Set([
    ...claims.flatMap((claim) => claim.evidence_ids),
    ...strategies.flatMap((strategy) => strategy.evidence_ids),
  ]);
  const evidence = packet.evidence.filter((item) => referencedEvidenceIds.has(item.evidence_id));
  const entityIndexes = new Map(entities.map((entity, index) => [entity.entity_id, index]));
  const evidenceIndexes = new Map(evidence.map((item, index) => [item.evidence_id, index]));
  const more = {
    entities: Math.max(0, packet.entities.length - entities.length),
    claims: Math.max(0, packet.claims.length - claims.length),
    evidence: Math.max(0, packet.evidence.length - evidence.length),
    strategies: Math.max(0, packet.strategies.length - strategies.length),
  };
  const hasMore = Object.values(more).some((count) => count > 0);
  const warnings = packet.warnings;
  const catalogEntity = catalogSummaryOnly ? packet.entities[0] : undefined;

  return {
    schema_version: "pywel.answer.compact.v3",
    state: packet.answer_state,
    ctx: [
      packet.assumptions.patch,
      packet.assumptions.platform,
      packet.assumptions.locale,
      packet.assumptions.spoiler_ceiling,
    ],
    answer: packet.concise_answer,
    selection: {
      claims: { matched: packet.selection.claims.matched, returned: claims.length },
      strategies: { matched: packet.selection.strategies.matched, returned: strategies.length },
    },
    ...(entities.length === 0
      ? {}
      : { entities: entities.map((entity) => [entity.entity_id, entity.canonical_name.text, entity.entity_type]) }),
    ...(claims.length === 0
      ? {}
      : {
          claims: claims.map((claim) => [
            claim.claim_id,
            requiredIndex(entityIndexes, claim.subject_entity_id, "entity"),
            claim.predicate,
            claim.object,
            claim.status,
            claim.behavior_kind,
            claim.confidence,
            claim.evidence_ids.map((id) => requiredIndex(evidenceIndexes, id, "evidence")),
            claim.validity,
          ]),
        }),
    ...(evidence.length === 0
      ? {}
      : { evidence: evidence.map((item) => [item.evidence_id, item.source.url, item.reliability.tier]) }),
    ...(strategies.length === 0
      ? {}
      : {
          strategies: strategies.map((strategy) => [
            strategy.strategy_id,
            strategy.status,
            strategyPath(strategy, packet),
          ]),
        }),
    ...(catalogEntity === undefined
      ? {}
      : { catalog: [catalogEntity.entity_id, catalogEntity.provenance.source_receipt_id] }),
    ...(warnings.length === 0 ? {} : { warnings: [...new Set(warnings.map(compactWarning))] }),
    ...(packet.gaps.length === 0 ? {} : { gaps: packet.gaps.map((gap) => gap.code) }),
    freshness: packet.freshness.latest_known_patch,
    ...(hasMore
      ? {
          more: [
            more.entities,
            more.claims,
            more.evidence,
            more.strategies,
            "format=full",
          ],
        }
      : {}),
    codebook: "/v1/codebook",
  };
}

export const COMPACT_CODEBOOK = {
  schema_version: "pywel.codebook.v2",
  answer_compact: {
    schema_version: "pywel.answer.compact.v3",
    schema: "schemas/agent-contract.schema.json#/definitions/answerCompact",
    full_schema: "schemas/agent-contract.schema.json#/definitions/answerFull",
    limits: { claims: 5, strategies: 2, full_claims: 20, full_strategies: 8 },
    selection: "Matched counts include all eligible answer candidates; returned counts describe this projection. Full answers also have fixed limits.",
    ctx: ["patch", "platform", "locale", "spoiler_ceiling"],
    entities: ["entity_id", "canonical_name", "entity_type"],
    claims: [
      "claim_id",
      "subject_entity_index",
      "predicate",
      "object (canonical typed ClaimObject; entity objects retain full entity IDs)",
      "status",
      "behavior_kind",
      "confidence",
      "evidence_indexes",
      "validity (from_patch, through_patch, reviewed_through_patch, platforms, locales)",
    ],
    evidence: ["evidence_id", "url", "reliability_tier"],
    strategies: [
      "strategy_id",
      "status",
      "full_strategy_href",
    ],
    freshness: "latest_known_patch",
    more: ["omitted_entity_count", "omitted_claim_count", "omitted_evidence_count", "omitted_strategy_count", "full_projection_hint"],
    build_id: "SHA-256 identity of the source revision and pinned runtime",
    canonical_path: "Relative path that repeats this request with resolved context and format",
    full_path: "Relative path to the full answer with the same resolved context",
    catalog: ["entity_id", "source_receipt_id"],
    warning_codes: {
      latest_patch_assumed: "The caller omitted a patch, so the latest known stable patch was used.",
      stale_claims_included: "One or more matched claims are stale; returned stale claims are explicitly labeled.",
      review_gap: "One or more matched records have not been reviewed through the requested patch.",
      patch_identity_only: "The requested patch has identity-only coverage.",
      official_intent_not_observed: "Publisher-stated intent is not independent gameplay observation.",
      inference_not_observation: "Inferred claims are bounded hypotheses, not direct observations.",
      conflict_visible: "Conflicting or disputed claims remain unresolved and visible.",
    },
  },
} as const;
