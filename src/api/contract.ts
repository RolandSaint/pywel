import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { findProjectRoot } from "../core/paths.js";

export type JsonSchema = Record<string, unknown> & { type?: "object" };
const schemaBase = "https://pywelknowledge.org/schemas/";
const contractUrl = `${schemaBase}agent-contract.schema.json`;
const sourceRoot = findProjectRoot();
const documents = new Map<string, Record<string, unknown>>();
const responses = new Map<string, JsonSchema>();
const requests = new Map<string, JsonSchema>();
const openapi = JSON.parse(readFileSync(resolve(sourceRoot, "openapi/openapi.json"), "utf8")) as Record<string, unknown>;

function pointer(document: unknown, fragment: string): unknown {
  if (fragment === "" || fragment === "#") return document;
  if (!fragment.startsWith("#/")) throw new Error(`Unsupported schema reference fragment: ${fragment}`);
  return fragment.slice(2).split("/").reduce((value: unknown, token) => {
    const key = decodeURIComponent(token).replaceAll("~1", "/").replaceAll("~0", "~");
    if (value === null || typeof value !== "object" || !(key in value)) throw new Error(`Unresolved schema reference: ${fragment}`);
    return (value as Record<string, unknown>)[key];
  }, document);
}

function schemaDocument(url: URL): Record<string, unknown> {
  const filename = url.href.slice(schemaBase.length).split("#")[0]!;
  if (!url.href.startsWith(schemaBase) || !/^[a-z0-9-]+\.schema\.json$/.test(filename)) {
    throw new Error(`Schema references must resolve within the local schemas directory: ${url.href}`);
  }
  let document = documents.get(filename);
  if (document === undefined) {
    document = JSON.parse(readFileSync(resolve(sourceRoot, "schemas", filename), "utf8")) as Record<string, unknown>;
    documents.set(filename, document);
  }
  return document;
}

/** Bundle only referenced local definitions so a client never fetches schema URLs. */
export function responseSchema(operation: string | readonly string[]): JsonSchema {
  const operations = typeof operation === "string" ? [operation] : operation;
  if (operations.length === 0) throw new Error("At least one response operation is required");
  const cacheKey = operations.join(",");
  const cached = responses.get(cacheKey);
  if (cached !== undefined) return structuredClone(cached);
  const definitions: Record<string, unknown> = {};
  const targets = new Map<string, string>();

  function reference(target: string, base: string): { $ref: string } {
    const url = new URL(target, base);
    let key = targets.get(url.href);
    if (key === undefined) {
      const node = pointer(schemaDocument(url), url.hash);
      key = `d${targets.size}`;
      targets.set(url.href, key);
      definitions[key] = rewrite(node, url.href);
    }
    return { $ref: `#/definitions/${key}` };
  }

  function rewrite(value: unknown, base: string): unknown {
    if (Array.isArray(value)) return value.map((item) => rewrite(item, base));
    if (value === null || typeof value !== "object") return value;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (["$id", "$schema", "definitions", "$defs"].includes(key)) continue;
      if (key === "$ref") {
        if (typeof item !== "string") throw new Error("Schema references must be strings");
        Object.assign(result, reference(item, base));
      } else result[key] = ["const", "enum", "default", "examples"].includes(key) ? item : rewrite(item, base);
    }
    return result;
  }

  const anyOf = operations.map((name) => reference(`#/definitions/${name}`, contractUrl));
  const result: JsonSchema = { $schema: "http://json-schema.org/draft-07/schema#", type: "object", anyOf, definitions };
  responses.set(cacheKey, result);
  return structuredClone(result);
}

function expandOpenApi(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(expandOpenApi);
  if (value === null || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if (typeof record.$ref === "string") {
    if (!record.$ref.startsWith("#/")) throw new Error("Request schemas must use local OpenAPI references");
    const { $ref, ...siblings } = record;
    return { ...expandOpenApi(pointer(openapi, $ref as string)) as Record<string, unknown>, ...expandOpenApi(siblings) as Record<string, unknown> };
  }
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, expandOpenApi(item)]));
}

/** REST parameters and MCP arguments share the exact same input constraints. */
export function requestSchema(operation: string): JsonSchema {
  const cached = requests.get(operation);
  if (cached !== undefined) return structuredClone(cached);
  const paths = openapi.paths as Record<string, { get?: { operationId: string; parameters?: unknown[] } }>;
  const route = Object.values(paths).map((path) => path.get).find((get) => get?.operationId === operation);
  if (route === undefined) throw new Error(`Unknown operation: ${operation}`);
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const raw of route.parameters ?? []) {
    const parameter = expandOpenApi(raw) as { name: string; required?: boolean; schema: unknown };
    if (parameter.name in properties) throw new Error(`Duplicate input parameter: ${parameter.name}`);
    properties[parameter.name] = parameter.schema;
    if (parameter.required === true) required.push(parameter.name);
  }
  const result: JsonSchema = { type: "object", additionalProperties: false, required, properties };
  requests.set(operation, result);
  return structuredClone(result);
}
