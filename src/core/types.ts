export type Platform =
  | "all"
  | "pc-steam"
  | "pc-epic"
  | "mac-steam"
  | "mac-app-store"
  | "playstation-5"
  | "xbox-series";

export type SpoilerLevel =
  | "none"
  | "discovery"
  | "quest_minor"
  | "quest_major"
  | "ending";

export type EpistemicState =
  | "unknown"
  | "unmeasured"
  | "not_applicable"
  | "conflicting"
  | "redacted"
  | "source_unavailable";

export interface Provenance {
  created_at: string;
  updated_at?: string;
  created_by: string;
  source_receipt_id?: string;
}

export interface Validity {
  from_patch: string | null;
  through_patch: string | null;
  reviewed_through_patch: string | null;
  platforms: Platform[];
  locales: string[];
}

export type EntityType =
  | "game"
  | "system"
  | "item"
  | "effect"
  | "skill"
  | "ability"
  | "actor"
  | "quest"
  | "location"
  | "faction"
  | "organization"
  | "activity"
  | "resource"
  | "recipe"
  | "mechanic";

export interface Entity {
  schema_version: "pywel.entity.v1";
  entity_id: string;
  game_id: "crimson_desert";
  slug: string;
  entity_type: EntityType;
  subtype?: string;
  redirect_entity_id?: string;
  canonical_name: LocalizedText;
  summary: string;
  aliases: LocalizedText[];
  tags: string[];
  provenance: Provenance;
}

export interface LocalizedText {
  locale: string;
  text: string;
}

export type ClaimObject =
  | { kind: "entity"; entity_id: string }
  | { kind: "string"; value: string; unit?: string }
  | { kind: "number"; value: number; unit?: string }
  | { kind: "boolean"; value: boolean; unit?: string }
  | { kind: "range"; minimum: number; maximum: number; unit?: string }
  | { kind: "unknown"; state: EpistemicState; reason?: string };

export interface Claim {
  schema_version: "pywel.claim.v1";
  claim_id: string;
  subject_entity_id: string;
  predicate: string;
  object: ClaimObject;
  status:
    | "official"
    | "observed"
    | "corroborated"
    | "inferred"
    | "disputed"
    | "stale"
    | "retracted";
  behavior_kind: "intended" | "observed" | "strategy" | "historical";
  confidence: number;
  evidence_ids: string[];
  validity: Validity;
  spoiler_level: SpoilerLevel;
  supersedes_claim_ids?: string[];
  provenance: Provenance;
}

export interface Evidence {
  schema_version: "pywel.evidence.v1";
  evidence_id: string;
  evidence_type:
    | "official_patch"
    | "official_notice"
    | "official_documentation"
    | "gameplay_observation"
    | "community_report"
    | "guide"
    | "video"
    | "screenshot"
    | "test_result";
  source: {
    url: string;
    title: string;
    publisher: string;
    published_at?: string | null;
    locator: string;
    content_sha256?: string;
  };
  captured_at: string;
  rights: {
    retention_mode: "locator_only" | "normalized_facts" | "authorized_excerpt";
    license_status:
      | "publisher_owned"
      | "compatible_license"
      | "permission_granted"
      | "unknown";
    attribution_required?: boolean;
  };
  reliability: {
    tier:
      | "primary_official"
      | "direct_observation"
      | "corroborated_secondary"
      | "secondary"
      | "unverified";
    independence_group: string;
  };
  provenance: Provenance;
}

export interface PatchRecord {
  schema_version: "pywel.patch.v1";
  patch_id: string;
  game_id: "crimson_desert";
  version: string;
  released_at: string;
  platforms: Platform[];
  source_evidence_ids: string[];
  affected_entity_ids: string[];
  content_coverage: {
    level: "identity_only" | "partial" | "exhaustive";
    normalized_claim_count: number;
    notes: string;
  };
  revision?: number;
  provenance: Provenance;
}

export interface StrategyTransition {
  when: "success" | "failure" | "condition_true" | "condition_false";
  next_node_id: string | null;
}

export interface StrategyNode {
  node_id: string;
  action: string;
  target_entity_id?: string;
  instruction: string;
  transitions: StrategyTransition[];
}

export interface Strategy {
  schema_version: "pywel.strategy.v1";
  strategy_id: string;
  slug: string;
  title: string;
  goal_entity_id: string;
  status:
    | "source_supported"
    | "observed"
    | "verified"
    | "disputed"
    | "stale"
    | "retracted";
  prerequisites: Array<{
    subject_entity_id?: string;
    predicate: string;
    expected: string | number | boolean;
  }>;
  entry_node_id: string;
  nodes: StrategyNode[];
  priorities: {
    speed: number;
    safety: number;
    resource_efficiency: number;
    accessibility: number;
  };
  verification: {
    attempts: number;
    successful_attempts: number;
    independent_sources: number;
  };
  validity: Validity;
  spoiler_level: SpoilerLevel;
  evidence_ids: string[];
  provenance: Provenance;
}

export interface Receipt {
  schema_version: "pywel.receipt.v1";
  receipt_id: string;
  receipt_type:
    | "seed"
    | "contribution"
    | "publication"
    | "verification"
    | "incident"
    | "source_request"
    | "takedown";
  created_at: string;
  state:
    | "received"
    | "quarantined"
    | "duplicate"
    | "under_review"
    | "needs_corroboration"
    | "accepted"
    | "rejected"
    | "superseded"
    | "retracted";
  payload_hash_scope: "related_records_canonical_json" | "external_payload";
  payload_sha256: string;
  safe_summary: string;
  related_record_ids?: string[];
}

export interface PredicateDefinition {
  predicate: string;
  description: string;
  object_kinds: Array<ClaimObject["kind"]>;
  cardinality?: "one" | "many";
  units?: string[];
  status: "core" | "provisional" | "retired";
}

export interface PredicateRegistry {
  schema_version: "pywel.predicate_registry.v1";
  registry_version: number;
  predicates: PredicateDefinition[];
}

export interface EntitySubtypeDefinition {
  subtype: string;
  entity_types: EntityType[];
  description: string;
  status: "core" | "provisional" | "retired";
}

export interface EntitySubtypeRegistry {
  schema_version: "pywel.entity_subtype_registry.v1";
  registry_version: number;
  subtypes: EntitySubtypeDefinition[];
}

export interface KnowledgeStore {
  entities: Entity[];
  claims: Claim[];
  evidence: Evidence[];
  patches: PatchRecord[];
  strategies: Strategy[];
  receipts: Receipt[];
  predicateRegistry: PredicateRegistry;
  entitySubtypeRegistry: EntitySubtypeRegistry;
}

export type CanonicalRecord =
  | Entity
  | Claim
  | Evidence
  | PatchRecord
  | Strategy
  | Receipt;

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  path?: string;
  record_id?: string;
}

export interface ValidationReport {
  valid: boolean;
  checked_at: string;
  counts: Record<string, number>;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface EvidencePacket {
  schema_version: "pywel.answer.v1";
  answer_state: "supported" | "partial" | "unknown" | "conflicting";
  query: string;
  assumptions: {
    patch: string | null;
    platform: Platform;
    locale: string;
    spoiler_ceiling: SpoilerLevel;
  };
  concise_answer: string;
  selection: {
    claims: { matched: number; returned: number };
    strategies: { matched: number; returned: number };
  };
  entities: Entity[];
  claims: Claim[];
  evidence: Evidence[];
  strategies: Strategy[];
  warnings: string[];
  gaps: Array<{ code: string; message: string; suggested_contribution?: string }>;
  freshness: {
    latest_known_patch: string | null;
    generated_from_corpus_at: string;
  };
}
