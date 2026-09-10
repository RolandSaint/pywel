# G01 — Grounded answers before corpus expansion

G01 repairs the reproducible subject/predicate errors identified by [M6, PR #4](https://github.com/RolandSaint/pywel/pull/4). The implementation, final candidate commit, and final CI acceptance are recorded in [PR #5](https://github.com/RolandSaint/pywel/pull/5). PR acceptance and publication are separate actions; this record does not change the v1.0.0 release.

Base: public v1.0.0 commit `b6d6c0b455273bc3ecb9bf00427156827939dc03`. No canonical knowledge or review boundaries are changed. House Roberts is still absent; the correct result for the tested House Roberts questions is an explicit unknown, not a newly learned answer.

## Defect and minimal repair

With patch `1.14.00`, platform `all`, locale `en-US`, and spoiler ceiling `quest_major`, `Where is House Roberts based?` returned claim `clm_c26a38f457062d1e0f6d5805` about St. Halssius's House of Healing as `supported`. A fabricated House Zorblax query produced the same substitution. The default `none` spoiler ceiling had hidden that claim rather than fixing subject matching.

The answer path allowed loose token matches to select entities and claims when no subject identity was recognized. G01 removes that fallback from answers while leaving exploratory search unchanged. Answer candidates must now have an identity recognized by the existing name/alias matcher or its existing directed quest links. A location-like predicate cannot rescue an unrecognized subject.

Two adjacent tested errors are corrected in the same query file:

- A literal full-name or alias match takes priority over fuzzy neighboring names. `Creamy Meat Soup` no longer borrows the `Meatball Soup` definition.
- Ingredient requests select `recipe.input` and `relation.crafted_from`, with quantities first. Generic `needed`/`required` wording no longer turns those requests into recipe-scroll learning prerequisites. Explicit prerequisite/requirement nouns can still request that separate fact.

This changes internal selection logic only. No API operation, public schema, compact tuple, default context, dependency, service, database, or model is added. No name-specific blacklist or invented canonical record hides the defect.

## Executed red/green evidence

Both recorded CI runs use pinned Node **24.18.0**, the checked-in lockfile, and the unchanged `verified-build` workflow.

| Checkpoint | Result |
| --- | --- |
| Tests-only commit `92ceead036eceb92a49e4d2464acddb3889d03f2`; [red CI](https://github.com/RolandSaint/pywel/actions/runs/34506154116) | 13 new regressions fail; 146 tests pass, including all 139 pre-existing tests. Source validation and type checking pass before the expected assertion failures. |
| Core fix `d946e66a6b1748320e3ba90e354ddccda2b1ea88`; [green CI](https://github.com/RolandSaint/pywel/actions/runs/34506767703) | All 159 tests in 18 files pass. Production audit reports zero vulnerabilities; runtime pin, source policy, canonical/provenance checks, type checking, build, source-bound distribution verification, and reproducible builds pass. |

`tests/query-grounding.test.ts` adds 20 cases covering absent and fabricated subjects, all five spoiler ceilings, the genuine House of Healing answer, exact soup identity, both ingredient phrasings, bounded typo/alias handling, exploratory search, and the four published historical/unknown/predicate controls. Unsupported answers withhold unrelated claims, evidence, strategies, and compact catalog summaries. The soup records retain their review-gap/partial status; the fix does not manufacture freshness.

`tests/mcp.test.ts` also includes ten additional compact/full protocol cases: the two absent houses, soup definition, soup ingredients, and the genuine House of Healing location. It launches an actual stdio MCP process and compares its structured/text payload with the REST handler, asserting expected states and empty unsupported facts. These are cases inside the existing integration test, not ten additional test-count entries. Final acceptance requires the subsequent CI run for the complete PR, recorded in PR #5.

Local diagnostic probes used Node 22.16.0 and transpiled release modules; they are exploratory evidence only. Pinned-runtime correctness and the full install/test/build checks above come from GitHub CI. No local Node 24 certification or new release artifact is claimed.

## Deliberate retrieval boundary

Use search to discover a subject, then answer with its recognized name/alias or use exact-ID reads. A phrase such as `use seeds from quickslot` can still be found by search, but the answer path no longer borrows loosely related records without a recognized subject. `Farming: use seeds from quickslot` remains usable. Existing bounded multi-token typo/alias behavior is retained and tested.

This is a conservative fallback removal, not a complete natural-language parser. Arbitrary misspellings, multi-subject questions, and every possible predicate interpretation are not proven correct. Latest-indexed-patch routing and missing world/faction facts remain separate M6 gaps. Passing these cases is not a whole-product accuracy percentage.

## Reproduce and accept

From the named PR checkout, using the pinned Node version:

```sh
npm ci
npm run runtime:check
npm test -- tests/query-grounding.test.ts tests/mcp.test.ts
npm run security:audit
npm run check
npm run test:determinism
```

Acceptance requires the final PR diff to remain limited to the shared query implementation, focused regressions, adapter parity cases, and this record; canonical data, vocabulary, schemas, scope manifest, dependencies, and workflows must remain unchanged. Required checks must pass on the exact candidate. Merge remains reviewed; any later software release needs its own identity and authorization. Do not move v1.0.0 or add House Roberts records merely to make the regressions pass.

After acceptance, proceed to the bounded House Roberts research/specification pilot. No Work/Codex session, private development repository, personal system, or deployment is required for this repair.
