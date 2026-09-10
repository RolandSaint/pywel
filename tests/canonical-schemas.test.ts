import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { ValidateFunction } from "ajv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadKnowledgeStore } from "../src/core/loader.js";
import { findProjectRoot } from "../src/core/paths.js";
import type { KnowledgeStore } from "../src/core/types.js";
import { compileStandaloneValidator } from "../src/core/validate.js";

const families = [
  { name: "entity", collection: "entities", id: "entity_id", invalid: { entity_type: "inventory" } },
  { name: "claim", collection: "claims", id: "claim_id", invalid: { confidence: "certain" } },
  { name: "evidence", collection: "evidence", id: "evidence_id", invalid: { captured_at: "recently" } },
  { name: "patch", collection: "patches", id: "patch_id", invalid: { version: "latest" } },
  { name: "strategy", collection: "strategies", id: "strategy_id", invalid: { entry_node_id: 1 } },
  { name: "receipt", collection: "receipts", id: "receipt_id", invalid: { payload_sha256: "trusted" } },
] as const;
const catalogs = families.filter(({ name }) => name !== "receipt");
const vocabulary = [
  { name: "predicate_registry", filename: "predicate-registry", collection: "predicateRegistry" },
  { name: "entity_subtype_registry", filename: "entity-subtype-registry", collection: "entitySubtypeRegistry" },
] as const;

describe("standalone canonical schemas with only shipped schema files", () => {
  let store: KnowledgeStore;
  let schemaRoot: string;
  const validators = new Map<string, ValidateFunction>();

  beforeAll(async () => {
    const root = findProjectRoot();
    store = await loadKnowledgeStore(root);
    schemaRoot = await mkdtemp(resolve(tmpdir(), "pywel-offline-canonical-schemas-"));
    await mkdir(resolve(schemaRoot, "schemas"));
    const filenames = [
      "common",
      ...families.map(({ name }) => name),
      ...catalogs.map(({ name }) => `${name}-catalog`),
      ...vocabulary.map(({ filename }) => filename),
    ];
    // No source checkout, corpus, server, or hosted schema endpoint is needed.
    await Promise.all(filenames.map((name) => cp(
      resolve(root, "schemas", `${name}.schema.json`),
      resolve(schemaRoot, "schemas", `${name}.schema.json`),
    )));
    for (const name of [
      ...families.map(({ name }) => name),
      ...catalogs.map(({ name }) => `${name}_catalog`),
      ...vocabulary.map(({ name }) => name),
    ]) {
      validators.set(name, await compileStandaloneValidator(schemaRoot, `pywel.${name}.v1`));
    }
  });

  afterAll(async () => {
    if (schemaRoot !== undefined) await rm(schemaRoot, { recursive: true, force: true });
  });

  it.each(families)("accepts a retained $name and rejects missing identity, changed version, and invalid values", ({ name, collection, id, invalid }) => {
    const validate = validators.get(name)!;
    const record = structuredClone(store[collection][0]) as unknown as Record<string, unknown>;
    expect(validate(record), JSON.stringify(validate.errors)).toBe(true);
    const missingId = { ...record };
    delete missingId[id];
    expect(validate(missingId)).toBe(false);
    expect(validate({ ...record, schema_version: `pywel.${name}.v99` })).toBe(false);
    expect(validate({ ...record, ...invalid })).toBe(false);
    expect(validate({ ...record, unrecognized_contract_field: true })).toBe(false);
  });

  it.each(catalogs)("resolves $name catalog records locally and rejects wrong-family or malformed records", ({ name, collection, id }) => {
    const validate = validators.get(`${name}_catalog`)!;
    const record = store[collection][0]!;
    const catalog = {
      schema_version: `pywel.${name}_catalog.v1`,
      catalog_id: "cat_contractexample000001",
      records: [record],
    };
    expect(validate(catalog), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...catalog, records: [] })).toBe(false);
    expect(validate({ ...catalog, records: [store.receipts[0]] })).toBe(false);
    expect(validate({ ...catalog, records: [{ ...record, [id]: 1 }] })).toBe(false);
  });

  it("enforces predicate vocabulary versions, kinds, and cardinality", () => {
    const validate = validators.get("predicate_registry")!;
    const registry = store.predicateRegistry;
    expect(validate(registry), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...registry, registry_version: "13" })).toBe(false);
    expect(validate({ ...registry, predicates: [{ ...registry.predicates[0], object_kinds: ["array"] }] })).toBe(false);
    expect(validate({ ...registry, predicates: [{ ...registry.predicates[0], cardinality: "sometimes" }] })).toBe(false);
  });

  it("enforces subtype vocabulary versions, entity types, and active-status labels", () => {
    const validate = validators.get("entity_subtype_registry")!;
    const registry = store.entitySubtypeRegistry;
    expect(validate(registry), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...registry, registry_version: 0 })).toBe(false);
    expect(validate({ ...registry, subtypes: [{ ...registry.subtypes[0], entity_types: ["inventory"] }] })).toBe(false);
    expect(validate({ ...registry, subtypes: [{ ...registry.subtypes[0], status: "approved" }] })).toBe(false);
  });

  it.each([
    { kind: "string", valid: "example", invalid: [1, true] },
    { kind: "number", valid: 1, invalid: ["1", true] },
    { kind: "boolean", valid: true, invalid: ["true", 1] },
  ])("binds $kind claim objects to the matching JSON scalar type", ({ kind, valid, invalid }) => {
    const validate = validators.get("claim")!;
    const claim = store.claims[0]!;
    expect(validate({ ...claim, object: { kind, value: valid } }), JSON.stringify(validate.errors)).toBe(true);
    for (const value of invalid) expect(validate({ ...claim, object: { kind, value } })).toBe(false);
    expect(validate({ ...claim, object: { kind, value: null } })).toBe(false);
  });

  it("retains explicit epistemic states without admitting a known unknown or scalar value", () => {
    const validate = validators.get("claim")!;
    const claim = store.claims[0]!;
    for (const state of ["unknown", "unmeasured", "not_applicable", "conflicting", "redacted", "source_unavailable"]) {
      expect(validate({ ...claim, object: { kind: "unknown", state } }), state).toBe(true);
    }
    expect(validate({ ...claim, object: { kind: "unknown", state: "known" } })).toBe(false);
    expect(validate({ ...claim, object: { kind: "unknown", state: "unknown", value: 0 } })).toBe(false);
  });

  it("limits public receipt references to the six retained record families", () => {
    const validate = validators.get("receipt")!;
    const receipt = store.receipts[0]!;
    for (const prefix of ["ent", "clm", "evd", "pat", "str", "rcp"]) {
      expect(validate({ ...receipt, related_record_ids: [`${prefix}_contractexample000001`] }), prefix).toBe(true);
    }
    for (const prefix of ["chg", "prv", "evt", "pol"]) {
      expect(validate({ ...receipt, related_record_ids: [`${prefix}_contractexample000001`] }), prefix).toBe(false);
    }
  });
});
