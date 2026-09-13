# Pywel Knowledge Standard

Unofficial, portable, machine-readable Crimson Desert knowledge for AI agents.

Pywel stores atomic claims with stable identities, evidence, uncertainty, and game-version context. Its finite reference dataset can be consumed as offline JSON/JSONL or through a small local read-only REST or stdio MCP implementation. Required operation uses no model, cloud account, database, hosted service, or personal configuration.

> Pywel is not created, endorsed, or operated by Pearl Abyss. Crimson Desert and third-party materials remain subject to their respective rights.

## Read without installing Pywel

An HTTP-capable or GitHub-connected agent can start at [AGENT_START.md](https://github.com/RolandSaint/pywel/blob/main/AGENT_START.md), pin one commit, and retrieve selected canonical JSON and evidence directly. No clone, npm install, Pywel server or owner PC is required. The [sample routes](https://github.com/RolandSaint/pywel/blob/main/examples/public-read.json) are not a complete corpus index, and raw files are not context- or spoiler-filtered. This is public-file access, **not hosted REST or remote MCP**. See [M9's verification limits](https://github.com/RolandSaint/pywel/blob/main/docs/M9_NO_INSTALL.md). The [database-source survey](https://github.com/RolandSaint/pywel/blob/main/docs/DATABASE_SOURCES.md) records the database-first research direction without importing new facts. These online discovery links also work from a copied offline README; resolve a commit before consuming records, rather than mixing mutable main files with that bundle's identity.

## Pywel 1.0.0

**Pywel software 1.0.0 begins with the verified clean source snapshot accepted at [M5](docs/M5_COMPLETION.md), with reviewed publication-only documentation and CI changes.** M0–M5 are complete for their recorded scope. See [the scope](docs/RELEASE_SCOPE.md), [milestones](docs/ROADMAP_TO_1_0.md), [M1 evidence](docs/M1_COMPLETION.md), [M2 evidence](docs/M2_COMPLETION.md), [M3 evidence](docs/M3_COMPLETION.md), and [M4 evidence](docs/M4_COMPLETION.md).

The original source manifest `quality/public-release-scope.json` retains **310 entities, 1,396 claims, 77 evidence records, 27 patch identities, one strategy, and one safe receipt**. Patch coverage ends at historical indexed version **1.14.00**. This is not current-live-game coverage, and the original release requires no additional content wave.

[This GitHub repository](https://github.com/RolandSaint/pywel) is the ongoing source of truth. Its history begins with the clean Pywel 1.0.0 source; the original private development history, refs, releases, assets, and local configuration are excluded and remain private. Use the `v1.0.0` tag and [release notes](https://github.com/RolandSaint/pywel/releases/tag/v1.0.0) for the public commit, artifact identities, checksums, and publication verification. Historical milestone records preserve the scope and limits of the earlier reviews.

## Post-release source

The [M7 House Roberts pilot](docs/M7_HOUSE_ROBERTS.md) added eight identities, 17 historical claims, two attributed guide sources and a receipt. Its integrated snapshot contained 318 entities, 1,413 claims and 79 evidence records. Seven named questions gained historical information; leadership and current-patch confirmation remained gaps. The four retained faction-quest associations are not a complete roster.

[M8A](docs/M8A_PROGRESSION.md) added selected start/unlock and reward information for those same four quests: **13 claim records, three attributed guide sources and one receipt, with no new entities or runtime changes**. Its integrated snapshot contained **318 entities, 1,426 claims, 82 evidence records, 27 patches, one strategy and three receipts**. Six of its eight questions gained positive historical facts, one got an explicit reward-coverage gap, and the existing Count's Honor prerequisite was preserved. The no-direct-item report for Sealed in Stone is a typed unknown, not a reward item. Two encounter drops are attached to the existing Excavatron actor rather than to the quest. Knowledge rewards, complete unlock conditions and current-build verification are not claimed. Named console/Epic contexts withhold the PC-Steam-scoped additions; that scope is not independently observed Steam gameplay.

[M8B](docs/M8B_EQUIPMENT.md) added **two equipment identities, nine qualified historical claims, three guide sources and one receipt** for Righteous Verdict and Witch's Ring. Its integrated snapshot contained **320 entities, 1,435 claims, 85 evidence records, 27 patches, one strategy and four receipts**. Four acquisition/effect questions gained source-linked partial answers. Setup-dependent values were not treated as intrinsic or current stats; the ring's stamina-bonus magnitude remained unresolved.

[R01 database reconciliation](https://github.com/RolandSaint/pywel/blob/main/docs/R01_DATABASE_RECONCILIATION.md) adds **12 qualified records, three public database sources and one receipt**, with no new entities. The R01 snapshot contained **320 entities, 1,447 stored claims, 88 evidence records, 27 patches, one strategy and five receipts**. Selected +5/+10 fields and seller/quest listings improve the same two items. Three earlier summaries are superseded but retained. The ring's stamina field is a typed meaning-unknown, not a verified regeneration percentage. Database labels, stock and site versions are not independent gameplay or patch confirmation. The conservative PC-Steam and null claim-review boundaries remain. Raw public-file examples include the replacement catalogs and retained history; inspect supersession metadata before presenting a claim.

`quality/corpus-additions.json` records the reviewed additions separately from the unchanged initial manifest and prior canonical records. The vocabulary remains registry 14, including M7's `quest.organization`. Record/response/API/codebook layouts are unchanged; source/build identities change. See [compatibility](docs/COMPATIBILITY.md), [M8B source and attribution notes](docs/M8B_EQUIPMENT.md), and each PR's integration evidence.

Milestone integration is not a new GitHub Release. The v1.0.0 tag and its assets do not contain G01, M7, M8A, M8B, M9 or R01. To consume post-release main, replace `--branch v1.0.0` with `--branch main` below, record `git rev-parse HEAD`, and run the same checks on that exact checkout. Do not mix its data or build identity with older release artifacts.

## First expansion release

[M10](https://github.com/RolandSaint/pywel/blob/main/docs/M10_RELEASE_CANDIDATE.md) froze the completed content wave and prepared **`expansion-2026.09.10.1`** as a dated source/data snapshot. It includes maintained query corrections, not just changed knowledge; package metadata remains `1.0.0`/private while the exact commit and build identify this source. The original tag is not moved. The cumulative review also corrects a rivalry question that previously substituted the faction's description; no rival facts are invented.

[PR #11](https://github.com/RolandSaint/pywel/pull/11) records the actual readiness decision, integrated commit, CI and candidate artifact checksums. The separately approved [publication](https://github.com/RolandSaint/pywel/pull/12) placed those exact source/data archives and acceptance evidence on the release. **Preparation is not publication**: later releases still require separate approval. Historical coverage, unresolved source meanings, no-install raw-file limits and all earlier rights boundaries remain. Follow the exact accepted commit and artifact identity from that record rather than assuming mutable main is the release.

## G02 patch-index catch-up

The first expansion is published as [`expansion-2026.09.10.1`](https://github.com/RolandSaint/pywel/releases/tag/expansion-2026.09.10.1). Its source and assets remain unchanged. This later source adds **17 version identities, 18 official evidence records and one receipt**: **320 entities, 1,447 claims, 106 evidence records, 44 patches, one strategy and six receipts**.

The latest indexed identity is now **2.01.00**, observed at the fixed G02 cutoff. The added patches are **identity-only**, not normalized gameplay changes. No existing claim, confidence, spoiler level, validity interval or review boundary was changed. Default patch selection follows the latest indexed identity as before; historical claims continue to report review gaps, and genuinely unindexed versions remain unknown.

[G02](docs/G02_PATCH_CATCHUP.md) and its [impact queue](quality/g02-patch-review.json) record separate storefront notices, delayed rollouts, source revisions and 13 bounded review tasks. These tasks are not accepted gameplay claims. Ordinary CI no longer packages later source under the already-published M10 label. No new release or hosted endpoint accompanies G02.

## Install, verify, and read

These commands require a complete Git working checkout. The source export is an immutable review/publication artifact; the data-only bundle contains no runtime. To prepare a separate working checkout from a verified export, follow [OPERATIONS](docs/OPERATIONS.md). Use Node **24.18.0**, as pinned in `.node-version`. These commands create a checkout of the published v1.0.0 release and run from its root:

```sh
git clone --branch v1.0.0 https://github.com/RolandSaint/pywel.git
cd pywel
npm ci --ignore-scripts --no-audit --no-fund
npm run security:audit
npm run check
npm run start
```

REST listens at `http://127.0.0.1:8787`; stop it with Ctrl-C. In another terminal:

```sh
curl http://127.0.0.1:8787/v1
curl 'http://127.0.0.1:8787/v1/search?q=Hernand'
curl 'http://127.0.0.1:8787/v1/answer?q=Is%20controller%20remapping%20available%3F&patch=9.99.00&format=full'
```

The future-patch query is a deliberate uncertainty check, not a claim about an existing patch. For MCP, have a stdio client launch `node dist/runtime/mcp/server.js` from the project root (or `npm run --silent mcp`); see [API_V1](docs/API_V1.md). Offline consumers can read `dist/data/corpus.json` or the per-family JSONL files without running a server. In a copied data-only bundle, `corpus.json` and the JSONL files are at its root; that bundle contains no installable runtime.

`npm run check` runs the supported checks; completion evidence must record their actual results. Reproducible builds and exports are checked separately where documented in [OPERATIONS](docs/OPERATIONS.md). Independent installation, correction, and restore are recorded for the named M4 candidate; [M5 acceptance](docs/M5_COMPLETION.md) records the certified source checks and the prior evidence that remains applicable. The release notes record verification of the publication source.

## Source and generated files

| Path | Role |
| --- | --- |
| `data/canonical/` | Reviewed structured knowledge and safe provenance. |
| `schemas/`, `data/vocabulary/` | Versioned structures and controlled terms. |
| `quality/public-release-scope.json` | Immutable initial dataset and publication boundary. |
| `quality/corpus-additions.json` | Explicitly reviewed post-release IDs, files and source dispositions. |
| `src/` | Validation, one builder, shared query implementation, and local adapters. |
| `dist/data/` | Generated offline corpus, JSONL, schemas, docs, licenses, manifest, and checksums. |
| `dist/runtime/` | Compiled reference implementation; validates and reads canonical source with installed dependencies. |

Generated output is disposable; never edit it by hand. [Architecture](docs/ARCHITECTURE.md), [data model](docs/DATA_MODEL.md), [operations](docs/OPERATIONS.md), and [portability](docs/PORTABILITY.md) explain the surviving path.

## Agent contract and limits

Read `GET /v1` or the MCP `pywel://service` resource for discovery, then use bounded search or exact entity/evidence lookup. Every response identifies its schema and source build. Compact v3 answers retain typed facts and validity; full answers add detail with explicit selection limits. Use `GET /v1/codebook` or `pywel://codebook` to decode tuples. Retrieval accepts `en-US`; omitted spoiler context stays `none`, and platform `all` returns a union of platform records. Inspect the specific support, review boundary, warnings, and gaps. A related entity match, official patch identity, or integrity receipt cannot establish the requested gameplay fact.

The frozen M3 contract defines 16 REST operations, nine MCP tools, and shared typed response bodies. [API_V1](docs/API_V1.md), [OpenAPI](openapi/openapi.json), [response schemas](schemas/agent-contract.schema.json), and [compatibility rules](docs/COMPATIBILITY.md) describe the contract. Software 1.0.0 retains that contract; M3 conformance and M4 independent operation support the final M5 acceptance. HTTP MCP, SQLite, public writes, hosted services, models, queues, capture tooling, containers, and generated human pages are outside the supported path.

## Contributions, rights, and security

Use reviewed Git proposals following [CONTRIBUTING](CONTRIBUTING.md). Keep changes atomic and supported by public evidence, appropriate context, rights, and attribution. Commit and push coherent changes incrementally; milestone completion includes review, integration and passing required checks on main unless explicitly scoped otherwise.

Software is Apache-2.0 under [LICENSE](LICENSE). Original database contributions and compatible adaptations use CC BY-SA 4.0 only within [LICENSE-DATA](LICENSE-DATA) and [DATA_RIGHTS](DATA_RIGHTS.md); third-party game IP and guide expression are excluded from that grant. See [attribution](LICENSES/THIRD-PARTY-DATA.md), [M8A attribution](docs/M8A_PROGRESSION.md#sources-and-attribution), [SOURCE_POLICY](docs/SOURCE_POLICY.md), and [SECURITY](SECURITY.md).

Never add personal state, conversations, private paths, credentials, copied source bodies, game assets, saves, leaks, or unauthorized extraction output. No personal-system access, live deployment, paid service, or publication is necessary to operate the project.


## S01 equipment population

[S01](docs/S01_EQUIPMENT_POPULATION.md) adds 200 equipment identities (80 weapons, 80 armor, 40 accessories), 1,144 source-qualified claims, 200 item-page evidence records and one receipt. The integrated S01 snapshot contained **520 entities, 2,591 stored claims, 306 evidence records, 44 patch identities, one strategy and seven receipts**. The new claims comprise 729 selected +5/+10 stat cells, 400 classification claims, 14 acquisition listings and one existing-quest link. They are historical secondary-source reports, not complete loadout effects, guaranteed stock or current-build observations. All earlier canonical records and both published releases are unchanged. No new release is created by this source update.

## S02 acquisition depth — intake blocked

[S02](docs/S02_ACQUISITION.md) is **not complete or accepted**. Its merged 245 claims, 103 evidence records and one receipt were admitted after automated source collection without the recorded authorization required by AGENTS.md. The exact S02 admission is withdrawn from current canonical source pending documented permission or genuinely permitted replacement sourcing; it has not been relabeled as manual or independently re-sourced.

The S02 containment checkpoint retained **520 entities, 2,591 stored claims, 306 evidence records, 44 patch identities, one strategy and seven receipts**. All pre-S02 canonical files and both published releases remain unchanged. The 100 affected equipment identities and their earlier stats remain available, but their S02 acquisition answers are withheld. S01 acquisition coverage is again **12 of 200**, with **188 gaps**, not 188 unobtainable items.

The [S02 recovery record](https://github.com/RolandSaint/pywel/blob/main/quality/s02-acquisition-review.json) preserves existing subject IDs, source-file hashes and historical commit references without republishing withdrawn field payloads. Historical commits are not erased. The original permission blocker remains open; containment and passing checks do not establish source permission or complete S02.

## S03 recipe input normalization

[S03](docs/S03_RECIPE_INPUTS.md) adds **25 ingredient identities and 36 typed relationship records**, plus one receipt, by normalizing already-retained cooking and alchemy evidence. The integrated S03 snapshot contained **545 entities, 2,627 stored claims, 306 evidence records, 44 patch identities, one strategy and eight receipts**. No additional source was collected or contacted. Both published releases remain unchanged; this is a post-release source update, not a new release.

The batch reviews 161 input assertions across 46 existing recipes. It preserves 68 valid ingredient links and supplies 34 new or corrected links, giving suitable typed targets for 102 input occurrences. Nine ambiguous labels across 59 occurrences remain text-only. Sixteen recipes gain or correct links; the other 30 are not populated redundantly. Original quantity strings and all 68 earlier canonical files remain unchanged.

Boiled Meat and Meat and Fish Skewers now have distinct food-item identities, two recipe-output links, and corrected ingredient links from Meatball Soup; superseded links remain in history. Existing evidence dates, attribution, historical uncertainty and null patch-review bounds are preserved. The [G03 correction](docs/S03_RECIPE_INPUTS.md#recipe-and-item-name-resolution-g03-correction) makes ingredient-only answers prefer the matched recipe over a same-named item, including Wine and Haiden's Lesser Elixir; search and exact-ID reads still preserve both identities. Other intents and compound requests retain their prior routing. S02 remains withheld. [PR #18](https://github.com/RolandSaint/pywel/pull/18) records the actual reviewed head, integration commit and required checks; source admission alone is not proof that integration passed.

## S04 recipe output normalization

[S04](docs/S04_RECIPE_OUTPUTS.md) adds **41 named output-item identities and 41 typed recipe-output links**, using retained evidence only. Five already-linked outputs are reused unchanged. All **46 recipes** in the S03 cohort now have a typed output target; this is not a count of every recipe in the game. The integrated S04 snapshot contained **586 entities, 2,668 stored claims, 306 evidence records, 44 patch identities, one strategy and nine receipts**.

The 48 prior output assertions, all ingredient quantities, and all 71 earlier canonical files retain their exact bytes. New identities use the generic item subtype rather than guessing effects or inventory classifications. Recipe and output IDs remain separate. The existing G03 ingredient resolver and exact-ID graph/claim reads remain unchanged; all 46 ingredient answers are regression-tested against the prior corpus.

This is structured expansion of existing historical knowledge, not new source collection or live-game verification. Existing attribution, capture dates, uncertainty and null patch-review bounds remain. S02 is still withheld, and neither published release changes. [PR #20](https://github.com/RolandSaint/pywel/pull/20) records the actual review, checked head, integration commit and post-merge checks.


## S05 quest reward links: current source

[S05](docs/S05_QUEST_REWARDS.md) adds **12 typed reward links across 10 existing quests**, reusing existing item identities and seven retained CrimsonWiki sources. It adds one receipt, no entities, no evidence, and no prerequisites. Current source totals are **586 entities, 2,680 stored claims, 306 evidence records, 44 patch identities, one strategy and ten receipts**. All 74 earlier canonical files, original reward strings and quantities remain unchanged.

Palmar Pill and Honey Tea link to items, not same-named recipes. Text and typed records describe the same reward; do not sum them or count them as independent evidence. Of 65 audited reward assertions, 53 remain without a new typed link because an exact eligible item or unconditional item meaning is not established. Two existing prerequisite links are preserved; the two remaining prerequisite statements do not gain invented dependencies. Historical uncertainty, source dates, spoiler limits and S02 withholding remain. [Issue #21](https://github.com/RolandSaint/pywel/issues/21) and its linked PR record actual review, integration and verification. No new collection, outreach, release or deployment accompanies this source batch.
