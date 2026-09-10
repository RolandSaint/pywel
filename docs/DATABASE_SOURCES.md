# Database-first source survey

Inspected September 10, 2026. This is source discovery and a research-order correction, not a bulk import, source allowlist or gameplay certification. M9 changes no canonical facts. The original corpus already includes licensed CrimsonWiki-derived records; M7/M8A/M8B leaned on individual guides. Public databases deserve a first-class role in subsequent systematic coverage work.

## Research order

For inventories, IDs, refinement tables, prerequisites and structured relationships, inspect relevant databases/wikis and any documented permitted exports before settling for guide-only searches. Use official publications for publisher intent and version changes; use public reproducible observations to establish tested behavior. Guides remain useful for navigation, procedural context and cross-checking. A database label does not automatically establish correctness, freshness or independence, and a news/guide label does not automatically disqualify evidence.

Separate **publicly readable**, **openly licensed for reuse**, and **documented API/export access**. Prefer clearly licensed data when available. For other public databases, individual factual consultation and any proposed retained records require the same exact source/attribution review as guides; absence of an open licence is not a finding that every factual reference is forbidden. Bulk database copying, game assets, extracted game-file dumps, or undocumented collection require their own rights/provenance decision. Do not install an extractor or infer that an open-source tool's code licence licenses the data it processes.

## Sources actually inspected

| Source | Useful structure inspected | Reuse/access finding and next use |
| --- | --- | --- |
| [CrimsonWiki](https://crimsonwiki.org/terms) | Community wiki categories and current terms. Existing Pywel evidence already identifies licensed normalized projections. | Terms state CC BY-SA 4.0 for community contributions, separately reserving game-related IP. Prefer eligible attributed contributions. No bulk export or public API was verified in this survey. |
| [CrimsonDB](https://crimsondb.gg/weapons/righteous-verdict) | Righteous Verdict page exposes refinement rows, socket names, crafting and vendor sections. Site header displays 1.17.00. | No dataset redistribution grant or documented bulk API/export was located on the inspected page/home page. Strong per-record comparison candidate; do not import its whole table/database merely because it is readable. Site-wide version display is not claim-level confirmation. |
| [gaming.tools](https://crimsondesert.gaming.tools/items/abyssreward_eastwitch_ring) | Witch's Ring has refinement-specific stats, internal effect labels, quest source, crafting and vendor sections; page displays version 2.0.0 and August 25, 2026 update. | Copyright/game-IP notices and data-recovery credit are visible; no open-data grant or documented bulk API/export was established. Compare fields and their meanings with source context. The visible For Websites label does not establish an API or data-reuse licence. |
| [Greymane Codex](https://crimsondesert.co/) | Wiki, recipes, map and guides; [terms](https://crimsondesert.co/terms-of-use) inspected. | Free to browse is explicit. The content-submission licence grants rights to the site, not automatically to Pywel. No public dataset reuse grant/export was verified. Home-page counters differed between parsed views, so no inventory count is treated as a denominator. |
| [crimsondesert.app](https://www.crimsondesert.app/en/about) | Wiki database, recipe calculator and map described by its own About page. | Game content/assets remain reserved. The CC BY 3.0 credit applies to specified icons, not the entire database. No bulk dataset licence/export was verified. Use as a further source-discovery candidate; do not import its extracted map tiles. |

The [CrimsonDesertDB](https://crimsondesertdb.com/en) landing page was also inspected as a separate discovery lead. Similar names, layouts, counts or matching values do not establish that sites are independent or share a permissible upstream dataset. It was not audited record by record. Other databases may exist; this list is not exhaustive.

## Immediate reconciliation opportunities

The two already-indexed equipment subjects give us a finite next comparison. Database refinement tables may resolve ambiguities that summary guides left open, and database acquisition fields may reveal alternatives to a guide's route. Compare the same item identity, refinement level, socket/setup state, source version and platform context before reconciling differences. In particular, preserve the raw meaning of internal effect labels rather than automatically interpreting every percentage as stamina regeneration.

This survey does **not** silently change M8B's source-qualified historical claims, adopt new numeric values, declare a new acquisition route verified, or advance review bounds. Record-level evidence and an approved content change remain necessary. A claim from multiple sites sharing an extraction/upstream dataset is not multiple independent observations. Use the existing predicates and validation; no crawler, ingestion framework, database or hosted service is proposed here.

## Supporting policies

Read [SOURCE_POLICY](SOURCE_POLICY.md), [DATA_RIGHTS](../DATA_RIGHTS.md), and exact per-source dispositions in `quality/corpus-additions.json`. The [CrimsonWiki terms](https://crimsonwiki.org/terms), [Greymane Codex terms](https://crimsondesert.co/terms-of-use), and the inspected sites' own legal notices are the source of the bounded findings above. This is not independent legal clearance. Retain original factual phrasing, precise locators and attribution, not copied game descriptions, article bodies, media or wholesale databases.
