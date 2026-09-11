# R01 — Database-backed equipment reconciliation

Owner-authorized follow-up to M9, limited to the existing Righteous Verdict and Witch's Ring identities. Base: `005dc4f77ef77be39c6f84d742821854137c0900`. [PR #10](https://github.com/RolandSaint/pywel/pull/10) records the checked head, review, integration and main CI. This document does not itself certify a merge or release. Evidence cutoff is September 10, 2026 America/Chicago; capture timestamps may fall on September 11 UTC.

## Bounded result

Twelve additional claim records, three evidence records and one receipt; no new entities. Counts become **320 entities / 1,447 stored claims / 88 evidence records / 27 patch identities / one strategy / five receipts**. Stored claims include three superseded summaries; counts are not a number of independent observations. The old records, old receipt bindings and initial release manifest remain unchanged.

Eight claims retain one selected database field at a named refinement, three retain bounded seller/quest catalog links, and one is a typed unknown concerning the stamina field. This is a source-qualified reconciliation, not another twelve new game subjects or a complete equipment database.

| Existing subject | Selected refinement rows | Acquisition result |
| --- | --- | --- |
| Righteous Verdict | Attack and Critical Rate at +5 and +10, with socket bonuses kept separate. | Original field route preserved; database-listed Kathor seller added with unverified stock/unlock/current-availability limits. |
| Witch's Ring | Attack and Attack Speed at +5 and +10. | Original guide route preserved; named database quest linkage and Areciel seller added without exclusivity or live-stock claims. |

The field `Stamina_UseResourceIncreaseRate` is displayed with a Regen label and +6% at +10 on gaming.tools. Its gameplay meaning is not established merely by that interface. The earlier guide reports regeneration; R01 preserves both source contexts but does not choose regeneration, consumption reduction or a numeric gameplay bonus. The replacement is a typed unknown and stays visible with the useful known fields. This is an improved uncertainty record, not a filled positive mechanics answer.

## Exact evidence and comparison

| Evidence | Public page and inspected fields |
| --- | --- |
| `evd_r01crimsondbsword0001` | [CrimsonDB Righteous Verdict](https://crimsondb.gg/weapons/righteous-verdict): selected +5/+10 refinement fields, Sockets and Sold By. Header displayed v1.17.00. |
| `evd_r01toolssword0001` | [gaming.tools Righteous Verdict](https://crimsondesert.gaming.tools/items/caliburn_twohandsword): the same selected refinement fields, separate socket section and seller listing. Page displayed 2.0.0 / August 25, 2026. |
| `evd_r01toolsring0001` | [gaming.tools Witch's Ring](https://crimsondesert.gaming.tools/items/abyssreward_eastwitch_ring): selected +5/+10 fields, Buffs, Sources and Sold By. Same displayed version/date. |

The linked [Areciel inventory](https://crimsondesert.gaming.tools/people/nhw_unique_power_witch_store) and [Unwavering Steps page](https://crimsondesert.gaming.tools/main-quests/goblin_master_doo_oldkliff_abyss) were consulted as same-site cross-checks, not independent corroboration. Their other inventory, prices, narrative and rewards were not imported. Each canonical assertion is supported by the enumerated item-page evidence.

The numeric sword fields agree across the two inspected databases, but unknown upstream independence is deliberately represented by one shared reliability group. Database format does not establish observation. The gaming.tools weapon heading says one-handed while other identifiers/sources indicate a two-handed sword; that category label is not imported. The source's crafting sections are not normalized into a new recipe or a guaranteed accessible route: entry visibility alone does not establish materials, unlock gates or live availability. No full refinement table, upgrade costs or image assets are copied.

CrimsonWiki terms and a relevant chapter search were also checked. An open licence is not evidence that every entry is reliable; no additional CrimsonWiki gameplay claims were adopted for these two items. The wider survey remains in [DATABASE_SOURCES](DATABASE_SOURCES.md).

## Reconciliation rather than deletion

Three replacements use existing `supersedes_claim_ids`:

- `clm_r01swordcritical05` replaces the default use of `clm_m8bswordcrit2026091001`: a labelled database row is no longer conflated with the guide's equipped example. The old example is retained, not declared a disproven observation.
- `clm_r01ringspeed10` replaces `clm_m8bringspeed2026091001` with a named refinement. It does not establish which exact setup the guide used.
- `clm_r01ringstaminameaning` replaces `clm_m8bringstamina2026091001` with the source-meaning gap instead of assuming the field is regeneration.

These are editorial supersessions within the same conservative historical context, not claims that a game patch changed the item. Null patch/review bounds remain null; no site-wide version label is promoted to claim review. The inherited PC-Steam restriction is scope, not proof of observed Steam behavior. Other named platform contexts withhold these additions. The quest source is `quest_major`; shared effect evidence does not repeat story-specific names.

M8B snapshot tests still exercise its retained records after excluding R01 claims. Separate R01 tests exercise current supersession, values, uncertainty, acquisition, platform/spoiler restrictions and full/compact REST versus a real stdio MCP process. Current protocol integration is not run against an artificially frozen server.

## Raw public files and history

M9's sample routes now include both the old equipment catalog and R01's replacement catalog/evidence. Raw example counts deliberately include superseded records; they are not current-answer counts. The standalone smoke emits supersession links and verifies that both prior and replacement records remain resolvable. It does not implement a second context-aware query engine. Before presenting raw records, consumers must inspect replacement status and validity; use the reference adapters for exact answer-state semantics. A superseded row is not a second current assertion or a new source conflict.

The existing anonymous HTTPS, byte/file budgets, digest-tamper checks and all canonical integrity safeguards remain in place. There is no new runtime, schema, vocabulary, dependency, workflow, server, scraper or database. Refinement qualifiers remain explicit in existing summary claims rather than inventing unsupported unqualified numeric-stat records or new schema fields.

## Rights and verification

The source-specific decisions cover only selected, independently expressed factual fields and necessary labels. The sites' public readability and copyright notices are not a bulk-data licence. The [Copyright Office distinction](https://www.copyright.gov/what-is-copyright/) informs the existing limited-extraction policy; it does not clear every fictional-world, contractual, database or downstream commercial use. Underlying game IP is excluded from Pywel's licence. Retain [central attribution](../LICENSES/THIRD-PARTY-DATA.md), evidence and [DATA_RIGHTS](../DATA_RIGHTS.md). No complete table, source prose, media, game-file dump or private data was introduced.

Tests were committed before data at `de9cd2dda2581340199e9f97f0322cb2b1c1f770`. Final acceptance requires the exact candidate and post-merge main to pass pinned Node 24.18.0 checks, provenance/addition validation, type checking, full tests, source-bound build and reproducibility. PR #10 records actual results and any corrections; no green result is inferred from these instructions.

The v1.0.0 tag and artifacts remain untouched. This source update is not M10 release authorization. After R01 integration, propose one bounded next step and obtain owner approval before starting it.
