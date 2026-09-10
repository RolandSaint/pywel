import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { requestSchema, responseSchema } from "../src/api/contract.js";
import { TEST_BUILD_ID, validStore } from "./helpers.js";

function validator(operation: string | string[]) {
  const ajv = new Ajv({ strict: true, allErrors: true, allowUnionTypes: true });
  addFormats(ajv);
  return ajv.compile(responseSchema(operation));
}

function walk(value: unknown, check: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) { for (const child of value) walk(child, check); return; }
  if (value === null || typeof value !== "object") return;
  check(value as Record<string, unknown>);
  for (const child of Object.values(value)) walk(child, check);
}

describe("frozen agent contract", () => {
  it("validates every REST operation and both answer formats against the shipped schema", async () => {
    const { root, store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    const strategy = store.strategies[0]!;
    const entity = store.entities.find((item) => item.redirect_entity_id === undefined)!;
    const evidence = store.evidence[0]!;
    const cases: Record<string, string> = {
      getHealth: "/health", getServiceDescriptor: "/v1", getCompactCodebook: "/v1/codebook",
      searchKnowledge: "/v1/search?q=controller&patch=1.09.00",
      listEntities: "/v1/entities?limit=100", getEntityBundle: `/v1/entities/${entity.entity_id}`,
      getEntityRelationships: `/v1/entities/${entity.entity_id}/relationships?depth=3&spoiler=ending`,
      listClaims: "/v1/claims?patch=1.09.00&spoiler=ending&limit=200",
      answerQuestion: "/v1/answer?q=Can%20controller%20inputs%20be%20remapped%3F&patch=1.09.00",
      listStrategies: "/v1/strategies?spoiler=ending", getStrategy: `/v1/strategies/${strategy.strategy_id}?spoiler=ending`,
      listPatches: "/v1/patches", getLatestPatch: "/v1/patches/latest", getPatchBundle: "/v1/patches/1.09.00",
      listEvidence: "/v1/evidence?limit=200", getEvidence: `/v1/evidence/${evidence.evidence_id}`,
    };
    const openapi = JSON.parse(await readFile(resolve(root, "openapi/openapi.json"), "utf8"));
    const operations = Object.values(openapi.paths).map((path) => (path as { get: { operationId: string } }).get.operationId);
    expect(operations.sort()).toEqual(Object.keys(cases).sort());
    for (const [operation, path] of Object.entries(cases)) {
      const response = await app.request(path);
      expect(response.status, `${operation} ${path}`).toBe(200);
      const body = await response.json();
      const validate = validator(operation);
      expect(validate(body), `${operation}: ${JSON.stringify(validate.errors)}`).toBe(true);
      expect(body.build_id).toBe(TEST_BUILD_ID);
      expect(response.headers.get("X-Pywel-Build")).toBe(body.build_id);
    }
    const full = await (await app.request(`${cases.answerQuestion}&format=full`)).json();
    const validate = validator("answerQuestion");
    expect(validate(full), JSON.stringify(validate.errors)).toBe(true);
    expect(full.claims.length).toBeGreaterThan(0);
    expect((await app.request("/schemas/agent-contract.schema.json")).status).toBe(404);
  });

  it("compiles every authoritative definition offline and advertises only local bundled references", async () => {
    const { root } = await validStore();
    const ajv = new Ajv({ strict: true, allErrors: true, allowUnionTypes: true });
    addFormats(ajv);
    for (const file of await readdir(resolve(root, "schemas"))) {
      if (file.endsWith(".schema.json")) ajv.addSchema(JSON.parse(await readFile(resolve(root, "schemas", file), "utf8")));
    }
    const contract = ajv.getSchema("https://pywelknowledge.org/schemas/agent-contract.schema.json");
    expect(contract).toBeDefined();
    const openapi = JSON.parse(await readFile(resolve(root, "openapi/openapi.json"), "utf8"));
    for (const path of Object.values(openapi.paths) as Array<{ get: { operationId: string } }>) {
      const schema = responseSchema([path.get.operationId, "error"]);
      walk(schema, (record) => {
        if (record.$ref !== undefined) expect(record.$ref).toMatch(/^#\/definitions\/d[0-9]+$/);
        expect(record).not.toHaveProperty("$id");
      });
      expect(() => validator([path.get.operationId, "error"])).not.toThrow();
    }
    const health = JSON.stringify(responseSchema("getHealth"));
    expect(health).not.toContain("pywel.entity.v1");
    expect(health).not.toContain("pywel.strategy.v1");
    const changed = responseSchema("getHealth");
    changed.anyOf = [];
    expect(responseSchema("getHealth").anyOf).not.toEqual([]);
    expect(() => responseSchema("doesNotExist")).toThrow("Unresolved schema reference");
  });

  it("rejects missing versions, extra fields, malformed assertions and truncated compact tuples", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    const route = "/v1/answer?q=Can%20controller%20inputs%20be%20remapped%3F&patch=1.09.00";
    const full = await (await app.request(`${route}&format=full`)).json();
    const compact = await (await app.request(route)).json();
    const validate = validator("answerQuestion");
    const invalid = [
      { ...full, schema_version: "pywel.answer.v99" },
      { ...full, build_id: undefined },
      { ...full, hidden_private_field: "unapproved" },
      { ...full, assumptions: { ...full.assumptions, locale: "fr-FR" } },
      { ...full, claims: [{ ...full.claims[0], object: { kind: "boolean", value: "true" } }] },
      { ...full, claims: [{ ...full.claims[0], object: { kind: "number", value: false } }] },
      { ...full, claims: [{ ...full.claims[0], private_note: "unapproved" }] },
      { ...full, claims: [{ ...full.claims[0], predicate: undefined }] },
      { ...full, selection: { ...full.selection, claims: { matched: -1, returned: 0 } } },
      { ...compact, claims: [compact.claims[0].slice(0, -1)] },
      { ...compact, claims: [[...compact.claims[0], "unexpected-tuple-item"]] },
      { ...compact, state: "probably" },
    ];
    for (const candidate of invalid) expect(validate(candidate)).toBe(false);
  });

  it("uses the same closed numeric and enum constraints for all client inputs", () => {
    const ajv = new Ajv({ strict: true });
    const search = ajv.compile(requestSchema("searchKnowledge"));
    expect(search({ q: "controller", patch: "1.09.00", platform: "all", locale: "en-US", spoiler: "none", limit: 100, offset: 100000 })).toBe(true);
    for (const input of [
      { q: "controller", cursor: "c_0" }, { q: "controller", token_budget: 1000 },
      { q: "controller", offset: -1 }, { q: "controller", offset: 100001 },
      { q: "controller", limit: 0 }, { q: "controller", limit: 101 },
      { q: "controller", limit: "20" }, { q: "controller", limit: 1.5 },
      { q: "controller", locale: "fr-FR" }, { q: "controller", spoiler: "secret" },
      { q: "controller", patch: "latest" }, { q: "controller", patch: null },
      { q: "controller", include_retracted: "true" },
    ]) expect(search(input), JSON.stringify(input)).toBe(false);
    expect((requestSchema("answerQuestion").properties as Record<string, { default?: unknown }>).spoiler!.default).toBe("none");
    expect(() => requestSchema("doesNotExist")).toThrow("Unknown operation");
  });

  it("validates common errors, including absent records and unsupported inputs", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    const validate = validator("error");
    for (const path of ["/absent", "/v1/entities/not-real", "/v1/answer?q=test&locale=fr-FR", "/v1/entities?limit=101", "/v1/entities?limit=2&limit=3", `/v1/entities?q=${"x".repeat(9000)}`]) {
      const response = await app.request(path);
      expect(response.status).toBeGreaterThanOrEqual(400);
      const body = await response.json();
      expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
      expect(body.error.message).toBeTypeOf("string");
    }
    expect(validate({ schema_version: "pywel.error.v1", build_id: TEST_BUILD_ID, error: { code: "not_found", message: "Missing", stack: "private detail" } })).toBe(false);
  });
});
