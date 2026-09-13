# S06: retained reward-item identities

**Preparation record for a bounded S06 candidate.** Base: `641bbcb46473bb3e12305f6572f1dcb1acb80d5a`. Source admission does not assert a completed merge. [Issue #22](https://github.com/RolandSaint/pywel/issues/22) and its pull request record the actual reviewed head, feedback, required checks, resulting main and cleanup. No new source collection, outside contact, release or deployment is included. S02 remains withheld.

## Finite population

The candidate adds 25 generic item identities, 29 typed `quest.reward` links across 12 existing quests, and one receipt. Seven already-retained CrimsonWiki evidence records are reused; no evidence or prerequisite records are added. Candidate totals are 611 entities, 2,709 stored claims, 306 evidence records, 44 patch identities, one strategy and eleven receipts. These totals do not certify integration or current-game coverage.

The selected labels are explicitly enumerated in `quality/s06-reward-item-review.json`, with every parent claim, target, quantity and source ID. Each has an unconditional retained reward assertion, a sufficiently specific item label, and no existing exact normalized name or alias. Repeated exact labels reuse one target: four Abyss Artifact assertions and two Iron Ore assertions produce only one new identity per label. This is identity normalization of existing reports, not new gameplay discovery.

All 76 pre-S06 canonical files and their record hashes remain unchanged, including S05's twelve links, 65 earlier reward assertions and four prerequisite assertions. Original strings carry quantities. Typed links express identity only; they do not add another reward, imply a quantity of one, or constitute independent corroboration. No prior reward record is retracted or superseded.

## Source and meaning boundaries

The retained data assembly was matched to current main's complete `data/` tree `0082e867284070c6acff02582f8ad61f56af8323` and `schemas/` tree `d0728de66821133e7db7f9fb735575ce4c9513b2`. Prior artifacts were used only after content verification, not treated as a new capture or a full current-main checkout. No external source URL was recollected.

The seven original CrimsonWiki chapter evidence records retain their exact source URLs, capture timestamps, projection hashes, compatible-license disposition, unverified reliability and shared `crimsonwiki-community-wiki` independence group. Existing CC BY-SA 4.0 attribution and modification notices are reused without duplicate notices. Preserve `DATA_RIGHTS.md`, `LICENSE-DATA`, `LICENSES/THIRD-PARTY-DATA.md` and relevant evidence. This normalization supplies no new permission for collection or rights held by others.

Every new link inherits its parent's evidence, inferred/historical status, confidence 0.24, quest-major spoiler ceiling and validity. Null patch/review bounds remain null. Historical platform `all` is not new platform testing. New entities use generic `item`/`item` typing; labels containing armor, ore, food or ticket do not create narrower taxonomy, effect, inventory-implementation or current-availability claims. The original quantity string remains the source of any stated count.

## Holds and retrieval

Opaque names such as Ignir, Golden Vanguard and Shackle of Might, the Core Blueprint: Haste type ambiguity, the conditional Glenbright reward, and the alliance benefit are not converted into item identities. Medium Bags is not silently equated with Medium Bag. Original plural labels such as Cloth Pieces are preserved literally, without asserting a singular alias or substitution membership. Other labels beyond the selected 25 remain outside this batch, not absent or invalid rewards.

Exact quest-ID reads filtered to `quest.reward` and bidirectional relationship graphs expose all 29 links. Free-text answers retain historical partial/review-gap states. Existing question-shaped-name routing can still select objectives or sequence records; no runtime correction is claimed. Searchability of a new item is not proof that a free-text acquisition route, effect or recipe is known. Compact caps remain unchanged.

## Verification and integration

The regression suite checks all 76 prior file hashes, all six prior record-family hashes, complete receipt membership/payload, every source-to-target mapping, duplicate prevention, generic target types, inherited context and unchanged original rewards. It exercises all 29 exact links and both graph directions, all 46 recipe ingredient answers, and all 100 withheld S02 acquisitions across five spoiler ceilings. Actual stdio MCP and full/compact REST tests cover exact rewards and representative bounded answers.

S05's prior-answer assertion selects its existing frozen prior claim IDs rather than treating all future non-S05 claims as old records. Its original hashes, fixed S05 counts and original answer claims remain required. M10 excludes only S06 files/IDs from its frozen published fixture, preserving the original expected digest. Current-union validation stays strict and independent. No schema, runtime, source policy, dependency, workflow or acceptance gate is changed.

Local diagnostics on Node 22 are not supported-runtime acceptance. The existing Node 24.18.0 CI must pass its locked install, audit, validation, typecheck, full tests, adapter checks, build/distribution and reproducibility on the reviewed head. Guarded PR merge and separate resulting-main verification are required; the linked PR records actual outcomes and remaining cleanup. Both published releases remain unchanged.
