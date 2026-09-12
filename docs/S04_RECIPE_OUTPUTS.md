# S04: retained recipe-output identities and links

**Reviewed source batch, with integration evidence in [PR #20](https://github.com/RolandSaint/pywel/pull/20).** Base: `26942c359be790dc6b821b3660907ddc4b0632f0`. Source admission is not a substitute for actual diff/feedback review, required CI, guarded merge and checks on the resulting main commit. S02 remains excluded and its permission finding unresolved. No outside contact, new collection, release, deployment, runtime, schema, vocabulary or dependency change is included.

## Finite result

The same **46 recipe subjects** reviewed in S03 contain **48 existing output assertions**: 43 text labels and five typed links. Fish Porridge, Wine and Haiden's Lesser Elixir already had typed outputs; S03 added the Boiled Meat and Meat and Fish Skewers links while retaining their original labels. Those five links and identities are reused without duplication.

The other **41 recipes gain 41 named output-item identities and 41 entity-valued `recipe.output` links**, plus one receipt. All 46 recipes now have exactly one typed output target in this cohort. This is structured expansion of existing knowledge, not 41 newly discovered gameplay facts or all recipes in the game. The original 48 output assertions and all ingredient quantities retain their bytes; text and typed links describe the same output, not independent corroboration.

Current source totals are **586 entities, 2,668 stored claims, 306 evidence records, 44 patch identities, one strategy and nine receipts**. All **71 earlier canonical files** remain byte-identical. The immutable initial manifest, previous source decisions, S03 corrections, G03 resolver and both published releases remain unchanged.

## Mapping and source boundary

`quality/s04-recipe-output-review.json` pins every recipe, original output assertion, target identity, reused/new link, source-evidence ID, and prior canonical hash. Its base `data/` tree is `595c188af3131ef234e1773a6a401b377b0aea07`; the complete retained data and schemas were matched to GitHub before normalization. A mounted older source export is not represented as a complete current-main checkout or a new external capture.

A new identity requires an explicit retained output label and no compatible existing non-recipe identity by exact case/whitespace-normalized name or alias. Every selected label names a specific output. Recipes and their same-named outputs remain separate identities: no recipe is renamed, redirected, or deleted. No fuzzy match is promoted to equivalence. Existing typed outputs are reused, and their original labels are not linked a second time.

New output identities use **generic `item` / `item` typing**. A name alone does not establish a consumable, material, equipment class, effect or inventory implementation. In particular, dye, elixir and Platinum labels are not used to infer effects, usage rules or narrower taxonomy. New links inherit the exact parent assertion's evidence, status, historical behavior, confidence, validity and spoiler level. They add identity only, not yield quantity. Missing yield information stays missing, never one.

The source is already-retained cooking and alchemy data. S04 reuses the original CrimsonWiki cooking evidence captured July 16, 2026 at 19:30 UTC and alchemy evidence captured that day at 20:55 UTC. The exact IDs are pinned in the ledger and canonical claim records. Source URLs, projection hashes, unverified reliability, shared `crimsonwiki-community-wiki` independence group and compatible-license disposition remain unchanged. The retained alchemy locator is not refreshed or silently repaired. Null patch/review bounds remain null; historical `platforms: ["all"]` does not imply new platform testing.

The existing CrimsonWiki CC BY-SA 4.0 attribution and modification notice is reused, not duplicated. Preserve `DATA_RIGHTS.md`, `LICENSE-DATA`, `LICENSES/THIRD-PARTY-DATA.md` and the linked evidence with redistribution. Underlying game IP remains excluded from the contributor grant. This batch performs offline normalization within the retained source boundary; it supplies no new permission for automated collection or legal certification.

## Consumer value and verification

Exact recipe-ID claim reads filtered to `recipe.output` now return a typed target for every cohort recipe. Relationship graphs can traverse from each recipe to its output and back from that output to the producing recipe. Search retains both identities. Raw files and graphs carry source context; they are not a verified live crafting interface.

The regression suite checks the entire mapping, all 71 prior file hashes, all prior record hashes, exact receipt membership/hash, duplicates, target types, original labels and inherited context. It compares all 46 ingredient answers with the prior corpus so the new same-name output identities cannot undo G03. It also checks acquisition gaps, unknown names/patches, exact-ID graph traversal, and full/compact REST agreement with an actual stdio MCP process. Compact caps remain in force; exact-ID reads supply untruncated output relations.

The M10 published fixture excludes only this later batch's new IDs/files when reconstructing its frozen historical manifest. Its original expected digest and assertions remain unchanged. The live union is checked separately; no admission, attribution, privacy or source-policy gate is disabled. The S02 and S03 historical baselines are unchanged.

Local schema/hash and core-query diagnostics are not the required Node 24.18.0 acceptance run. The PR records the actual executed environments, candidate SHA, review feedback, CI results, merged SHA and post-merge verification. No completed integration is inferred from a source receipt or a local test result.

## Remaining limits

This does not add effects, yield counts, recipe access, stations, stock, substitutions or current-game confirmation. The nine ambiguous S03 ingredient labels remain text-only. G03's recipe preference still applies only to ingredient-only questions; broader free-text routing is unchanged. S02 cannot be restored without its separate permitted-intake resolution. Temporary branch cleanup is reported separately from canonical integration, and neither existing release is modified.
