# S05: retained quest reward identity links

**Unmerged S05 candidate at this preparation checkpoint.** Base: `152c967f2c66a9b3c9cd85028db8620469d6f07c`. This document records proposed source changes, not completed integration. The receipt records source-admission review only. [PR #21](https://github.com/RolandSaint/pywel/pull/21) is authoritative for any subsequent merge and verification; completion requires an exact resulting-main commit and passing checks recorded there. No such completion is asserted by this document. No new collection, outside contact, release, deployment, runtime, schema, vocabulary or dependency change is included. S02 remains withheld and its original permission finding unresolved.

## Finite result

The retained corpus has 144 quest identities, 65 `quest.reward` assertions and four `quest.prerequisite` assertions. This batch adds **12 entity-valued reward links across 10 existing quests**, reusing existing item identities and seven existing evidence records. There are **no new entities, evidence records or prerequisite links**. One contribution receipt binds the new claims.

Candidate source totals are **586 entities, 2,680 stored claims, 306 evidence records, 44 patch identities, one strategy and ten receipts**. All **74 earlier canonical files** retain their exact bytes. This is identity normalization of existing reward reports, not twelve independently discovered rewards or a complete quest-reward inventory.

The ten enriched quests are Black and White, A Fleeting Dream, Resolution, Unexpected Gift, The Face Behind the Mask, Unwavering Steps, Where the Wind Guides You, Shackles of Fate, Incomplete Victory and Forbidden Knowledge. A Fleeting Dream and Unwavering Steps each gain two links; the others each gain one. Palmar Pill and Honey Tea resolve to the existing **item** identities rather than same-named recipes. No item, quest or recipe identity is renamed, deleted or merged.

## Source and mapping boundary

The input is the already-retained chapter-field claims, not newly fetched pages. `quality/s05-quest-reward-review.json` accounts for all 65 reward assertions and four prerequisites, maps every new link to its original assertion, and pins prior canonical files and record-family hashes. The starting `data/` tree is `26bf76690ca9db5f88e648534a9f97009c36215e`.

Eligibility requires an unconditional retained reward label with a unique exact case/whitespace-normalized existing item name or alias. A terminal `×N` is separated for the audit only. Original strings remain unchanged. Three selected labels explicitly retain quantities (Palmar Pill ×1, Sunset Reed Cloth Gloves ×1 and Honey Tea ×10); other quantities remain unknown, not one. A typed link encodes identity only: it is not an additional reward on top of the text report, and the paired records must not be summed or counted as independent corroboration.

All new links preserve their parent's subject, predicate, evidence IDs, inferred/historical status, confidence 0.24, validity and quest-major spoiler level. Null patch/review bounds remain null. The source's historical `platforms: ["all"]` is inherited scope, not new all-platform testing. New provenance dates record this normalization, not a refreshed source capture.

The seven retained CrimsonWiki chapter sources keep their exact URLs, July 16, 2026 capture dates, projection hashes, unverified reliability, compatible-license disposition and shared `crimsonwiki-community-wiki` independence group. The existing CC BY-SA 4.0 attribution and modification notice is reused without duplicating evidence entries. Preserve `DATA_RIGHTS.md`, `LICENSE-DATA`, `LICENSES/THIRD-PARTY-DATA.md` and relevant evidence on redistribution; underlying game IP remains excluded from the contributor grant. This supplies no new source-use permission or gameplay verification.

## Held statements and prerequisites

Of the 65 reward assertions, 12 gain identity links; **48 have no eligible exact item match, four are numeric/unknown, and one is conditional**. All remain in canon unchanged. These are normalization gaps, not claims that rewards are absent. No fuzzy equivalence, conditional reward stripped of its condition, currency item, inventory item, access benefit or encounter drop is invented.

The two existing entity-valued prerequisites are reused unchanged. `Complete Troubled Count.` has no safely matched existing prerequisite quest; the other text describes an entry interaction, not an established prerequisite quest. Neither becomes a new dependency. Chronological quest order is not proof of mandatory progression. The approved up-to-50-quest limit is a ceiling, not a quota.

## Verification and consumer limits

Tests check every mapping and previous file, prior record hashes, receipt membership, unique typed reward triples, item-versus-recipe targets, original quantities, inherited context, exact-ID claim reads, bidirectional graphs, and qualified reward answers. Spoiler/unknown-patch controls, unchanged non-item rewards, all 100 S02 acquisition gaps and all 46 recipe ingredient answers protect existing behavior. Full/compact REST is compared with an actual stdio MCP process. Compact caps are not increased; use exact-ID reads for complete record sets.

The S04 historical test now selects its prior cohort from the receipt files already pinned in its frozen ledger; all original expected hashes remain unchanged. The M10 fixture excludes S05's two new files and IDs when reconstructing its original published manifest, preserving the historical digest. The live union is checked separately. No validator, source rule or historical expected hash is weakened.

The pull request records actual local diagnostic limits, pinned Node 24.18.0 CI, review findings, guarded merge and resulting-main verification. This batch does not introduce item acquisition claims, unlocks, effects, costs, current availability, new sources or S02 acceptance. Both existing releases remain untouched.

Two pre-existing free-text limitations remain: “What rewards do I get from Where the Wind Guides You?” also selects five existing objective records, and the corresponding reward question for Unwavering Steps includes two existing sequence records. These before/after sets are fixed in tests; only the intended reward link is added. This population batch does not claim to repair that question-shaped-name parser behavior. Exact quest-ID reads filtered to `quest.reward` return only reward records.

The cumulative additions manifest retains its existing scope identifier; its enumerated membership and file bindings are extended. Existing entries, source dispositions and historical ordering are unchanged.
