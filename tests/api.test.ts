import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { TEST_BUILD_ID, validStore } from "./helpers.js";

describe("read-only REST", () => {
  it("preserves explicit context when agents follow search and answer links", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    const query = "q=controller&patch=1.09.00&platform=pc-steam&locale=en-US&spoiler=none&include_retracted=true&include_superseded=true";
    const search = await (await app.request(`/v1/search?${query}`)).json();
    for (const hit of search.hits) {
      const linked = await app.request(hit.canonical_path);
      expect(linked.status, hit.canonical_path).toBe(200);
      const body = await linked.json();
      expect(body.context).toMatchObject({ patch: "1.09.00", platform: "pc-steam", locale: "en-US", spoilerCeiling: "none" });
    }
    const compact = await (await app.request(`/v1/answer?${query}`)).json();
    expect((await (await app.request(compact.full_path)).json()).assumptions).toEqual({ patch: "1.09.00", platform: "pc-steam", locale: "en-US", spoiler_ceiling: "none" });
  });

  it("describes the finite read service and returns compact/full evidence-linked answers", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    const descriptor = await (await app.request("/v1")).json();
    expect(descriptor).toMatchObject({ unofficial: true, writes_enabled: false, transports: ["local_http_get", "stdio_mcp"] });
    expect(JSON.stringify(descriptor.endpoints)).not.toMatch(/attestation|contribution|coverage|release-readiness/);
    const health = await (await app.request("/health")).json();
    expect(health).toMatchObject({ status: "ok", writes_enabled: false, corpus: { claims: store.claims.length } });
    const query = "q=Can%20controller%20inputs%20be%20remapped%3F&patch=1.09.00";
    const compact = await (await app.request(`/v1/answer?${query}`)).json();
    const full = await (await app.request(`/v1/answer?${query}&format=full`)).json();
    expect(compact).toMatchObject({ schema_version: "pywel.answer.compact.v3", state: "supported" });
    expect(full).toMatchObject({ schema_version: "pywel.answer.v1", answer_state: "supported", assumptions: { patch: "1.09.00" } });
    expect(full.claims.length).toBeGreaterThan(0);
    expect(full.evidence.length).toBeGreaterThan(0);
    expect((await (await app.request(compact.canonical_path)).json()).state).toBe("supported");
    expect(compact).not.toHaveProperty("verify");
    expect(full).not.toHaveProperty("verification");
    expect(await (await app.request("/v1/codebook")).json()).not.toHaveProperty("answer_compact.verify");
  });

  it("uses the shared query result for unsupported classification and future patches", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    const index = new KnowledgeIndex(store);
    for (const [q, patch] of [["Is controller remapping available?", "9.99.00"], ["Is Axiom Bracelet an item?", "1.14.00"], ["Is City of Hernand a location?", "1.14.00"]]) {
      const response = await app.request(`/v1/answer?${new URLSearchParams({ q: q!, patch: patch!, format: "full" })}`);
      expect(response.status).toBe(200);
      const body = await response.json();
      const expected = index.answer(q!, { patch: patch! });
      expect(body.answer_state).toBe(expected.answer_state);
      expect(body.answer_state).not.toBe("supported");
      expect(body.gaps).toEqual(expected.gaps);
      const compact = await (await app.request(`/v1/answer?${new URLSearchParams({ q: q!, patch: patch! })}`)).json();
      expect(compact.state).toBe(body.answer_state);
      expect(compact.gaps).toEqual(body.gaps.map((gap: { code: string }) => gap.code));
    }
  });

  it("retrieves entity relationships, claims, and evidence by stable ID", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    const relationship = store.claims.find((claim) => claim.object.kind === "entity" && claim.predicate !== "relation.same_as")!;
    const entityResponse = await app.request(`/v1/entities/${relationship.subject_entity_id}?platform=pc-steam&spoiler=discovery`);
    expect(entityResponse.status).toBe(200);
    expect((await entityResponse.json()).entity.entity_id).toBe(relationship.subject_entity_id);
    const graph = await (await app.request(`/v1/entities/${relationship.subject_entity_id}/relationships?platform=pc-steam&spoiler=discovery&depth=2`)).json();
    expect(graph.edges.map((edge: { claim_id: string }) => edge.claim_id)).toContain(relationship.claim_id);
    const claims = await (await app.request(`/v1/claims?subject=${relationship.subject_entity_id}&spoiler=discovery&limit=200`)).json();
    expect(claims.claims.every((claim: { subject_entity_id: string }) => claim.subject_entity_id === relationship.subject_entity_id)).toBe(true);
    const evidence = store.evidence[0]!;
    expect((await (await app.request(`/v1/evidence/${evidence.evidence_id}`)).json()).evidence).toEqual(evidence);
  });

  it("pages entity and evidence catalogs without overlapping records", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    for (const [route, key, id] of [["entities", "entities", "entity_id"], ["evidence", "evidence", "evidence_id"]]) {
      const first = await (await app.request(`/v1/${route}?limit=2`)).json();
      const second = await (await app.request(`/v1/${route}?limit=2&offset=${first.next_offset}`)).json();
      expect(first.count).toBe(2);
      expect(first.total).toBe(second.total);
      expect(second[key!].map((record: Record<string, string>) => record[id!])).not.toEqual(first[key!].map((record: Record<string, string>) => record[id!]));
      expect(first[key!].some((record: Record<string, string>) => second[key!].some((other: Record<string, string>) => other[id!] === record[id!]))).toBe(false);
    }
    const materials = await (await app.request("/v1/entities?q=Refinement&subtype=material")).json();
    expect(materials.entities).toEqual(expect.arrayContaining([expect.objectContaining({ canonical_name: { locale: "en-US", text: "Refinement Token" }, subtype: "material" })]));
    const search = await (await app.request("/v1/search?q=Refinment%20Token&limit=5")).json();
    expect(search.hits[0].title).toBe("Refinement Token");
  });

  it("exposes historical patch identities with source-linked claims and evidence", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    const latest = await (await app.request("/v1/patches/latest")).json();
    expect(latest.patch.version).toBe("1.14.00");
    const patch = await (await app.request("/v1/patches/1.13.01")).json();
    expect(patch.patch.version).toBe("1.13.01");
    expect(patch).not.toHaveProperty("effective_official_note_coverage");
    expect(patch.evidence.length).toBeGreaterThan(0);
    const strategy = store.strategies.find((record) => record.slug === "strategy.farming-seed-quickslot")!;
    expect((await (await app.request(`/v1/strategies/${strategy.slug}?platform=pc-steam`)).json()).strategy.nodes).toEqual(strategy.nodes);
  });

  it("has no write, HTTP MCP, private manager, or obsolete gate routes", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    for (const path of ["/mcp", "/v1/changes", "/v1/contributions", "/v1/attestations", "/v1/verification/cards/clm_test", "/manager/captures", "/v1/coverage", "/v1/release-readiness"]) {
      expect((await app.request(path)).status).toBe(404);
      expect((await app.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status).toBe(404);
    }
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) expect((await app.request("/v1/answer?q=test", { method })).status).toBe(404);
  });

  it("bounds inputs and returns structured errors with security headers", async () => {
    const { store } = await validStore();
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    for (const path of ["/v1?__proto__=ignored", "/v1/entities/%ZZ", "/v1/entities/%F0%80%80%80", "/v1/search?q=test&limit=0", "/v1/search?q=test&limit=101", "/v1/entities?limit=2&cursor=c_2", "/v1/entities?offset=100001", "/v1/search?q=test&q=other", "/v1/search?q=test&locale=fr-FR", "/v1/search?q=test&token_budget=100", "/v1/entities?spoiler=none", "/v1/answer?q=++", "/v1/answer?q=x", "/v1/answer?q=test&format=verbose", "/v1/answer?q=test&platform=toaster", "/v1/answer?q=test&patch=latest", "/v1/entities?limit=NaN", "/v1/evidence?offset=-1", "/v1/entities?include_redirects=yes", "/v1/search?q=test&cursor=nope", `/v1/answer?q=${"x".repeat(1001)}`]) {
      const response = await app.request(path);
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBeTypeOf("string");
    }
    expect((await app.request(`/v1/entities?q=${"x".repeat(9000)}`)).status).toBe(414);
    const missing = await app.request("/v1/entities/not-real");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("x-content-type-options")).toBe("nosniff");
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(await missing.json()).toMatchObject({ error: { code: "entity_not_found" } });
  });
});
