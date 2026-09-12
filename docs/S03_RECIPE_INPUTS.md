# S03 — Retained recipe ingredient identities and links

**Reviewed source batch.** Base: `0d6373f8f984d6a857d8953fb1e89cb9e503087e`. Source admission was finalized after review of candidate `s03-04c5d376dd7dbc712e9b`; the contribution receipt is `accepted`. [Issue #17](https://github.com/RolandSaint/pywel/issues/17) and its linked pull request record the exact reviewed head, feedback, integration commit and required CI results. Receipt acceptance alone does not prove completed integration. S02 remains blocked. No external collection, outside contact, release, deployment, schema, vocabulary, dependency or runtime change is included.

## Outcome and accounting

Exactly 46 existing recipe subjects, 161 retained ingredient assertions and 47 distinct labels were inspected. This source adds 25 identities: 23 specifically named material references and two prepared-food items. It adds 34 `relation.crafted_from` records and two entity-valued `recipe.output` records. Two ingredient edges replace wrong-type targets, retaining the old records with explicit supersession. These 36 records are structured relationships derived from retained knowledge, not 36 newly discovered gameplay facts.

Sixty-eight valid ingredient links are reused unchanged. In this reviewed cohort, 102 of 161 input occurrences have suitable typed links; 59 occurrences using nine ambiguous labels remain text-only. Sixteen recipes gain or correct input links; the other 30 were inspected without redundant population. This denominator is the finite reviewed cohort, not every recipe in the game.

Source totals: 545 entities, 2,627 stored claims, 306 evidence records, 44 patch identities, one strategy and eight receipts. Both published releases are unchanged. All 68 earlier canonical files retain their bytes. Main integration is established only by the exact merge and post-merge checks linked from issue #17.

## Evidence and permissions

The inputs are the already-retained cooking and alchemy claim catalogs, not newly fetched pages. Their hashes and every input ID are pinned in `quality/s03-recipe-input-review.json`. The local canonical projection was checked against all 68 pre-S02 hashes; the current additions manifest was matched to GitHub blob `549ab399fa77533ad9bc991701a4e2c9971cfa06`. The mounted source artifact's older metadata is not represented as a new source capture or a complete current-main checkout.

S03 reuses `evd_06652a8fff4f0593f8ce8431` (cooking, captured July 16, 2026 at 19:30 UTC) and `evd_62f7da1955faa80092f4449a` (alchemy, captured July 16 at 20:55 UTC). Their exact locators, projection hashes, contributor attribution, compatible-license disposition and unverified reliability stay unchanged. The shared independence group remains `crimsonwiki-community-wiki`. The unusual retained Potions locator `/wiki/test` is neither silently repaired nor newly verified. No new evidence, source licence, capture or independent observation is claimed.

The existing CrimsonWiki CC BY-SA 4.0 attribution and modification notice and underlying-game-IP exclusions continue to apply. Read `DATA_RIGHTS.md` and `LICENSES/THIRD-PARTY-DATA.md`. This is offline normalization of retained eligible records, not authorization for future automated source collection or a new source-rights certification.

## Mapping and limitations

A terminal `×N` is parsed only for the audit mapping. Every original `recipe.input` string is preserved. New entity-valued ingredient edges encode identity, not quantity. A string without a quantity produces `quantity: null` in the ledger, never an inferred count of one. No effect, cost, station, acquisition method, stock, unlock requirement or substitution set is added.

Links inherit their parent assertion's status, historical behavior, validity, locale and spoiler ceiling. Confidence never exceeds the parent, and ingredient links are capped at 0.24. Null patch and review bounds stay null. The original `platforms: ["all"]` is inherited historical scope, not new platform testing. Source availability, current inventory implementation and live-game correctness remain unverified.

Thirteen compatible resource identities are reused by exact case/whitespace-normalized names or aliases. No fuzzy match is promoted to identity equivalence. Twenty-three specifically named input labels become bounded material references, including Lesser Catalyst, Abyss Dewdrop, Charcoal and Mordant. Their presence as input labels does not independently verify an inventory implementation or acquisition route.

**Boiled Meat** and **Meat and Fish Skewers** already identify recipes but also appear as food inputs to Meatball Soup. Exact retained output assertions support creating two distinct item identities. The batch links each original recipe to its food output and replaces Meatball Soup's recipe-target edges with food-target edges. Same display text does not mean the same entity: recipe IDs are not renamed, redirected or deleted. Superseded edges remain available through explicit history inclusion.

The existing **Water** identity is reused for Palmar Pill's missing ingredient edge; its `Water ×2` input is unchanged.

The held labels are **Fruit, Grain, Meat, Vegetable, Seafood, Medicinal Herb, Quality Medicinal Herb, Small Fish and Medium Fish**. Their exact item-versus-group meaning and substitution membership are unresolved in the retained inputs. Their original recipe assertions remain; no species, inventory item or category membership is invented.

## Recipe and item name resolution (G03 correction)

At the integrated S03 checkpoint `64c08173199fef0903bb4e02bf531f68da680edd`, ingredient questions for Wine and Haiden's Lesser Elixir returned two and one item-side ingredient edges alongside the recipe's claims. S03 did not create those edges. The original records and historical audit remain unchanged.

The subsequent G03 query correction gives a matched recipe precedence over non-recipe identities sharing the same matched normalized name or alias **for ingredient-only questions**. It is not a special case for these two names. Identity selection occurs before patch/platform/spoiler/status filtering, so missing or hidden recipe facts cannot cause substitution of item-side claims. An item-only match still uses its existing ingredient evidence when no matching recipe identity exists. Search and exact-ID reads retain both identities and their records.

Wine now returns its five recipe input/relationship records; Haiden's Lesser Elixir returns six. Their three original item-side edges are preserved for exact-ID retrieval, not retracted or relabeled. All 46 reviewed recipes are checked for recipe-only ingredient subjects. Full/compact REST and actual stdio MCP regressions cover both names and the elixir alias, including compact truncation limits and historical uncertainty.

This is a bounded shared-query repair, not population, source re-admission or a general natural-language disambiguation redesign. Other intents and compound requests retain their prior routing; use exact IDs for explicit item-versus-recipe selection outside the ingredient-only case. The correction PR records its actual head/base, review, required pinned-runtime CI and resulting-main verification. No canonical data, quantity, source context, schema, dependency, S02 exclusion or published release changes.

## Validation and integration

The ledger accounts for every input, mapped target, prior relation reused, new relation, held label, corrected edge and supporting record. The original prior-file and record-hash baselines are retained. Only three new canonical files and their IDs are appended to the cumulative manifest; previous source decisions are unchanged.

The S02 preservation test selects its fixed seven-receipt historical cohort for its original counts and hashes. Its all-file preservation, 100-subject withholding and unresolved-permission assertions remain intact. Current-union tests separately use the S03 source totals. This is a frozen-cohort correction, not a replacement hash baseline or a relaxation of S02 exclusion.

Local diagnostics use Python against the repository's JSON Schemas, and the existing loader, integrity and query logic transpiled on Node 22.16.0. They are not the supported Node 24.18.0 acceptance run. The locked dependency installation could not finish offline because required packages were not cached. No dependency version was changed to work around that limit. Full REST and actual stdio MCP cases are supplied in `tests/s03-recipe-inputs.test.ts` but require the locked environment to execute. Compact answer caps remain explicit; use exact-ID graph/claim reads for complete typed relationship retrieval.

The exact candidate mapping was reviewed before finalizing receipt acceptance and refreshing its manifest file digest. The 25 entities, 36 claims and related-record payload hash remain identical to the prepared candidate. The publication gate remains unchanged; source admission is not a substitute for pinned-runtime, audit, full `npm run check`, actual REST/MCP and reproducibility checks. Merge only the reviewed passing head and verify the resulting main commit. The GitHub integration record supplies those actual results; no population or release step beyond this finite batch is implied.
