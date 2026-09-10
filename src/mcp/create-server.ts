import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { findProjectRoot } from "../core/paths.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListToolsRequestSchema, McpError, ReadResourceRequestSchema, type Tool } from "@modelcontextprotocol/sdk/types.js";
import { createApp, INVALID_REQUEST_MESSAGE, validRequest } from "../api/app.js";
import { requestSchema, responseSchema } from "../api/contract.js";
import { canonicalJson } from "../core/canonical-json.js";
import type { KnowledgeStore } from "../core/types.js";

export interface PywelMcpServerOptions { store: KnowledgeStore; buildId: string; }

export function createPywelMcpServer(options: PywelMcpServerOptions): Server {
  const app = createApp(options.store, options);
  const build_id = options.buildId;
  const { version } = JSON.parse(readFileSync(resolve(findProjectRoot(), "package.json"), "utf8")) as { version: string };
  const server = new Server({ name: "pywel-knowledge-standard", version }, { capabilities: { tools: {}, resources: {} } });
  const definitions = [
    { name: "pywel_answer", operation: "answerQuestion", path: "/v1/answer", description: "Answer from evidence-backed historical claims. Compact by default; format full supplies complete fields. Default spoiler is none; unsupported facts stay unknown." },
    { name: "pywel_search", operation: "searchKnowledge", path: "/v1/search", description: "Search entities, claims, and strategies with explicit context and bounded offset pagination." },
    { name: "pywel_search_entities", operation: "listEntities", path: "/v1/entities", description: "List or search canonical entities by optional query, type, subtype, and pagination." },
    { name: "pywel_get_entity", operation: "getEntityBundle", path: "/v1/entities/{id}", description: "Get one entity ID or slug with contextual claims, evidence, relationships, and uncertainty." },
    { name: "pywel_get_relationships", operation: "getEntityRelationships", path: "/v1/entities/{id}/relationships", description: "Follow entity-valued claims within explicit context, depth, and edge limits." },
    { name: "pywel_get_claims", operation: "listClaims", path: "/v1/claims", description: "Read atomic claims filtered by subject, predicate, status, context, and offset pagination." },
    { name: "pywel_get_strategy", operation: "getStrategy", path: "/v1/strategies/{id}", description: "Get one strategy ID or slug after applying patch, platform, locale, and spoiler filters." },
    { name: "pywel_get_evidence", operation: "getEvidence", path: "/v1/evidence/{id}", description: "Get one public evidence ID with source locator, reliability, provenance, and rights." },
    { name: "pywel_get_patches", operation: "getPatchBundle", path: "/v1/patches/{version}", description: "List historical patches, or pass version to retrieve its identity, linked claims, and evidence. Patch indexing does not refresh claims." },
  ];
  const listed: Tool[] = definitions.map((definition) => {
    const inputSchema = requestSchema(definition.operation);
    if (definition.name === "pywel_get_patches") inputSchema.required = [];
    return {
      name: definition.name, description: definition.description,
      inputSchema: { ...inputSchema, type: "object" },
      outputSchema: { ...responseSchema(definition.name === "pywel_get_patches" ? ["listPatches", "getPatchBundle", "error"] : [definition.operation, "error"]), type: "object" },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    };
  });
  const resources = [
    { name: "pywel-service", uri: "pywel://service", description: "Versioned service identity and operating contract.", path: "/v1" },
    { name: "pywel-codebook", uri: "pywel://codebook", description: "Exact compact answer tuple fields, warnings, and retrieval semantics.", path: "/v1/codebook" },
  ];
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listed }));
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: resources.map(({ path: _path, ...resource }) => ({ ...resource, mimeType: "application/json" })) }));
  server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
    const resource = resources.find((item) => item.uri === params.uri);
    if (resource === undefined) throw new McpError(ErrorCode.InvalidParams, "Unknown Pywel resource.");
    const response = await app.request(resource.path);
    return { contents: [{ uri: resource.uri, mimeType: "application/json", text: canonicalJson(await response.json(), true) }] };
  });
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    const definition = definitions.find((item) => item.name === params.name);
    let response: Response;
    if (definition === undefined) {
      response = Response.json({ schema_version: "pywel.error.v1", build_id, error: { code: "tool_not_found", message: "Unknown Pywel tool." } }, { status: 404 });
    } else {
      const input = { ...params.arguments };
      if (typeof input.q === "string") input.q = input.q.trim();
      const patchList = definition.name === "pywel_get_patches" && input.version === undefined;
      const operation = patchList ? "listPatches" : definition.operation;
      if (!validRequest(operation, input)) {
        response = Response.json({ schema_version: "pywel.error.v1", build_id, error: { code: "invalid_query", message: INVALID_REQUEST_MESSAGE } }, { status: 400 });
      } else {
        let path = patchList ? "/v1/patches" : definition.path;
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(input)) {
          if (path.includes(`{${key}}`)) path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
          else query.set(key, String(value));
        }
        response = await app.request(`${path}${query.size === 0 ? "" : `?${query}`}`);
      }
    }
    const structuredContent = await response.json() as Record<string, unknown>;
    return { content: [{ type: "text", text: canonicalJson(structuredContent, true) }], structuredContent, ...(response.ok ? {} : { isError: true }) };
  });
  return server;
}
