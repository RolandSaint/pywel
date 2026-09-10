# M6 — Coverage and usefulness baseline

**Status: baseline work complete; maintainer acceptance remains a reviewed PR decision.**

Measured September 10, 2026. This is a read-only analysis of the published corpus, not a new release certification. No canonical data, vocabulary, schema, runtime, dependency, release-scope manifest, or release change is included. M0–M5 remain historical completed milestones.

## Decision

Repair query grounding before promoting more knowledge. Then research a bounded House Roberts pilot. Existing knowledge is concentrated in recipes, quest objectives/sequences, bosses, and mounts. The faction graph and current-patch review coverage are sparse. Adding records alone will not fix wrong-subject answers.

## Baseline and method

| Identity | Value |
| --- | --- |
| Repository | `RolandSaint/pywel` |
| Tag and inspected main | `v1.0.0`, `b6d6c0b455273bc3ecb9bf00427156827939dc03` |
| Source tree | `4f8e59084b1ae48ae3a9de8b56d59bfc544be548` |
| Build ID | `bld_f8f534d88ae1b9e139596232` |
| Source archive SHA-256 | `92788b9d34fed7b6f3c29e1b36ed42f41e174950721cbfd331274bcfbd28b51d` |
| Data archive SHA-256 | `18a5270d18559f5abaa28da3ce57c7bc07896e555729fa41a2b4c293ca36eac5` |
| Source manifest SHA-256 | `dc793f7dc1296d14a4d9f10ea20a3971d5dc002d4c71040f11132a8908fc935b` |
| Data checksum-file SHA-256 | `4d0608c6032df6a8aab4b5d714689a381d402ebdcc1d53ede75bc9c3fd9c9049` |

The live GitHub connector confirmed main equals the public root commit. A saved distribution copy was used because direct archive/network retrieval in the analysis environment failed. Both archive hashes matched the [published release](https://github.com/RolandSaint/pywel/releases/tag/v1.0.0). All 163 source-file hashes and the exact export inventory were checked. Every data-bundle checksum was checked. All six canonical record families matched the exported corpus by stable ID and content. Only clean public-release contents were analyzed, not the old private repository or personal systems.

The [existing public CI run](https://github.com/RolandSaint/pywel/actions/runs/34494305020) passed on this exact baseline. That historical success is not a new M6 runtime check.

Twenty frozen queries and six supplemental probes were actually executed against the released `KnowledgeIndex.answer` implementation and hash-verified corpus. Four core TypeScript modules were transpiled without source-logic edits using TypeScript 5.8.3 and executed on Node 22.16.0. This evaluates core logic, **not** supported-runtime release compatibility. The pinned Node 24.18.0 installation, locked dependencies, full 139-test suite, REST/MCP processes, and reproducible builds were **not rerun here**. Reproduce the reported defects under the pinned runtime before accepting a fix. No Work or Codex session was invoked.

## Counted inventory

Claims below are attributed to their subject entity. Existing entity types partition the corpus; these are not whole-game coverage percentages.

| Entity type | Entities | Subject claims | Entities with no subject claim |
| --- | ---: | ---: | ---: |
| actor | 55 | 314 | 0 |
| item | 19 | 53 | 1 |
| location | 18 | 21 | 2 |
| quest | 140 | 481 | 0 |
| recipe | 46 | 464 | 0 |
| resource | 15 | 24 | 7 |
| skill | 3 | 3 | 0 |
| system | 14 | 36 | 0 |
| **Total** | **310** | **1,396** | **10** |

There are also 77 evidence records, 27 patch identities, one source-supported/unobserved strategy, and one public receipt.

The 55 actors comprise 31 mounts, 22 bosses, and two player characters. There are **zero organization entities**; a quest with subtype `faction` is not a faction entity. House Roberts, Kliff, a Greymanes organization, Shorthanded, Righteous Verdict, Witch's Ring, and Celestial Transference have no identity record in this snapshot. Damiane, Pet System, and Greymane Camp exist, but their names do not establish recruitment, harvesting, or political relationships.

Quest and recipe subjects hold 945 claims (67.7%). Ten entities have no direct subject claim; some are ingredients or locations referenced by other records and are not automatically useless. The other 300 have a non-catalog predicate, which does not prove useful answer coverage. Legacy `catalog-only` tags were not treated as an authoritative empty-record measure.

Only 44 of 176 registered predicates are used. There are 109 entity-valued claim edges touching 64 entities: 73 `relation.crafted_from`, 18 `relation.required_for`, 14 `relation.located_at`, three `recipe.output`, and one `relation.obtained_from`. The 140 `quest.sequence` assertions are not entity-valued graph edges. There are no `quest.prerequisite` or organization-role/member/location assertions.

No reliable denominator for all Crimson Desert knowledge exists in this analysis. The old private catalog is not an exhaustive target.

## Evidence and freshness

| Measure | Count |
| --- | ---: |
| Claims labeled inferred / official | 1,349 / 47 |
| Historical / intended behavior | 1,347 / 49 |
| Explicit disputed / stale status | 0 / 0 |
| Unknown typed objects | 3 |
| No recorded `reviewed_through_patch` | 1,342 |
| Reviewed through 1.05.00 / 1.09.00 / 1.13.01 | 1 / 5 / 30 |
| Reviewed through 1.14.00 | 18 |
| Claims with one / two evidence links | 1,395 / 1 |
| Official-source / community-guide evidence | 28 / 49 |
| Partial / identity-only patch records | 12 / 15 |

Thus 1,378 claims lack a review boundary reaching 1.14.00. This is **review debt**, not a finding that they are false or changed. No claim reaches current 2.01.00. Guide evidence remains tier `unverified`; resolved licensing is not factual verification. Multiple citations alone do not prove independence. Zero explicit stale/disputed labels does not mean universal freshness or consensus.

### Official patch index, checked September 10

The [2.01.00 notice](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=128), dated September 4, 2026, 04:20 UTC, is the latest patch displayed in the inspected official update index and lists availability on all named platforms. Pywel stops at 1.14.00.

The [official Updates index](https://crimsondesert.pearlabyss.com/en-US/News/Notice?_categoryNo=2), pages 1–4, exposes 14 later missing version labels:

`1.15.00`, `1.16.00`, `1.16.01`, `1.16.02`, `1.16.03`, `1.16.04`, `1.17.00`, `1.18.00`, `1.18.01`, `1.18.02`, `2.00.00`, `2.00.01`, `2.00.02`, `2.01.00`.

Older missing labels are `1.00.03`, `1.00.04`, and `1.02.00`. The index has separate Mac Steam and PlayStation 1.00.04 notices: a version string does not exhaust platform/revision identity. This is index reconciliation, not complete patch-content review. Indexing these patches must not advance unrelated claim reviews.

## Frozen question results

Sixteen exploratory user questions and four published-contract controls were fixed before corpus inspection. The selection is deliberately gap-focused and weighted toward the proposed pilot, not random, exhaustive, or statistically representative.

Q01–Q16 use explicit patch `1.14.00`, platform `all`, locale `en-US`, spoiler ceiling `quest_major`, and full core packets. This avoids counting spoiler-hidden quest facts as absent. The four controls use spoiler `none`; patches are shown where different. Platform `all` is a union, not universal applicability.

| ID | Query | Core state | Assessment |
| --- | --- | --- | --- |
| Q01 | What is House Roberts? | partial | Off-target House of Healing catalog summary. |
| Q02 | Who leads House Roberts? | partial | No supported claim; leader knowledge absent. |
| Q03 | Where is House Roberts based? | supported | **Wrong subject:** House of Healing entry route. |
| Q04 | Which factions are rivals of House Roberts? | partial | No supported rivalry claim. |
| Q05 | Which quests belong to House Roberts? | partial | No supported quest-membership claim. |
| Q06 | What unlocks the quest Shorthanded? | unknown | Shorthanded and its prerequisite are absent. |
| Q07 | Where can I get the Righteous Verdict weapon? | partial | Off-target bows-reference-book/shop and quest objectives. |
| Q08 | What does the Witch's Ring do? | unknown | Entity and requested effect absent. |
| Q09 | What does Celestial Transference do? | unknown | Spirit Transference is not a supported substitute. |
| Q10 | What is the maximum movement speed level? | partial | Haste I effect, not the requested numeric cap. |
| Q11 | How do Hernand bonds work? | partial | No supported bond-mechanics claim. |
| Q12 | Can pets harvest large animal carcasses? | partial | Pet System exists, but the behavior is unsupported. |
| Q13 | How do I recruit Damiane? | partial | Two Damiane claims do not establish recruitment. |
| Q14 | How do I unlock housing? | unknown | No housing-unlock fact. |
| Q15 | What is the relationship between Kliff and the Greymanes? | partial | Off-target Grey Dye category. |
| Q16 | What changed in the latest indexed patch? | unknown | Routing/intent gap; dedicated patch data is not empty. |
| Q17 | Can controller inputs be remapped? [1.09.00] | supported | Expected historical publisher-intent control. |
| Q18 | Can controller inputs be remapped? [1.14.00] | partial | Expected claim-review gap. |
| Q19 | Can controller inputs be remapped? [9.99.00] | unknown | Expected unknown-patch control. |
| Q20 | Is Axiom Bracelet an item? | unknown | Expected predicate/classification boundary. |

Raw states: two supported, 11 partial, seven unknown. The four documented answer-state controls met expectations. None of the 16 gap-focused user questions was completely answered on topic. Five emitted off-target summary/facts, including one false supported result; eleven abstained or exposed a gap. An unrelated fact is not partial credit. Do not turn this deliberately selected sample into a whole-product accuracy percentage.

### Reproducible high-priority defect

```text
query: Where is House Roberts based?
patch: 1.14.00
platform: all
locale: en-US
spoilerCeiling: quest_major
```

House Roberts has no entity record. The core nevertheless returns `supported` with `clm_c26a38f457062d1e0f6d5805`, subject **St. Halssius's House of Healing**, predicate `location.route`. The claim concerns an outfit/visitor-pass entry state, not House Roberts' base.

Supplemental query `Where is House ExampleNotInPywel based?` reproduces this wrong-subject support with the same context. Default spoiler `none` correctly returns unknown for Roberts, as does unindexed patch 2.01.00; the defect is not asserted for every context.

[Source inspection](https://github.com/RolandSaint/pywel/blob/b6d6c0b455273bc3ecb9bf00427156827939dc03/src/core/query.ts#L1115-L1250) suggests the no-explicit-anchor lexical fallback can qualify unrelated subjects. Predicate and freshness matching then do not repair the subject mismatch. This is a source-grounded diagnosis, not an implemented fix. Preserve exploratory search, but never let search relevance alone establish answer support.

The other supplemental probes, selected after inventory and excluded from baseline scoring, found that an explicit Creamy Meat Soup definition also returns Meatball Soup, and an ingredient question returns scroll-learning requirements rather than recipe inputs. An explicit 1.14.00 patch-history question remains unknown, while static application of the dedicated patch-bundle filter finds one claim. The REST endpoint itself was not executed here.

Until repaired, inspect exact IDs, typed claims and evidence rather than trusting natural-language answer state alone.

## Ranked gaps and acceptance criteria

| Priority | Gap | Bounded next action and finish line |
| --- | --- | --- |
| G01 / P0 | Subject and requested-fact grounding | Reproduce under pinned runtime; fix Q03/fabricated-name substitution and inspect Q01/Q07/Q10/Q15 plus recipe diagnostics. Absent names must not borrow unrelated facts. Preserve the four controls. No data wave needed. |
| G02 / P1 | Patch identities and review debt | Reconcile 14 newer and three older missing version labels, preserving platform identity. Review only named affected assertions; no bulk freshness promotion. |
| G03 / P1 | House Roberts / faction graph | Inspect admissible sources, then add a fixed set of identity, role, location and member facts. Organization presence must become useful relationships, not names alone. |
| G04 / P1 | Quest prerequisites | Select named pilot quests; distinguish order from true unlock prerequisites and use stable IDs where supported. No full-catalog import. |
| G05 / P1 | Equipment acquisition/effects | Select a few evidence-backed gear questions. The correct item, effect or acquisition requirement must be returned. |
| G06 / P1 | Abilities and stat limits | Establish exact mechanics, conditions and numeric limits for a small question set; do not conflate similar names or effects with caps. |
| G07 / P2 | Economy / bonds | Research a bounded public-source bank/bond batch. A quest named A Bond is not investment evidence. No personal finance data. |
| G08 / P2 | Pets, housing, companion unlocks | One narrowly defined system question per batch, separating entity existence from behavioral support. |
| G09 / P2 | Existing recipe utility | Use the existing 46 recipes/464 claims to prove correct entity and ingredient retrieval after G01. Do not add data to mask a retrieval defect. |
| G10 / P2 | No-install access and task routing | Test existing public files and exact-ID/patch operations first. Raw-file reading, local tools and remote tools are different experiences. No invented hosted endpoint. |

These priorities are explicit judgments, not measured audience-frequency scores.

## First-wave specification

**Next task: G01 repair on the frozen corpus, before content promotion.** Reproduce in the pinned environment, add focused regression cases, fix only the demonstrated grounding/intent problem, and rerun existing controls and required checks. Do not change schemas, add a model, or rebuild the architecture to solve absent-name abstention.

**House Roberts is a conditional research pilot, not ingestion-ready.** Existing predicates include `organization.role`, `organization.location`, `organization.member`, `actor.role` and `quest.prerequisite`. Membership is not leadership, sequence is not a prerequisite, and required-for is not rivalry. Any necessary leader/rival/quest-membership vocabulary addition needs a small reviewed compatibility proposal, not semantic relabeling or a generic framework.

Source discovery found [CrimsonWiki terms](https://crimsonwiki.org/terms), a [Factions guide](https://crimsonwiki.org/wiki/factions-guide), and its [history](https://crimsonwiki.org/wiki/factions-guide/history). Terms describe community CC BY-SA contributions separately from game IP, but the substantive guide body was not recovered in this browser. Metadata and licensing cannot establish Roberts facts. PC Gamer's [Excavatron](https://www.pcgamer.com/games/action/crimson-desert-marnies-excavatron-boss-guide/) and [Crimson Nightmare](https://www.pcgamer.com/games/action/crimson-desert-crimson-nightmare-boss-guide/) author guides supply historical discovery leads, not newly approved canonical rights dispositions or current-patch confirmations. The previously suggested Game8 page was not retrievable. Earlier conversational descriptions are not evidence.

After the repair, freeze eight pilot questions: organization identity, role, location, verified members, support for a specific leader, named quest associations, prerequisites for one selected quest, and a connection to one named place or encounter. Add rivalry only if evidence and vocabulary justify it. Proposed context is PC Steam, en-US, spoilers up to quest_major, with a September 10 evidence cutoff. Current evaluation targets 2.01.00 only when claim-level evidence supports it; otherwise retain historical/unknown applicability. Fetch date is not proof of patch review.

Before implementation, inspect substantive source text, precise locators, rights/attribution, IDs and context. Approve the must-improve subset based on actual support. Unknowns remain gaps, not completed additions. Scope/manifest changes require review; keep the v1.0.0 tag unchanged.

## Fill-work and completion boundary

There is one narrow corrective task, then a finite pilot, then substantial continuing knowledge and review work. Exact future claim totals and hours cannot be responsibly estimated from counts alone; measure source availability and verification effort in the pilot. Preserve existing useful quest/recipe records and fix retrieval rather than bulk replacing them.

M6 supplies an exact inventory, evidence/freshness analysis, twenty executed core queries, supplemental diagnostics, ten prioritized gaps, source leads, and a bounded next action. Full machine-readable measurements and raw query packets accompany the session evidence download. This documentation checkpoint does not claim pinned-runtime validation, maintainer acceptance, an implemented repair, or readiness to ingest the pilot.

Retain the engineering order: question requirements, delete unnecessary parts, simplify the surviving path, accelerate, automate last. Delete machinery aggressively; preserve supported knowledge, uncertainty and safeguards.
