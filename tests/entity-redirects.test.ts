import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { KnowledgeIndex } from "../src/core/query.js";
import type { Claim } from "../src/core/types.js";
import { validateIntegrity } from "../src/core/validate.js";
import { TEST_BUILD_ID, validStore } from "./helpers.js";

async function redirectFixture() {
  const { root, store: source } = await validStore();
  const store = structuredClone(source);
  const canonical = store.entities.find((entity) => entity.slug === "item.refinement-token")!;
  const redirect = {
    ...canonical,
    entity_id: "ent_syntheticredirect00001",
    slug: "item.synthetic-token-alias",
    canonical_name: { locale: "en-US", text: "Synthetic Token Alias" },
    redirect_entity_id: canonical.entity_id,
    tags: ["canonical-redirect"],
  };
  canonical.aliases.push(redirect.canonical_name);
  store.entities.push(redirect);
  const sameAs: Claim = {
    ...store.claims[0]!, claim_id: "clm_syntheticredirect00001", subject_entity_id: redirect.entity_id,
    predicate: "relation.same_as", object: { kind: "entity" as const, entity_id: canonical.entity_id },
    status: "inferred" as const, behavior_kind: "historical" as const,
  };
  store.claims.push(sameAs);
  return { root, store, canonical, redirect, sameAs };
}

describe("synthetic entity redirect invariants", () => {
  it("rejects weak equivalence and gameplay references that bypass canonical targets", async () => {
    const { store, redirect, sameAs } = await redirectFixture();
    sameAs.status = "disputed";
    store.claims.push({ ...store.claims[0]!, claim_id: "clm_redirectgameplay000001", subject_entity_id: redirect.entity_id, predicate: "item.effect_summary", object: { kind: "string", value: "Synthetic test effect." } });
    const relationship = store.claims.find((claim) => claim.object.kind === "entity" && claim.predicate !== "relation.same_as")!;
    if (relationship.object.kind !== "entity") throw new Error("Expected entity fixture");
    relationship.object.entity_id = redirect.entity_id;
    store.strategies[0]!.goal_entity_id = redirect.entity_id;
    const codes = validateIntegrity(store).map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining([
      "entity_redirect_claim_missing", "entity_redirect_gameplay_claim", "entity_redirect_relationship_target", "entity_redirect_strategy_target",
    ]));
  });

  it("resolves redirect IDs and graph roots to the canonical entity", async () => {
    const { store, canonical, redirect } = await redirectFixture();
    expect(validateIntegrity(store).filter((issue) => issue.code.startsWith("entity_redirect"))).toEqual([]);
    const index = new KnowledgeIndex(store);
    const bundle = index.entityBundle(redirect.entity_id, {});
    expect(bundle?.entity.entity_id).toBe(canonical.entity_id);
    expect(bundle?.redirected_from?.entity_id).toBe(redirect.entity_id);
    expect(bundle?.warnings.join(" ")).toMatch(/redirects to canonical entity/i);
    expect(index.relationshipGraph(redirect.slug, {})?.root_entity_id).toBe(canonical.entity_id);
  });

  it("omits redirects from normal search and API lists while preserving audit access", async () => {
    const { store, canonical, redirect } = await redirectFixture();
    const index = new KnowledgeIndex(store);
    expect(index.searchEntities("Synthetic Token Alias").map((entity) => entity.entity_id)).toContain(canonical.entity_id);
    expect(index.searchEntities("Synthetic Token Alias").some((entity) => entity.entity_id === redirect.entity_id)).toBe(false);
    expect(index.searchEntities("Synthetic Token Alias", 20, true).some((entity) => entity.entity_id === redirect.entity_id)).toBe(true);
    const app = createApp(store, { buildId: TEST_BUILD_ID });
    expect(await (await app.request("/v1/entities?limit=1")).json()).toMatchObject({ total: store.entities.length - 1 });
    expect(await (await app.request("/v1/entities?include_redirects=true&limit=1")).json()).toMatchObject({ total: store.entities.length });
  });
});
