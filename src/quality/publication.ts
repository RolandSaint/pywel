import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalJson, stableRecordHash } from "../core/canonical-json.js";
import { compileStandaloneValidator } from "../core/validate.js";
import type { CanonicalRecord, Evidence, KnowledgeStore, Receipt } from "../core/types.js";

export interface PublicationContract {
  schema_version: "pywel.publication_contract.v1";
  contract_id: string;
  allowed_source_schemes: ["https:"];
  public_docs: string[];
  public_schemas: string[];
}

export interface PublicationViolation {
  scope: "record" | "artifact";
  code: string;
  record_family?: string;
  record_id?: string;
  path?: string;
}

export interface PublicationRecordAudit {
  inspected_records: number;
  public_family_counts: Record<string, number>;
  record_specific_rights_holds: Array<{
    record_id: string;
    reason_code: "unknown_license_normalized_fact_requires_independent_review";
  }>;
  automated_violations: PublicationViolation[];
}

const SECRET_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["private_key_material", /-----BEGIN (?:DSA |EC |OPENSSH |RSA )?PRIVATE KEY-----/],
  ["github_token_material", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["openai_key_material", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["aws_key_material", /\b(?:A3T|AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["slack_token_material", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
];

const PRIVATE_PATH_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["windows_absolute_path", /(?:^|[\s"'])(?:[A-Za-z]:[\\/]|[A-Za-z]:\\\\)/m],
  ["user_profile_path", /(?:C:\\+Users\\+|C:\\\\Users\\\\|\/Users\/[^/\s]+\/)/i],
  ["private_workspace_name", /My Drive/i],
];

// Scan content as data; never execute instructions supplied by evidence or records.
export function inspectPublicationText(text: string, path: string): PublicationViolation[] {
  return [...SECRET_PATTERNS, ...PRIVATE_PATH_PATTERNS]
    .filter(([, pattern]) => pattern.test(text))
    .map(([code]) => ({ scope: "artifact", path, code }));
}

function addViolation(target: PublicationViolation[], value: PublicationViolation): void {
  target.push(value);
}

function publicRecordCounts(store: KnowledgeStore, publicReceiptCount: number): Record<string, number> {
  return {
    claims: store.claims.length,
    entities: store.entities.length,
    entity_subtype_registry: store.entitySubtypeRegistry.subtypes.length,
    evidence: store.evidence.length,
    patches: store.patches.length,
    predicate_registry: store.predicateRegistry.predicates.length,
    strategies: store.strategies.length,
    receipts: publicReceiptCount,
  };
}

function recordId(record: CanonicalRecord): string {
  for (const field of ["entity_id", "claim_id", "evidence_id", "patch_id", "strategy_id"] as const) {
    if (field in record) return (record as unknown as Record<string, string>)[field]!;
  }
  throw new Error("Record is not public knowledge");
}

// A provenance receipt is public only when its complete integrity scope can be
// recomputed from public records. Never trim an old receipt or rewrite its hash.
function publicProvenanceReceipts(store: KnowledgeStore): Receipt[] {
  const records = [
    ...store.entities, ...store.claims, ...store.evidence, ...store.patches,
    ...store.strategies,
  ];
  const recordsById = new Map(records.map((record) => [recordId(record), record]));
  const referenced = new Set(records.flatMap((record) =>
    "provenance" in record && record.provenance.source_receipt_id !== undefined
      ? [record.provenance.source_receipt_id] : [],
  ));
  const receiptsById = new Map(store.receipts.map((receipt) => [receipt.receipt_id, receipt]));
  const receipts: Receipt[] = [];
  for (const id of [...referenced].sort()) {
    const receipt = receiptsById.get(id);
    const related = receipt?.related_record_ids ?? [];
    const relatedIds = new Set(related);
    if (
      receipt === undefined || receipt.state !== "accepted" ||
      receipt.payload_hash_scope !== "related_records_canonical_json" ||
      related.length === 0 || related.some((recordId) => !recordsById.has(recordId)) ||
      relatedIds.size !== related.length
    ) throw new Error(`Public provenance receipt ${id} has no complete accepted public hash scope`);
    const scopedRecords = related.map((recordId) => recordsById.get(recordId)!)
      .sort((left, right) => recordId(left).localeCompare(recordId(right)));
    if (stableRecordHash(scopedRecords) !== receipt.payload_sha256) {
      throw new Error(`Public provenance receipt ${id} does not match its public records`);
    }
    if (records.some((record) => "provenance" in record && record.provenance.source_receipt_id === id && !relatedIds.has(recordId(record)))) {
      throw new Error(`Public provenance receipt ${id} omits a referring record`);
    }
    const serialized = canonicalJson(receipt);
    if ([...SECRET_PATTERNS, ...PRIVATE_PATH_PATTERNS].some(([, pattern]) => pattern.test(serialized))) {
      throw new Error(`Public provenance receipt ${id} contains non-public material`);
    }
    receipts.push(receipt);
  }
  return receipts;
}

function sourceScheme(value: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*:)/i.exec(value);
  return match?.[1]?.toLocaleLowerCase("en-US") ?? null;
}

function containsPrivateLocator(value: string): boolean {
  return PRIVATE_PATH_PATTERNS.some(([, pattern]) => pattern.test(value));
}

function inspectEvidence(
  evidence: Evidence,
  contract: PublicationContract,
  violations: PublicationViolation[],
): void {
  const identity = { scope: "record" as const, record_family: "evidence", record_id: evidence.evidence_id };
  const scheme = sourceScheme(evidence.source.url);
  if (scheme === null || !contract.allowed_source_schemes.some(allowed => allowed === scheme)) {
    addViolation(violations, { ...identity, code: "source_scheme_not_public" });
  }
  if (
    evidence.source.url.trim().length === 0 ||
    evidence.source.locator.trim().length === 0 ||
    evidence.source.title.trim().length === 0 ||
    evidence.source.publisher.trim().length === 0
  ) {
    addViolation(violations, { ...identity, code: "evidence_locator_incomplete" });
  }
  if (containsPrivateLocator(`${evidence.source.url}\n${evidence.source.locator}`)) {
    addViolation(violations, { ...identity, code: "private_locator_material" });
  }
  if (
    evidence.rights.retention_mode === "authorized_excerpt" &&
    evidence.rights.license_status !== "permission_granted" &&
    evidence.rights.license_status !== "compatible_license"
  ) {
    addViolation(violations, { ...identity, code: "authorized_excerpt_without_reuse_rights" });
  }
  if (
    scheme === "https:" &&
    evidence.rights.attribution_required !== true
  ) {
    addViolation(violations, { ...identity, code: "external_source_without_attribution" });
  }
}

function evidenceReferences(store: KnowledgeStore): Array<{
  family: string;
  id: string;
  evidenceIds: string[];
}> {
  return [
    ...store.claims.map((item) => ({ family: "claims", id: item.claim_id, evidenceIds: item.evidence_ids })),
    ...store.patches.map((item) => ({ family: "patches", id: item.patch_id, evidenceIds: item.source_evidence_ids })),
    ...store.strategies.map((item) => ({ family: "strategies", id: item.strategy_id, evidenceIds: item.evidence_ids })),
  ];
}

export function buildPublicationRecordAudit(
  store: KnowledgeStore,
  contract: PublicationContract,
): PublicationRecordAudit {
  const violations: PublicationViolation[] = [];
  const evidenceIds = new Set(store.evidence.map((item) => item.evidence_id));
  for (const evidence of store.evidence) inspectEvidence(evidence, contract, violations);

  for (const reference of evidenceReferences(store)) {
    if (reference.evidenceIds.length === 0) {
      addViolation(violations, {
        scope: "record",
        code: "public_fact_without_evidence",
        record_family: reference.family,
        record_id: reference.id,
      });
    }
    for (const evidenceId of reference.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        addViolation(violations, {
          scope: "record",
          code: "public_fact_references_missing_evidence",
          record_family: reference.family,
          record_id: reference.id,
        });
      }
    }
  }

  const supportedEntities = new Set<string>();
  for (const claim of store.claims) {
    if (claim.evidence_ids.length === 0) continue;
    supportedEntities.add(claim.subject_entity_id);
    if (claim.object.kind === "entity") supportedEntities.add(claim.object.entity_id);
  }
  for (const patch of store.patches) {
    if (patch.source_evidence_ids.length > 0) patch.affected_entity_ids.forEach((id) => supportedEntities.add(id));
  }
  for (const strategy of store.strategies) {
    if (strategy.evidence_ids.length === 0) continue;
    supportedEntities.add(strategy.goal_entity_id);
    for (const node of strategy.nodes) if (node.target_entity_id !== undefined) supportedEntities.add(node.target_entity_id);
  }
  for (const entity of store.entities) {
    if (!supportedEntities.has(entity.entity_id)) {
      addViolation(violations, {
        scope: "record",
        code: "entity_without_public_evidence_path",
        record_family: "entities",
        record_id: entity.entity_id,
      });
    }
  }

  const holds = store.evidence
    .filter((item) => item.rights.retention_mode === "normalized_facts" && item.rights.license_status === "unknown")
    .map((item) => ({
      record_id: item.evidence_id,
      reason_code: "unknown_license_normalized_fact_requires_independent_review" as const,
    }))
    .sort((left, right) => left.record_id.localeCompare(right.record_id));
  let publicReceiptCount = 0;
  try {
    publicReceiptCount = publicProvenanceReceipts(store).length;
  } catch {
    addViolation(violations, { scope: "record", record_family: "receipts", code: "invalid_public_provenance" });
  }
  const publicFamilyCounts = publicRecordCounts(store, publicReceiptCount);
  for (const [family, records] of Object.entries({
    entities: store.entities, claims: store.claims, evidence: store.evidence,
    patches: store.patches, strategies: store.strategies,
  })) {
    for (const record of records) {
      for (const issue of inspectPublicationText(canonicalJson(record), "")) {
        addViolation(violations, { scope: "record", record_family: family, record_id: recordId(record), code: issue.code });
      }
    }
  }
  return {
    inspected_records: Object.values(publicFamilyCounts).reduce((sum, value) => sum + value, 0),
    public_family_counts: publicFamilyCounts,
    record_specific_rights_holds: holds,
    automated_violations: violations.sort((left, right) =>
      `${left.record_family ?? ""}:${left.record_id ?? ""}:${left.code}`.localeCompare(
        `${right.record_family ?? ""}:${right.record_id ?? ""}:${right.code}`,
      )),
  };
}

export function publicKnowledgeProjection(store: KnowledgeStore): KnowledgeStore {
  const families = ["entities", "claims", "evidence", "patches", "strategies", "receipts", "predicateRegistry", "entitySubtypeRegistry"];
  if (Object.keys(store).some(key => !families.includes(key))) {
    throw new Error("Public projection contains an unsupported record family");
  }
  return {
    entities: store.entities,
    claims: store.claims,
    evidence: store.evidence,
    patches: store.patches,
    strategies: store.strategies,
    receipts: publicProvenanceReceipts(store),
    predicateRegistry: store.predicateRegistry,
    entitySubtypeRegistry: store.entitySubtypeRegistry,
  };
}

export async function loadPublicationContract(projectRoot: string): Promise<PublicationContract> {
  const contract = JSON.parse(await readFile(resolve(projectRoot, "quality/publication-contract-v1.json"), "utf8")) as unknown;
  const validate = await compileStandaloneValidator(projectRoot, "pywel.publication_contract.v1");
  if (!validate(contract)) throw new Error(`Invalid publication contract: ${canonicalJson(validate.errors)}`);
  return contract as PublicationContract;
}
