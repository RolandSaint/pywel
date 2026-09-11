# S02 — Equipment acquisition depth

Owner-approved scope: up to 100 existing S01 equipment entries, through source review, corrections, merge and passing main checks. Base: `6c8b2d1b189adf39276e623207b474690a01cafc`. No new release, runtime, schema, vocabulary, dependency or permanent execution workflow is part of this batch. The PR records exact integration and verification.

## What is added

100 existing items (40 weapons, 41 armor pieces, 19 accessories) gain **245 claims, 103 evidence records and one receipt**. No new entity or stat is added. Source totals: **520 entities / 2,836 stored claims / 409 evidence records / 44 patch identities / one strategy / eight receipts**. Every selected item previously lacked acquisition claims. S01 now has acquisition information for **112 of 200** entries; the remaining **88** are still gaps, not unobtainable items.

The overlapping claim counts are 85 crafting-station listings, 65 seller/shop pairs, 15 quest-reward listings, 31 crafting-only learning requirements, 43 source map leads, three supplementary guide routes and three exact existing quest-stage relationships. A source map pin alone is not counted as a confirmed acquisition method. The three entries with only a database pin receive a separately attributed, short historical pickup route.

## Mapping and source limits

The authoritative projection used 103 rate-limited public HTML requests, stopping at 100 eligible items. It skipped the twelve already-covered S01 entries. Two encountered entries lacked selected fields; remaining entries were outside the cap. A preliminary hyperlink-only pass was a discovery aid, not evidence of absent sellers or recipes. Its selected cohort is not merged with this one.

The mapping preserves source semantics: one seller and its shop label are not two sellers; internal shop/station labels are not verified locations or implemented menus. `Smith` and `Cook KukuPot` remain distinct source labels. Recipe access, stock, price and current unlock conditions are unverified. The 31 Required to Learn entries apply **only to the crafting route**, not to purchases or rewards. The source entry named Fluttering Radiance Plate Boots is linked as a miscellaneous learning record, not a self-prerequisite. Full recipe ingredients, costs and descriptions are excluded.

Quest series and displayed grant stages are separate. Three stage labels match existing quest identities: Toward the Nest, Master of a Forgotten Land and Lonely Jackals. Priscus the Ancient is an actor in the current corpus, so its same-named quest listing is not converted into an actor relationship. Missing quest/merchant identities are not invented.

Map links are retained only as **source-local locators**, not asserted game-world coordinates, spawn guarantees or complete routes. The Brass Rose Rapier, Kadel Mace and Double-Headed Axe of Greed get short original summaries from three inspected guides. The axe guide's changed-placement/respawn assertions are not assigned a patch or adopted as verified behavior. The rapier guide credits YouTube ASAP, so it is not independent observation.

All 100 field mappings, identities and references were checked; fifteen rendered item pages were separately inspected across stations, manuals, sellers and quest stages. This is not independent manual verification of every fact. Database records share one unresolved-upstream group. Claims remain inferred/historical, confidence 0.6, null patch and review bounds, and conservative PC-Steam intake scope—not observed PC or all-platform truth. Acquisition/learning records use quest_major, except the explicit epilogue quest listing, which uses ending. New acquisition evidence is not attached to S01 discovery-level stats; generic evidence metadata does not disclose hidden quest stages.

## Rights and provenance

Every source has an exact disposition in the additions manifest and an attribution entry in [third-party notices](../LICENSES/THIRD-PARTY-DATA.md). As in S01, this is limited, independently phrased factual reporting, not an open-data licence or wholesale database-copying grant. Public access and robots checks are not reuse permission. No full source body, media, map tile, recovered game file, full recipe or stat table is retained. Underlying rights remain excluded under [DATA_RIGHTS](../DATA_RIGHTS.md); source limitations and correction/removal rules remain applicable.

The input artifact and its selected-field hash are recorded in `quality/s02-acquisition-review.json` in the source checkout. The audit ledger is not needed to decode offline records, which carry exact source locators and receipt references. It is not copied into the runtime or required from an expiring artifact. Temporary collection/conversion files remain off main.

## Acceptance

Tests validate the entire new cohort, all previous canonical file hashes, source dispositions, route-specific requirements, exact-stage relations and negative spoiler/platform cases. All 100 standard acquisition queries must improve from no acquisition records to on-subject partial answers; a representative set is compared through full/compact REST and actual stdio MCP. Existing uncertainty, build and reproduction checks remain. Historical S01/M10 tests select their named original cohorts without changing their expected hashes.

Completion means reviewed integration with passing checks on main; it is not a new release or a certification of every item's current availability.
