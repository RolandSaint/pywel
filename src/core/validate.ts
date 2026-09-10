import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { stableRecordHash } from "./canonical-json.js";
import { loadDocuments, storeFromDocuments, type LoadedDocument } from "./loader.js";
import type {
  CanonicalRecord,
  Claim,
  KnowledgeStore,
  ValidationIssue,
  ValidationReport,
  Validity,
} from "./types.js";
import { comparePatchVersions } from "./version.js";

const SCHEMA_BY_VERSION: Record<string, string> = {
  "pywel.claim.v1": "https://pywelknowledge.org/schemas/claim.schema.json",
  "pywel.claim_catalog.v1": "https://pywelknowledge.org/schemas/claim-catalog.schema.json",
  "pywel.entity.v1": "https://pywelknowledge.org/schemas/entity.schema.json",
  "pywel.entity_catalog.v1": "https://pywelknowledge.org/schemas/entity-catalog.schema.json",
  "pywel.entity_subtype_registry.v1": "https://pywelknowledge.org/schemas/entity-subtype-registry.schema.json",
  "pywel.evidence.v1": "https://pywelknowledge.org/schemas/evidence.schema.json",
  "pywel.evidence_catalog.v1": "https://pywelknowledge.org/schemas/evidence-catalog.schema.json",
  "pywel.patch.v1": "https://pywelknowledge.org/schemas/patch.schema.json",
  "pywel.patch_catalog.v1": "https://pywelknowledge.org/schemas/patch-catalog.schema.json",
  "pywel.predicate_registry.v1": "https://pywelknowledge.org/schemas/predicate-registry.schema.json",
  "pywel.public_release_scope.v2": "https://pywelknowledge.org/schemas/public-release-scope-v2.schema.json",
  "pywel.publication_contract.v1": "https://pywelknowledge.org/schemas/publication-contract.schema.json",
  "pywel.corpus.v1": "https://pywelknowledge.org/schemas/corpus.schema.json",
  "pywel.build_manifest.v2": "https://pywelknowledge.org/schemas/build-manifest.schema.json",
  "pywel.source_snapshot.v1": "https://pywelknowledge.org/schemas/source-snapshot.schema.json",
  "pywel.receipt.v1": "https://pywelknowledge.org/schemas/receipt.schema.json",
  "pywel.strategy.v1": "https://pywelknowledge.org/schemas/strategy.schema.json",
  "pywel.strategy_catalog.v1": "https://pywelknowledge.org/schemas/strategy-catalog.schema.json"
};

function documentId(value: unknown): string | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of [
    "entity_id",
    "claim_id",
    "evidence_id",
    "patch_id",
    "strategy_id",
    "receipt_id",
    "catalog_id",
  ]) {
    if (typeof record[key] === "string") return record[key];
  }
  return undefined;
}

function schemaVersion(value: unknown): string | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const version = (value as { schema_version?: unknown }).schema_version;
  return typeof version === "string" ? version : undefined;
}

function makeIssue(
  severity: ValidationIssue["severity"],
  code: string,
  message: string,
  context: { path?: string; record_id?: string } = {},
): ValidationIssue {
  return { severity, code, message, ...context };
}

async function compileSchemas(projectRoot: string): Promise<Ajv> {
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  const schemaDirectory = resolve(projectRoot, "schemas");
  for (const directory of [projectRoot, schemaDirectory]) {
    if (!(await lstat(directory)).isDirectory()) throw new Error(`Schema source must be a real directory: ${directory}`);
  }
  const schemaEntries = await readdir(schemaDirectory, { withFileTypes: true });
  if (schemaEntries.some((entry) => !entry.isFile())) throw new Error("Schema sources must be regular files");
  const schemaFiles = schemaEntries.map((entry) => entry.name).filter((name) => name.endsWith(".schema.json")).sort();
  const schemas = await Promise.all(
    schemaFiles.map(async (name) =>
      JSON.parse(await readFile(resolve(schemaDirectory, name), "utf8")),
    ),
  );
  const common = schemas.find(
    (schema) =>
      schema.$id === "https://pywelknowledge.org/schemas/common.schema.json",
  );
  if (common === undefined) throw new Error("common.schema.json is required");
  ajv.addSchema(common);
  for (const schema of schemas) {
    if (schema !== common) ajv.addSchema(schema);
  }
  return ajv;
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
  if (errors === null || errors === undefined) return "unknown schema error";
  return errors
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
    .join("; ");
}

function validateDocuments(
  ajv: Ajv,
  documents: LoadedDocument[],
  projectRoot: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validators = new Map<string, ValidateFunction>();
  for (const document of documents) {
    const path = relative(projectRoot, document.path).replaceAll("\\", "/");
    const version = schemaVersion(document.value);
    const id = documentId(document.value);
    if (version === undefined) {
      issues.push(makeIssue("error", "schema_version_missing", "schema_version is required", { path }));
      continue;
    }
    const schemaId = SCHEMA_BY_VERSION[version];
    if (schemaId === undefined || /^(?:pywel\.(?:public_release_scope|publication_contract|corpus|build_manifest|source_snapshot)\.)/.test(version)) {
      issues.push(
        makeIssue("error", "schema_version_unknown", `Unsupported schema version: ${version}`, {
          path,
          ...(id === undefined ? {} : { record_id: id }),
        }),
      );
      continue;
    }
    let validator = validators.get(schemaId);
    if (validator === undefined) {
      validator = ajv.getSchema(schemaId);
      if (validator === undefined) throw new Error(`Schema was not compiled: ${schemaId}`);
      validators.set(schemaId, validator);
    }
    if (!validator(document.value)) {
      issues.push(
        makeIssue(
          "error",
          "schema_invalid",
          formatAjvErrors(validator.errors),
          { path, ...(id === undefined ? {} : { record_id: id }) },
        ),
      );
    }
  }
  return issues;
}

function recordId(record: CanonicalRecord): string {
  if ("entity_id" in record) return record.entity_id;
  if ("claim_id" in record) return record.claim_id;
  if ("evidence_id" in record) return record.evidence_id;
  if ("patch_id" in record) return record.patch_id;
  if ("strategy_id" in record) return record.strategy_id;
  return record.receipt_id;
}

function allRecords(store: KnowledgeStore): CanonicalRecord[] {
  return [
    ...store.entities,
    ...store.claims,
    ...store.evidence,
    ...store.patches,
    ...store.strategies,
    ...store.receipts,
  ];
}

function referenceIssue(
  issues: ValidationIssue[],
  sourceId: string,
  targetId: string,
  known: ReadonlySet<string>,
  relation: string,
): void {
  if (!known.has(targetId)) {
    issues.push(
      makeIssue(
        "error",
        "reference_missing",
        `${relation} references missing record ${targetId}`,
        { record_id: sourceId },
      ),
    );
  }
}

function validateValidity(
  validity: Validity,
  recordIdValue: string,
  knownPatches: ReadonlySet<string>,
  issues: ValidationIssue[],
): void {
  for (const patch of [
    validity.from_patch,
    validity.through_patch,
    validity.reviewed_through_patch,
  ]) {
    if (patch !== null && !knownPatches.has(patch)) {
      issues.push(
        makeIssue(
          "error",
          "patch_reference_missing",
          `Validity references unknown patch ${patch}`,
          { record_id: recordIdValue },
        ),
      );
    }
  }
  if (
    validity.from_patch !== null &&
    validity.through_patch !== null &&
    comparePatchVersions(validity.from_patch, validity.through_patch) > 0
  ) {
    issues.push(
      makeIssue("error", "patch_range_inverted", "from_patch is newer than through_patch", {
        record_id: recordIdValue,
      }),
    );
  }
  if (
    validity.from_patch !== null &&
    validity.reviewed_through_patch !== null &&
    comparePatchVersions(validity.from_patch, validity.reviewed_through_patch) > 0
  ) {
    issues.push(
      makeIssue(
        "error",
        "patch_review_range_inverted",
        "reviewed_through_patch is older than from_patch",
        { record_id: recordIdValue },
      ),
    );
  }
  if (validity.platforms.includes("all") && validity.platforms.length !== 1) {
    issues.push(
      makeIssue("error", "platform_all_mixed", "Platform 'all' cannot be mixed with explicit platforms", {
        record_id: recordIdValue,
      }),
    );
  }
}

function scalarKindMatches(claim: Claim): boolean {
  const object = claim.object;
  if (object.kind === "string") return typeof object.value === "string";
  if (object.kind === "number") return typeof object.value === "number";
  if (object.kind === "boolean") return typeof object.value === "boolean";
  return true;
}

function reachableStrategyNodes(
  entryNodeId: string,
  transitions: ReadonlyMap<string, Array<string | null>>,
): Set<string> {
  const reached = new Set<string>();
  const pending = [entryNodeId];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || reached.has(current)) continue;
    reached.add(current);
    for (const next of transitions.get(current) ?? []) {
      if (next !== null && !reached.has(next)) pending.push(next);
    }
  }
  return reached;
}

export function validateIntegrity(store: KnowledgeStore): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const records = allRecords(store);
  const recordsById = new Map<string, CanonicalRecord>();
  for (const record of records) {
    const id = recordId(record);
    if (recordsById.has(id)) {
      issues.push(makeIssue("error", "record_id_duplicate", `Duplicate record ID ${id}`, { record_id: id }));
    } else {
      recordsById.set(id, record);
    }
  }

  const entityIds = new Set(store.entities.map((entity) => entity.entity_id));
  const entityById = new Map(store.entities.map((entity) => [entity.entity_id, entity]));
  const evidenceIds = new Set(store.evidence.map((evidence) => evidence.evidence_id));
  const evidenceById = new Map(store.evidence.map((evidence) => [evidence.evidence_id, evidence]));
  const claimIds = new Set(store.claims.map((claim) => claim.claim_id));
  const receiptIds = new Set(store.receipts.map((receipt) => receipt.receipt_id));
  const receiptById = new Map(store.receipts.map((receipt) => [receipt.receipt_id, receipt]));
  const patchVersions = new Set(store.patches.map((patch) => patch.version));
  const allIds = new Set(recordsById.keys());

  const seenEntitySlugs = new Set<string>();
  const subtypeDefinitions = new Map(
    store.entitySubtypeRegistry.subtypes.map((definition) => [definition.subtype, definition]),
  );
  if (subtypeDefinitions.size !== store.entitySubtypeRegistry.subtypes.length) {
    issues.push(makeIssue("error", "entity_subtype_duplicate", "Entity subtype registry contains duplicates"));
  }
  for (const entity of store.entities) {
    if (seenEntitySlugs.has(entity.slug)) {
      issues.push(
        makeIssue("error", "entity_slug_duplicate", `Duplicate entity slug ${entity.slug}`, {
          record_id: entity.entity_id,
        }),
      );
    }
    seenEntitySlugs.add(entity.slug);
    if (entity.subtype !== undefined) {
      const definition = subtypeDefinitions.get(entity.subtype);
      if (definition === undefined || definition.status === "retired") {
        issues.push(
          makeIssue("error", "entity_subtype_not_active", `Subtype ${entity.subtype} is not registered as active`, {
            record_id: entity.entity_id,
          }),
        );
      } else if (!definition.entity_types.includes(entity.entity_type)) {
        issues.push(
          makeIssue(
            "error",
            "entity_subtype_type_mismatch",
            `Subtype ${entity.subtype} does not apply to entity type ${entity.entity_type}`,
            { record_id: entity.entity_id },
          ),
        );
      }
    }
    if (entity.redirect_entity_id === undefined && entity.tags.includes("canonical-redirect")) {
      issues.push(
        makeIssue("error", "entity_redirect_tag_without_target", "Redirect tag requires redirect_entity_id", {
          record_id: entity.entity_id,
        }),
      );
    }
  }

  for (const entity of store.entities.filter((record) => record.redirect_entity_id !== undefined)) {
    const targetId = entity.redirect_entity_id!;
    const target = entityById.get(targetId);
    if (target === undefined) {
      issues.push(
        makeIssue("error", "entity_redirect_target_missing", `Redirect target ${targetId} does not resolve`, {
          record_id: entity.entity_id,
        }),
      );
      continue;
    }
    if (targetId === entity.entity_id) {
      issues.push(
        makeIssue("error", "entity_redirect_self", "Entity redirect cannot target itself", {
          record_id: entity.entity_id,
        }),
      );
    }
    if (target.redirect_entity_id !== undefined) {
      issues.push(
        makeIssue("error", "entity_redirect_chain", "Entity redirects must point directly to an active canonical entity", {
          record_id: entity.entity_id,
        }),
      );
    }
    if (target.entity_type !== entity.entity_type) {
      issues.push(
        makeIssue("error", "entity_redirect_type_mismatch", "Entity redirect target must have the same entity type", {
          record_id: entity.entity_id,
        }),
      );
    }
    if (!entity.tags.includes("canonical-redirect")) {
      issues.push(
        makeIssue("error", "entity_redirect_tag_missing", "Entity redirects must be tagged canonical-redirect", {
          record_id: entity.entity_id,
        }),
      );
    }
    const redirectName = `${entity.canonical_name.locale}:${entity.canonical_name.text.toLocaleLowerCase("en-US")}`;
    const targetAliases = new Set(
      target.aliases.map((alias) => `${alias.locale}:${alias.text.toLocaleLowerCase("en-US")}`),
    );
    if (!targetAliases.has(redirectName)) {
      issues.push(
        makeIssue("error", "entity_redirect_alias_missing", "Canonical target must retain the redirect label as an alias", {
          record_id: entity.entity_id,
        }),
      );
    }
    const equivalenceClaim = store.claims.find(
      (claim) =>
        claim.subject_entity_id === entity.entity_id &&
        claim.predicate === "relation.same_as" &&
        claim.object.kind === "entity" &&
        claim.object.entity_id === targetId &&
        !["disputed", "stale", "retracted"].includes(claim.status) &&
        claim.behavior_kind === "historical" &&
        claim.validity.from_patch === null &&
        claim.validity.through_patch === null &&
        claim.validity.reviewed_through_patch === null &&
        claim.evidence_ids.length > 0,
    );
    if (equivalenceClaim === undefined) {
      issues.push(
        makeIssue("error", "entity_redirect_claim_missing", "Entity redirect requires an evidence-linked relation.same_as claim", {
          record_id: entity.entity_id,
        }),
      );
    }
    const permittedRedirectPredicates = new Set([
      "catalog.community_indexed_category",
      "catalog.community_indexed_type",
      "catalog.source_indexed_type",
      "relation.same_as",
    ]);
    for (const claim of store.claims.filter(
      (candidate) =>
        candidate.subject_entity_id === entity.entity_id &&
        !permittedRedirectPredicates.has(candidate.predicate),
    )) {
      issues.push(
        makeIssue("error", "entity_redirect_gameplay_claim", "Gameplay and domain claims must attach to the active canonical target", {
          record_id: claim.claim_id,
        }),
      );
    }
  }

  const redirectIds = new Set(
    store.entities
      .filter((entity) => entity.redirect_entity_id !== undefined)
      .map((entity) => entity.entity_id),
  );
  for (const claim of store.claims.filter(
    (candidate) => candidate.object.kind === "entity" && redirectIds.has(candidate.object.entity_id),
  )) {
    issues.push(
      makeIssue("error", "entity_redirect_relationship_target", "Entity relationships must target an active canonical entity", {
        record_id: claim.claim_id,
      }),
    );
  }
  for (const strategy of store.strategies) {
    const referencesRedirect =
      redirectIds.has(strategy.goal_entity_id) ||
      strategy.prerequisites.some(
        (prerequisite) =>
          prerequisite.subject_entity_id !== undefined && redirectIds.has(prerequisite.subject_entity_id),
      ) ||
      strategy.nodes.some(
        (node) => node.target_entity_id !== undefined && redirectIds.has(node.target_entity_id),
      );
    if (referencesRedirect) {
      issues.push(
        makeIssue("error", "entity_redirect_strategy_target", "Strategies must reference active canonical entities", {
          record_id: strategy.strategy_id,
        }),
      );
    }
  }

  const seenPatchVersions = new Set<string>();
  for (const patch of store.patches) {
    if (seenPatchVersions.has(patch.version)) {
      issues.push(
        makeIssue("error", "patch_version_duplicate", `Duplicate patch version ${patch.version}`, {
          record_id: patch.patch_id,
        }),
      );
    }
    seenPatchVersions.add(patch.version);
    if (
      patch.content_coverage.level === "identity_only" &&
      (patch.content_coverage.normalized_claim_count !== 0 || patch.affected_entity_ids.length !== 0)
    ) {
      issues.push(
        makeIssue(
          "error",
          "identity_only_patch_has_normalized_content",
          "Identity-only patch records cannot claim normalized claims or affected entities",
          { record_id: patch.patch_id },
        ),
      );
    }
    for (const evidenceId of patch.source_evidence_ids) {
      referenceIssue(issues, patch.patch_id, evidenceId, evidenceIds, "Patch source");
      const evidence = evidenceById.get(evidenceId);
      if (
        evidence !== undefined &&
        (evidence.evidence_type !== "official_patch" ||
          evidence.reliability.tier !== "primary_official")
      ) {
        issues.push(
          makeIssue(
            "error",
            "patch_source_not_primary_official",
            "Canonical patch sources must be primary official patch evidence",
            { record_id: patch.patch_id },
          ),
        );
      }
      if (
        evidence?.source.published_at !== undefined &&
        evidence.source.published_at !== null &&
        evidence.source.published_at !== patch.released_at
      ) {
        issues.push(
          makeIssue(
            "error",
            "patch_release_time_mismatch",
            `Patch release time differs from evidence ${evidenceId}`,
            { record_id: patch.patch_id },
          ),
        );
      }
    }
    for (const entityId of patch.affected_entity_ids) {
      referenceIssue(issues, patch.patch_id, entityId, entityIds, "Patch affected entity");
    }
    const normalizedClaimCount = store.claims.filter(
      (claim) =>
        claim.status === "official" &&
        claim.validity.from_patch === patch.version &&
        claim.evidence_ids.some((evidenceId) => patch.source_evidence_ids.includes(evidenceId)),
    ).length;
    // Historical counters may cover a subset; never infer freshness or completeness from them.
    if (patch.content_coverage.normalized_claim_count > normalizedClaimCount) {
      issues.push(
        makeIssue(
          "error",
          "patch_normalized_claim_count_mismatch",
          `Patch declares more normalized claims (${patch.content_coverage.normalized_claim_count}) than retained source-linked official claims (${normalizedClaimCount})`,
          { record_id: patch.patch_id },
        ),
      );
    }
  }

  const predicateDefinitions = new Map(
    store.predicateRegistry.predicates.map((definition) => [definition.predicate, definition]),
  );
  if (predicateDefinitions.size !== store.predicateRegistry.predicates.length) {
    issues.push(makeIssue("error", "predicate_duplicate", "Predicate registry contains duplicates"));
  }

  for (const claim of store.claims) {
    referenceIssue(issues, claim.claim_id, claim.subject_entity_id, entityIds, "Claim subject");
    if (claim.object.kind === "entity") {
      referenceIssue(issues, claim.claim_id, claim.object.entity_id, entityIds, "Claim object");
    }
    for (const evidenceId of claim.evidence_ids) {
      referenceIssue(issues, claim.claim_id, evidenceId, evidenceIds, "Claim evidence");
    }
    for (const supersededId of claim.supersedes_claim_ids ?? []) {
      referenceIssue(issues, claim.claim_id, supersededId, claimIds, "Superseded claim");
      if (supersededId === claim.claim_id) {
        issues.push(
          makeIssue("error", "claim_self_supersedes", "Claim cannot supersede itself", {
            record_id: claim.claim_id,
          }),
        );
      }
    }
    const predicate = predicateDefinitions.get(claim.predicate);
    if (predicate === undefined || predicate.status === "retired") {
      issues.push(
        makeIssue(
          "error",
          "predicate_not_active",
          `Predicate ${claim.predicate} is not registered as core or provisional`,
          { record_id: claim.claim_id },
        ),
      );
    } else if (!predicate.object_kinds.includes(claim.object.kind)) {
      issues.push(
        makeIssue(
          "error",
          "predicate_object_kind_invalid",
          `Predicate ${claim.predicate} does not allow object kind ${claim.object.kind}`,
          { record_id: claim.claim_id },
        ),
      );
    }
    if (!scalarKindMatches(claim)) {
      issues.push(
        makeIssue("error", "claim_scalar_kind_mismatch", "Claim object kind does not match its value type", {
          record_id: claim.claim_id,
        }),
      );
    }
    if (claim.object.kind === "range" && claim.object.minimum > claim.object.maximum) {
      issues.push(
        makeIssue("error", "claim_range_inverted", "Claim range minimum exceeds maximum", {
          record_id: claim.claim_id,
        }),
      );
    }
    validateValidity(claim.validity, claim.claim_id, patchVersions, issues);
    if (claim.status === "official" && claim.behavior_kind !== "intended") {
      issues.push(
        makeIssue(
          "warning",
          "official_behavior_not_intended",
          "Official claim is not labeled as intended behavior",
          { record_id: claim.claim_id },
        ),
      );
    }
    if (claim.status === "official") {
      const hasOfficialEvidence = claim.evidence_ids.some(
        (id) => store.evidence.find((evidence) => evidence.evidence_id === id)?.reliability.tier === "primary_official",
      );
      if (!hasOfficialEvidence) {
        issues.push(
          makeIssue("error", "official_claim_without_primary_source", "Official claim requires primary official evidence", {
            record_id: claim.claim_id,
          }),
        );
      }
    }
  }

  for (const evidence of store.evidence) {
    if (
      evidence.rights.retention_mode === "authorized_excerpt" &&
      !["permission_granted", "compatible_license"].includes(evidence.rights.license_status)
    ) {
      issues.push(
        makeIssue(
          "error",
          "excerpt_without_rights",
          "Authorized excerpts require permission or a compatible license",
          { record_id: evidence.evidence_id },
        ),
      );
    }
  }

  for (const strategy of store.strategies) {
    referenceIssue(issues, strategy.strategy_id, strategy.goal_entity_id, entityIds, "Strategy goal");
    for (const evidenceId of strategy.evidence_ids) {
      referenceIssue(issues, strategy.strategy_id, evidenceId, evidenceIds, "Strategy evidence");
    }
    validateValidity(strategy.validity, strategy.strategy_id, patchVersions, issues);
    const nodes = new Set<string>();
    const transitions = new Map<string, Array<string | null>>();
    for (const node of strategy.nodes) {
      if (nodes.has(node.node_id)) {
        issues.push(
          makeIssue("error", "strategy_node_duplicate", `Duplicate node ${node.node_id}`, {
            record_id: strategy.strategy_id,
          }),
        );
      }
      nodes.add(node.node_id);
      transitions.set(node.node_id, node.transitions.map((transition) => transition.next_node_id));
      if (node.target_entity_id !== undefined) {
        referenceIssue(issues, strategy.strategy_id, node.target_entity_id, entityIds, "Strategy target");
      }
    }
    if (!nodes.has(strategy.entry_node_id)) {
      issues.push(
        makeIssue("error", "strategy_entry_missing", `Entry node ${strategy.entry_node_id} is missing`, {
          record_id: strategy.strategy_id,
        }),
      );
    }
    for (const [nodeId, targets] of transitions) {
      for (const target of targets) {
        if (target !== null && !nodes.has(target)) {
          issues.push(
            makeIssue("error", "strategy_transition_missing", `${nodeId} targets missing node ${target}`, {
              record_id: strategy.strategy_id,
            }),
          );
        }
      }
    }
    const reached = reachableStrategyNodes(strategy.entry_node_id, transitions);
    for (const node of nodes) {
      if (!reached.has(node)) {
        issues.push(
          makeIssue("error", "strategy_node_unreachable", `Node ${node} is unreachable`, {
            record_id: strategy.strategy_id,
          }),
        );
      }
    }
    for (const prerequisite of strategy.prerequisites) {
      if (prerequisite.subject_entity_id !== undefined) {
        referenceIssue(
          issues,
          strategy.strategy_id,
          prerequisite.subject_entity_id,
          entityIds,
          "Strategy prerequisite subject",
        );
      }
      const definition = predicateDefinitions.get(prerequisite.predicate);
      if (definition === undefined || definition.status === "retired") {
        issues.push(
          makeIssue("error", "strategy_predicate_not_active", `Unregistered predicate ${prerequisite.predicate}`, {
            record_id: strategy.strategy_id,
          }),
        );
      }
    }
    if (strategy.verification.successful_attempts > strategy.verification.attempts) {
      issues.push(
        makeIssue("error", "strategy_success_count_invalid", "Successful attempts exceed attempts", {
          record_id: strategy.strategy_id,
        }),
      );
    }
    if (strategy.status === "verified" && strategy.verification.successful_attempts === 0) {
      issues.push(
        makeIssue("error", "strategy_verified_without_success", "Verified strategy has no successful attempts", {
          record_id: strategy.strategy_id,
        }),
      );
    }
    if (strategy.status === "source_supported" && strategy.verification.attempts === 0) {
      issues.push(
        makeIssue(
          "warning",
          "strategy_unobserved",
          "Strategy is source-supported but has not been tested through an observation",
          { record_id: strategy.strategy_id },
        ),
      );
    }
  }

  for (const record of records) {
    if ("provenance" in record && record.provenance.source_receipt_id !== undefined) {
      const id = recordId(record);
      const sourceReceiptId = record.provenance.source_receipt_id;
      referenceIssue(
        issues,
        id,
        sourceReceiptId,
        receiptIds,
        "Provenance receipt",
      );
      const sourceReceipt = receiptById.get(sourceReceiptId);
      if (
        sourceReceipt?.payload_hash_scope === "related_records_canonical_json" &&
        !(sourceReceipt.related_record_ids ?? []).includes(id)
      ) {
        issues.push(
          makeIssue(
            "error",
            "provenance_record_not_receipted",
            `Record cites receipt ${sourceReceiptId} but is absent from its canonical hash scope`,
            { record_id: id },
          ),
        );
      }
    }
  }

  for (const receipt of store.receipts) {
    const related = receipt.related_record_ids ?? [];
    for (const relatedId of related) {
      referenceIssue(issues, receipt.receipt_id, relatedId, allIds, "Receipt related record");
    }
    if (
      receipt.payload_hash_scope === "related_records_canonical_json" &&
      receipt.state !== "superseded" &&
      receipt.state !== "retracted"
    ) {
      const relatedRecords = related
        .map((id) => recordsById.get(id))
        .filter((record): record is CanonicalRecord => record !== undefined)
        .sort((left, right) => recordId(left).localeCompare(recordId(right)));
      const expected = stableRecordHash(relatedRecords);
      if (expected !== receipt.payload_sha256) {
        issues.push(
          makeIssue(
            "error",
            "receipt_payload_hash_mismatch",
            `Receipt payload hash does not match canonical related records; expected ${expected}`,
            { record_id: receipt.receipt_id },
          ),
        );
      }
    } else if (receipt.payload_hash_scope === "external_payload") {
      issues.push(
        makeIssue(
          "warning",
          "receipt_external_payload_not_recomputed",
          "External payload hash cannot be recomputed from the public corpus",
          { record_id: receipt.receipt_id },
        ),
      );
    }
  }


  return issues;
}

export async function validateCorpus(projectRoot: string): Promise<{
  store?: KnowledgeStore;
  report: ValidationReport;
}> {
  const documents = await loadDocuments(projectRoot);
  const ajv = await compileSchemas(projectRoot);
  const schemaIssues = validateDocuments(ajv, documents, projectRoot);
  let store: KnowledgeStore | undefined;
  let integrityIssues: ValidationIssue[] = [];
  if (!schemaIssues.some((issue) => issue.severity === "error")) {
    store = storeFromDocuments(documents);
    integrityIssues = validateIntegrity(store);
  }
  const issues = [...schemaIssues, ...integrityIssues];
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const counts: Record<string, number> = {};
  for (const document of documents) {
    const version = schemaVersion(document.value) ?? "unknown";
    counts[version] = (counts[version] ?? 0) + 1;
    if (
      document.value !== null &&
      typeof document.value === "object" &&
      Array.isArray((document.value as { records?: unknown }).records)
    ) {
      for (const record of (document.value as { records: unknown[] }).records) {
        const recordVersion = schemaVersion(record) ?? "unknown_catalog_record";
        counts[recordVersion] = (counts[recordVersion] ?? 0) + 1;
      }
    }
  }
  const report: ValidationReport = {
    valid: errors.length === 0,
    checked_at: new Date().toISOString(),
    counts,
    errors,
    warnings,
  };
  return store === undefined ? { report } : { store, report };
}

export async function compileStandaloneValidator(
  projectRoot: string,
  schemaVersionValue: string,
): Promise<ValidateFunction> {
  const schemaId = SCHEMA_BY_VERSION[schemaVersionValue];
  if (schemaId === undefined) throw new Error(`Unsupported schema version ${schemaVersionValue}`);
  const ajv = await compileSchemas(projectRoot);
  const validator = ajv.getSchema(schemaId);
  if (validator === undefined) throw new Error(`Schema not compiled: ${schemaId}`);
  return validator;
}
