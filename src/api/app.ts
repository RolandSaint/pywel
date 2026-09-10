import { Hono } from "hono";
import Ajv from "ajv";
import { secureHeaders } from "hono/secure-headers";
import { KnowledgeIndex, resolveQueryContext, type QueryContext, type ResolvedQueryContext } from "../core/query.js";
import type { Claim, KnowledgeStore, Platform, SpoilerLevel } from "../core/types.js";
import { COMPACT_CODEBOOK, compactEvidencePacket } from "./compact.js";
import { requestSchema } from "./contract.js";

export interface AppOptions { buildId: string; }

const ROUTES: Array<[RegExp, string]> = [
  [/^\/health$/, "getHealth"], [/^\/v1$/, "getServiceDescriptor"], [/^\/v1\/codebook$/, "getCompactCodebook"],
  [/^\/v1\/search$/, "searchKnowledge"], [/^\/v1\/answer$/, "answerQuestion"], [/^\/v1\/entities$/, "listEntities"],
  [/^\/v1\/entities\/[^/]+$/, "getEntityBundle"], [/^\/v1\/entities\/[^/]+\/relationships$/, "getEntityRelationships"],
  [/^\/v1\/claims$/, "listClaims"], [/^\/v1\/strategies$/, "listStrategies"], [/^\/v1\/strategies\/[^/]+$/, "getStrategy"],
  [/^\/v1\/patches$/, "listPatches"], [/^\/v1\/patches\/latest$/, "getLatestPatch"], [/^\/v1\/patches\/[^/]+$/, "getPatchBundle"],
  [/^\/v1\/evidence$/, "listEvidence"], [/^\/v1\/evidence\/[^/]+$/, "getEvidence"],
];
const ajv = new Ajv({ allErrors: true, strict: false });
const validators = new Map<string, ReturnType<Ajv["compile"]>>();
export const INVALID_REQUEST_MESSAGE = "Request parameters do not match the operation schema.";
export function validRequest(operation: string, input: Record<string, unknown>): boolean {
  let validate = validators.get(operation);
  if (validate === undefined) { validate = ajv.compile(requestSchema(operation)); validators.set(operation, validate); }
  return validate(input) === true;
}

function parseContext(query: Record<string, string>): QueryContext {
  return {
    ...(query.patch === undefined ? {} : { patch: query.patch }),
    ...(query.platform === undefined ? {} : { platform: query.platform as Platform }),
    ...(query.locale === undefined ? {} : { locale: query.locale }),
    ...(query.spoiler === undefined ? {} : { spoilerCeiling: query.spoiler as SpoilerLevel }),
    ...(query.include_retracted === undefined ? {} : { includeRetracted: query.include_retracted === "true" }),
    ...(query.include_superseded === undefined ? {} : { includeSuperseded: query.include_superseded === "true" }),
  };
}

function contextPath(path: string, context: ResolvedQueryContext, extras: Record<string, string> = {}): string {
  const parameters = new URLSearchParams({
    ...(context.patch === null ? {} : { patch: context.patch }), platform: context.platform, locale: context.locale, spoiler: context.spoilerCeiling,
    include_retracted: String(context.includeRetracted),
    ...(path.startsWith("/v1/strategies/") ? {} : { include_superseded: String(context.includeSuperseded) }),
    ...extras,
  });
  return `${path}?${parameters}`;
}

function page<T>(records: T[], query: Record<string, string>, defaultLimit: number): { count: number; total: number; offset: number; next_offset: number | null; records: T[] } {
  const offset = Number(query.offset ?? 0);
  const selected = records.slice(offset, offset + Number(query.limit ?? defaultLimit));
  return { count: selected.length, total: records.length, offset, next_offset: offset + selected.length < records.length ? offset + selected.length : null, records: selected };
}

export function createApp(store: KnowledgeStore, options: AppOptions): Hono {
  const app = new Hono();
  const index = new KnowledgeIndex(store);
  const build_id = options.buildId;
  const errorBody = (code: string, message: string) => ({ schema_version: "pywel.error.v1", build_id, error: { code, message } });
  const patchContentCoverage = store.patches.reduce((counts, patch) => { counts[patch.content_coverage.level] += 1; return counts; }, { identity_only: 0, partial: 0, exhaustive: 0 });
  const latestPatchRecord = store.patches.find((patch) => patch.version === index.latestPatch);
  const patchBundle = (version: string) => {
    const patch = store.patches.find((item) => item.version === version);
    if (patch === undefined) return undefined;
    return {
      schema_version: "pywel.patch_bundle.v1", build_id, patch,
      claims: store.claims.filter((claim) => claim.validity.from_patch === patch.version && claim.evidence_ids.some((id) => patch.source_evidence_ids.includes(id))),
      evidence: patch.source_evidence_ids.map((id) => index.evidenceById.get(id)).filter((item) => item !== undefined),
    };
  };

  app.use("*", secureHeaders());
  app.use("*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    context.header("X-Pywel-Build", build_id);
    if (context.req.url.length > 8192) return context.json(errorBody("request_too_large", "Maximum URL length is 8192 characters."), 414);
    const operation = ROUTES.find(([pattern]) => pattern.test(context.req.path))?.[1];
    if (operation === undefined || context.req.method !== "GET") return next();
    const parameters = new URL(context.req.url).searchParams;
    const input: Record<string, unknown> = Object.create(null);
    const properties = requestSchema(operation).properties as Record<string, { type?: string }>;
    for (const [key, value] of parameters) {
      if (Object.hasOwn(input, key)) return context.json(errorBody("invalid_query", `Duplicate query parameter ${key}.`), 400);
      if ((key === "id" && ["getEntityBundle", "getEntityRelationships", "getStrategy", "getEvidence"].includes(operation)) || (key === "version" && operation === "getPatchBundle")) return context.json(errorBody("invalid_query", INVALID_REQUEST_MESSAGE), 400);
      const type = properties[key]?.type;
      input[key] = key === "q" ? value.trim() : type === "integer" && /^(?:0|[1-9][0-9]*)$/.test(value) ? Number(value)
        : type === "boolean" && ["true", "false"].includes(value) ? value === "true" : value;
    }
    const segments = context.req.path.split("/");
    try {
      if (["getEntityBundle", "getEntityRelationships", "getStrategy", "getEvidence"].includes(operation)) input.id = decodeURIComponent(segments[3]!);
      if (operation === "getPatchBundle") input.version = decodeURIComponent(segments[3]!);
    } catch { return context.json(errorBody("invalid_query", INVALID_REQUEST_MESSAGE), 400); }
    if (!validRequest(operation, input)) return context.json(errorBody("invalid_query", INVALID_REQUEST_MESSAGE), 400);
    await next();
  });

  app.get("/health", (context) => context.json({
    schema_version: "pywel.health.v1", build_id, status: "ok", service: "pywel-knowledge-standard", latest_known_patch: index.latestPatch,
    latest_patch_content_coverage: latestPatchRecord?.content_coverage ?? null,
    corpus: { entities: store.entities.length, claims: store.claims.length, evidence: store.evidence.length, strategies: store.strategies.length, patch_content_coverage: patchContentCoverage }, writes_enabled: false,
  }));
  app.get("/v1", (context) => context.json({
    schema_version: "pywel.service.v1", build_id, schema_bundle_path: "schemas/agent-contract.schema.json", name: "Pywel Knowledge Standard", game: "Crimson Desert", unofficial: true,
    default_context: { patch: index.latestPatch, platform: "all", locale: "en-US", spoiler: "none" }, transports: ["local_http_get", "stdio_mcp"], writes_enabled: false,
    endpoints: { search: "/v1/search?q={query}", answer: "/v1/answer?q={query}", entities: "/v1/entities", claims: "/v1/claims", strategies: "/v1/strategies", patches: "/v1/patches", evidence: "/v1/evidence", evidence_record: "/v1/evidence/{evidence_id}", codebook: "/v1/codebook" },
    behavior_contract: { unsupported: "structured_unknown_with_gap", disputes: "returned_without_forced_resolution", stale: "included_with_warning", default_patch: "latest_indexed_historical_patch_and_reported", patch_coverage: "identity_separate_from_normalized_content", citations: "claim_level_evidence_ids", official_intent_is_observation: false },
  }));
  app.get("/v1/codebook", (context) => context.json({ ...COMPACT_CODEBOOK, build_id }));
  app.get("/v1/search", (context) => {
    const query = context.req.query();
    const question = query.q?.trim();
    if (question === undefined) return context.json(errorBody("invalid_query", "q is required."), 400);
    const offset = Number(query.offset ?? 0);
    const result = index.search(question, parseContext(query), Number(query.limit ?? 20), offset);
    return context.json({ schema_version: "pywel.search.v1", build_id, query: question, context: result.context, total: result.total, count: result.hits.length, offset, next_offset: offset + result.hits.length < result.total ? offset + result.hits.length : null, hits: result.hits.map((hit) => {
      const [path, parameters] = hit.canonical_path.split("?");
      return { ...hit, canonical_path: contextPath(path!, result.context, Object.fromEntries(new URLSearchParams(parameters))) };
    }) });
  });
  app.get("/v1/entities", (context) => {
    const query = context.req.query();
    const includeRedirects = query.include_redirects === "true";
    const matched = (query.q === undefined ? store.entities.filter((entity) => includeRedirects || entity.redirect_entity_id === undefined) : index.searchEntities(query.q.trim(), store.entities.length, includeRedirects))
      .filter((entity) => query.type === undefined || entity.entity_type === query.type).filter((entity) => query.subtype === undefined || entity.subtype === query.subtype);
    const { records, ...pagination } = page(matched, query, 20);
    return context.json({ schema_version: "pywel.entity_list.v1", build_id, ...pagination, entities: records });
  });
  app.get("/v1/entities/:id", (context) => {
    const query = context.req.query();
    const bundle = index.entityBundle(context.req.param("id"), parseContext(query));
    return bundle === null ? context.json(errorBody("entity_not_found", "No entity matches that ID or slug."), 404)
      : context.json({ schema_version: "pywel.entity_bundle.v1", build_id, ...bundle, canonical_path: contextPath(`/v1/entities/${bundle.entity.entity_id}`, bundle.context) });
  });
  app.get("/v1/entities/:id/relationships", (context) => {
    const query = context.req.query();
    const requested = parseContext(query);
    const graph = index.relationshipGraph(context.req.param("id"), requested, Number(query.depth ?? 1), Number(query.limit ?? 100));
    return graph === null ? context.json(errorBody("entity_not_found", "No entity matches that ID or slug."), 404)
      : context.json({ ...graph, build_id, context: resolveQueryContext(store, requested) });
  });
  app.get("/v1/claims", (context) => {
    const query = context.req.query();
    const requested = parseContext(query);
    const offset = Number(query.offset ?? 0);
    const result = index.filterClaimsPage({ ...(query.subject === undefined ? {} : { subjectEntityId: query.subject }), ...(query.predicate === undefined ? {} : { predicate: query.predicate }), ...(query.status === undefined ? {} : { status: query.status as Claim["status"] }), context: requested, limit: Number(query.limit ?? 50), offset });
    return context.json({ schema_version: "pywel.claim_list.v1", build_id, context: resolveQueryContext(store, requested), count: result.claims.length, total: result.total, offset, next_offset: offset + result.claims.length < result.total ? offset + result.claims.length : null, claims: result.claims });
  });
  app.get("/v1/answer", (context) => {
    const query = context.req.query();
    const question = query.q?.trim();
    if (question === undefined) return context.json(errorBody("invalid_query", "q is required."), 400);
    const packet = index.answer(question, parseContext(query));
    const resolved = resolveQueryContext(store, { ...parseContext(query), patch: packet.assumptions.patch, spoilerCeiling: packet.assumptions.spoiler_ceiling });
    const full_path = contextPath("/v1/answer", resolved, { q: question, format: "full" });
    return context.json(query.format === "full"
      ? { ...packet, build_id, canonical_path: full_path }
      : { ...compactEvidencePacket(packet), build_id, canonical_path: contextPath("/v1/answer", resolved, { q: question, format: "compact" }), full_path });
  });
  app.get("/v1/strategies", (context) => {
    const query = context.req.query();
    const requested = parseContext(query);
    const matched = store.strategies.filter((strategy) => query.goal === undefined || strategy.goal_entity_id === query.goal).filter((strategy) => index.strategiesForEntity(strategy.goal_entity_id, requested).includes(strategy));
    const { records, ...pagination } = page(matched, query, 20);
    return context.json({ schema_version: "pywel.strategy_list.v1", build_id, context: resolveQueryContext(store, requested), ...pagination, strategies: records });
  });
  app.get("/v1/strategies/:id", (context) => {
    const query = context.req.query();
    const strategy = store.strategies.find((item) => item.strategy_id === context.req.param("id") || item.slug === context.req.param("id"));
    if (strategy === undefined) return context.json(errorBody("strategy_not_found", "No strategy matches that ID or slug."), 404);
    const requested = parseContext(query);
    if (!index.strategiesForEntity(strategy.goal_entity_id, requested).includes(strategy)) return context.json(errorBody("strategy_outside_context", "The strategy does not apply to the requested context."), 404);
    return context.json({ schema_version: "pywel.strategy_bundle.v1", build_id, context: resolveQueryContext(store, requested), canonical_path: contextPath(`/v1/strategies/${strategy.strategy_id}`, resolveQueryContext(store, requested)), strategy });
  });
  app.get("/v1/patches", (context) => context.json({ schema_version: "pywel.patch_list.v1", build_id, latest_known_patch: index.latestPatch, patches: store.patches }));
  app.get("/v1/patches/latest", (context) => {
    const bundle = index.latestPatch === null ? undefined : patchBundle(index.latestPatch);
    return bundle === undefined ? context.json(errorBody("patch_unknown", "No patch exists in the corpus."), 404) : context.json(bundle);
  });
  app.get("/v1/patches/:version", (context) => {
    const bundle = patchBundle(context.req.param("version"));
    return bundle === undefined ? context.json(errorBody("patch_not_found", "No patch matches that version."), 404) : context.json(bundle);
  });
  app.get("/v1/evidence", (context) => {
    const query = context.req.query();
    const q = query.q?.trim().toLocaleLowerCase("en-US");
    const matched = store.evidence.filter((evidence) => query.type === undefined || evidence.evidence_type === query.type)
      .filter((evidence) => query.tier === undefined || evidence.reliability.tier === query.tier).filter((evidence) => query.rights_mode === undefined || evidence.rights.retention_mode === query.rights_mode)
      .filter((evidence) => q === undefined || [evidence.source.title, evidence.source.publisher, evidence.source.locator, evidence.source.url].some((value) => value.toLocaleLowerCase("en-US").includes(q)))
      .sort((left, right) => left.evidence_id.localeCompare(right.evidence_id));
    const { records, ...pagination } = page(matched, query, 50);
    return context.json({ schema_version: "pywel.evidence_list.v1", build_id, ...pagination, evidence: records });
  });
  app.get("/v1/evidence/:id", (context) => {
    const evidence = index.evidenceById.get(context.req.param("id"));
    return evidence === undefined ? context.json(errorBody("evidence_not_found", "No evidence matches that ID."), 404) : context.json({ schema_version: "pywel.evidence_bundle.v1", build_id, evidence });
  });
  app.notFound((context) => context.json(errorBody("not_found", "Route not found."), 404));
  app.onError((_error, context) => context.json(errorBody("internal_error", "The request could not be completed."), 500));
  return app;
}
