import { lstat, readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  CanonicalRecord,
  Claim,
  Entity,
  Evidence,
  EntitySubtypeRegistry,
  KnowledgeStore,
  PatchRecord,
  PredicateRegistry,
  Receipt,
  Strategy,
} from "./types.js";

export interface LoadedDocument {
  path: string;
  value: unknown;
}

async function jsonFiles(directory: string): Promise<string[]> {
  if (!(await lstat(directory)).isDirectory()) throw new Error(`Canonical source must be a real directory: ${directory}`);
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Canonical source contains a symlink: ${path}`);
    if (entry.isDirectory()) paths.push(...await jsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) paths.push(path);
    else if (!entry.isFile()) throw new Error(`Canonical source is not a regular file: ${path}`);
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

async function readJson(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
}

export async function loadDocuments(projectRoot: string): Promise<LoadedDocument[]> {
  for (const directory of [projectRoot, resolve(projectRoot, "data")]) {
    if (!(await lstat(directory)).isDirectory()) throw new Error(`Canonical source must be a real directory: ${directory}`);
  }
  const paths = [
    ...await jsonFiles(resolve(projectRoot, "data", "canonical")),
    ...await jsonFiles(resolve(projectRoot, "data", "vocabulary")),
  ];
  return Promise.all(paths.map(async (path) => ({ path, value: await readJson(path) })));
}

function bySchema<T extends CanonicalRecord>(
  documents: LoadedDocument[],
  schemaVersion: T["schema_version"],
  catalogSchemaVersion?: string,
): T[] {
  const direct = documents
    .map(({ value }) => value)
    .filter(
      (value): value is T =>
        value !== null &&
        typeof value === "object" &&
        (value as { schema_version?: unknown }).schema_version === schemaVersion,
    );
  if (catalogSchemaVersion === undefined) return direct;
  const catalogRecords = documents.flatMap(({ value }) => {
    if (
      value === null ||
      typeof value !== "object" ||
      (value as { schema_version?: unknown }).schema_version !== catalogSchemaVersion ||
      !Array.isArray((value as { records?: unknown }).records)
    ) {
      return [];
    }
    return (value as { records: unknown[] }).records.filter(
      (record): record is T =>
        record !== null &&
        typeof record === "object" &&
        (record as { schema_version?: unknown }).schema_version === schemaVersion,
    );
  });
  return [...direct, ...catalogRecords];
}

export function storeFromDocuments(documents: LoadedDocument[]): KnowledgeStore {
  const registries = documents
    .map(({ value }) => value)
    .filter(
      (value): value is PredicateRegistry =>
        value !== null &&
        typeof value === "object" &&
        (value as { schema_version?: unknown }).schema_version ===
          "pywel.predicate_registry.v1",
    );
  if (registries.length !== 1) {
    throw new Error(`Expected exactly one predicate registry, found ${registries.length}`);
  }
  const predicateRegistry = registries[0];
  if (predicateRegistry === undefined) throw new Error("Predicate registry is missing");
  const subtypeRegistries = documents
    .map(({ value }) => value)
    .filter(
      (value): value is EntitySubtypeRegistry =>
        value !== null &&
        typeof value === "object" &&
        (value as { schema_version?: unknown }).schema_version ===
          "pywel.entity_subtype_registry.v1",
    );
  if (subtypeRegistries.length !== 1) {
    throw new Error(`Expected exactly one entity subtype registry, found ${subtypeRegistries.length}`);
  }
  const entitySubtypeRegistry = subtypeRegistries[0];
  if (entitySubtypeRegistry === undefined) throw new Error("Entity subtype registry is missing");
  return {
    entities: bySchema<Entity>(
      documents,
      "pywel.entity.v1",
      "pywel.entity_catalog.v1",
    ).sort((a, b) =>
      a.entity_id.localeCompare(b.entity_id),
    ),
    claims: bySchema<Claim>(
      documents,
      "pywel.claim.v1",
      "pywel.claim_catalog.v1",
    ).sort((a, b) =>
      a.claim_id.localeCompare(b.claim_id),
    ),
    evidence: bySchema<Evidence>(
      documents,
      "pywel.evidence.v1",
      "pywel.evidence_catalog.v1",
    ).sort((a, b) =>
      a.evidence_id.localeCompare(b.evidence_id),
    ),
    patches: bySchema<PatchRecord>(
      documents,
      "pywel.patch.v1",
      "pywel.patch_catalog.v1",
    ).sort((a, b) =>
      a.patch_id.localeCompare(b.patch_id),
    ),
    strategies: bySchema<Strategy>(
      documents,
      "pywel.strategy.v1",
      "pywel.strategy_catalog.v1",
    ).sort((a, b) => a.strategy_id.localeCompare(b.strategy_id)),
    receipts: bySchema<Receipt>(documents, "pywel.receipt.v1").sort((a, b) =>
      a.receipt_id.localeCompare(b.receipt_id),
    ),
    predicateRegistry,
    entitySubtypeRegistry,
  };
}

export async function loadKnowledgeStore(projectRoot: string): Promise<KnowledgeStore> {
  return storeFromDocuments(await loadDocuments(projectRoot));
}
