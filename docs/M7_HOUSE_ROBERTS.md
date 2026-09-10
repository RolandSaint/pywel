# M7 — House Roberts historical knowledge pilot

M7 is a bounded post-release knowledge update, not a replacement certification of v1.0.0. Its accepted commit, reviewed diff, CI results and post-merge verification are recorded in the M7 pull request in [the public repository](https://github.com/RolandSaint/pywel/pulls). Completion requires reviewed integration and passing checks on the resulting main commit; a branch candidate alone is not complete.

Base revision: `21e2a67614eb79cdc266a2b094ab74979314c943`, containing the accepted M6 baseline and G01 repair. The original `v1.0.0` tag remains unchanged. No release, hosting, new transport, database, model, dependency, or personal-system integration accompanies this milestone.

## Scope and result contract

Eight pilot questions were selected from the M6 subject, location, quest-association, prerequisite and leadership gaps. Seven have newly available, source-qualified historical information. Leadership remains unsupported and is not counted as a filled gap.

The evaluation context is explicit patch `1.14.00`, platform `pc-steam`, locale `en-US`, spoiler ceiling `quest_major`. This is a comparison context, not a finding that the new guide claims have been verified for that game build. All new claims are `inferred` / `historical`, with null patch and review bounds. Positive answers must remain `partial` with a claim-review gap. Querying unindexed `2.01.00` must remain `unknown`, not silently fall back to the historical patch.

All 17 added claims are conservatively scoped to `platforms: ["pc-steam"]`, the selected pilot target, rather than the universal `all` wildcard. This restriction does not claim an independently observed Steam build: the guide-derived behavior and patch bounds remain explicitly unverified. Named PlayStation and Xbox requests receive no M7 claims; extending platform applicability requires new review. A query with platform `all` still returns the existing union of applicable records and does not convert their recorded PC-Steam scope into universal coverage.

| Question | Retained historical information | Required boundary |
| --- | --- | --- |
| What is House Roberts? | A faction associated with Hernand. | Role claim, not inferred wealth, ancestry or a complete political history. |
| Where is House Roberts? | Hernand association. | Not proof of a headquarters, territorial control or ownership. |
| Where is Count Roberts? | Bluemont Manor. | Quest-contact location, not proof of leadership or a full personal identity. |
| Which quests belong to House Roberts? | First Trial of Trust, Stolen Quarry, Sealed in Stone and The Count's Honor. | Four retained associations, not an exhaustive quest list. |
| What are the prerequisites for The Count's Honor? | Sealed in Stone must be completed first according to the guide. | A documented prerequisite, not every possible condition or current-build verification. |
| Where is Stolen Quarry? | Karin Quarry. | Quest location from a historical guide. |
| What are the objectives of Stolen Quarry? | Defeat Marni's Excavatron. | Retained objective, not a complete combat walkthrough or exhaustive task list. |
| Who leads House Roberts? | No accepted leadership fact. | Return unknown; membership, surname or quest contact cannot substitute for a leader claim. |

The update adds **8 entities, 17 claims, 2 evidence records and 1 receipt**. Total corpus: **318 entities, 1,413 claims, 79 evidence records, 27 patches, 1 strategy and 2 receipts**. The original 310 entities, 1,396 claims, 77 evidence records, patch records, strategy and receipt remain byte-identical. Existing Hernand and Excavatron identities are reused rather than duplicated.

## Source evidence and limits

Sources were inspected on September 10, 2026. Calendar publication dates are retained in locators when an exact publication timestamp was unavailable. Fetch time is not a gameplay observation or patch-review date.

| Source | Locator and bounded use |
| --- | --- |
| Larc, GAMES.GG, [All House Roberts Quests](https://games.gg/crimson-desert/guides/crimson-desert-all-house-roberts-quests/), dated March 20, 2026 | Introductory faction description, start/contact section, and explicit Sealed in Stone prerequisite warning. Supports the noncombat House/Count/manor relationships and three quest associations. Loading table placeholders were not used as evidence. |
| Sean Martin, PC Gamer, [Excavatron guide](https://www.pcgamer.com/games/action/crimson-desert-marnies-excavatron-boss-guide/), dated March 19, 2026 | Opening description supplies the Stolen Quarry faction association, quarry encounter, objective and Chapter 2 availability. No combat walkthrough, images or guide prose are retained. |
| Existing attributed CrimsonWiki [Excavatron page](https://crimsonwiki.org/wiki/excavatron) and its [history](https://crimsonwiki.org/wiki/excavatron/history) | Reuses the retained evidence record for Karin Quarry's Hernand relation. It retains the existing unverified source tier; licensing is not factual verification. |

An [official 2.00.00 notice](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=123) was inspected as a cross-check for the House Roberts / Sealed in Stone quest label. Its crane fix does not establish the guide's prerequisites, leadership, or current validity. It is not imported as a new patch record or used to refresh the pilot claims.

The inspected CrimsonWiki faction-guide revision did not supply the needed Roberts facts. Unretrievable pages, database-extraction sources, earlier conversation descriptions and incomplete guide tables are not canonical evidence. No full given-name identity, leader, membership roster, rival house, rewards table or complete quest chain was inferred to fill the gaps.

## Publication disposition

The two new guide records are explicitly `publisher_owned` with `normalized_facts` retention. That records ownership and the retained representation; it is **not an open licence or permission to republish the guides**. Only the enumerated, independently expressed factual relationships and minimum identifying labels are retained. Source prose, tables, screenshots, images and databases are not copied.

The [U.S. Copyright Office's facts/expression distinction](https://www.copyright.gov/what-is-copyright/) informs this limited extraction decision, not a blanket determination about all game-world expression, source contracts, database rights or downstream commercial use. Source publication rights are reviewed separately from factual confidence. [DATA_RIGHTS](../DATA_RIGHTS.md), [SOURCE_POLICY](SOURCE_POLICY.md), attribution, the free unofficial fan-content boundary and correction/removal procedures remain applicable. Publisher-owned game IP is outside the contributor licence grant.

The source-specific dispositions are enumerated in `quality/corpus-additions.json` in the source checkout. No general permission for either domain, arbitrary secondary sources or automatic rights approval is created. The dated review is not independent legal advice or publisher authorization.

## Small implementation changes

The existing canonical schemas express these facts. One controlled predicate is added: `quest.organization`, from a quest to its associated faction/organization. Predicate registry version advances from 13 to 14; all prior definitions and meanings are retained. A quest association is not an actor membership, prerequisite, leadership or ownership relationship.

The answer implementation follows applicable incoming `quest.organization` edges when the question asks for an organization's quests. It preserves patch, platform, spoiler, retraction, supersession, bounded output and evidence rules. The association-target restriction does not discard other requested predicates: a combined quest-list/prerequisite question retains The Count's Honor prerequisite alongside the four known associations. This does not establish prerequisites for the other quests or an exhaustive set. A leadership request cannot use a role/contact claim as proof. No API operation, response schema, compact tuple, default, or codebook layout changes.

The immutable initial manifest stays in `quality/public-release-scope.json`. The single checked `quality/corpus-additions.json` enumerates the approved added IDs/files, original-scope hash and two source dispositions. It is static review metadata, not a queue or contributor service. Source checks require the exact union, preserve original canonical bytes, forbid prior predicate redefinition, and reject missing/unreviewed additions. A separate receipt binds the 27 added entity/claim/evidence records; it proves byte integrity, not gameplay truth or permission.

## Verification and operation

The regression suite compares each positive question with the original-release record subset. The seven expected predicates were absent from that subset; adding a name alone is not counted as an answer improvement. Tests assert the exact relationship targets, the four known quest associations, the objective, historical/inferred labels, review gaps and evidence. Leadership, fabricated houses, unsupported patches and hidden spoilers remain negative controls.

The existing G01 absence tests use original-release IDs rather than deleting their assertions after House Roberts is added. Current-corpus tests separately preserve fabricated-subject abstention. The actual stdio MCP integration compares full and compact payloads with the REST handler for the eight pilot questions. Source-boundary tests reject changed base bindings, old predicate redefinitions and a source-review locator mismatch even after snapshot hashes are regenerated.

The repository's automatic review identified all-platform leakage and dropped prerequisites in compound questions. Two additional regression tests were committed before their corrections. They require all 17 claims to retain PC-Steam-only scope, require named console answer/relationship reads to withhold those claims, and require the combined question to retain both the four associations and the known prerequisite. Receipt and manifest hashes were recalculated for the narrowed claim bytes; no fact was removed or promoted in confidence. The PR records the failing and passing pinned-runtime runs and disposition of both findings.

Local core probes used Node 22.16.0 and transpiled modules; they are diagnostic evidence only. Supported-runtime acceptance is the existing GitHub CI on pinned Node 24.18.0 with the locked dependencies. The PR must record actual validation, test, build, distribution and determinism results for its final head and merged main revision. Source validation does not independently confirm every historical gameplay fact.

From a reviewed working checkout:

```sh
npm ci
npm run runtime:check
npm run security:audit
npm run check
npm run test:determinism
npm run start
```

Example local read:

```sh
curl 'http://127.0.0.1:8787/v1/answer?q=Which%20quests%20belong%20to%20House%20Roberts%3F&patch=1.14.00&platform=pc-steam&spoiler=quest_major&format=full'
```

Inspect `answer_state`, warnings, gaps, claim validity, evidence and `selection`; do not present the response as a complete, current quest roster. Exact-ID/entity/relationship reads and offline records remain available. Offline records carry no implicit query context. The build ID changes with the source; restart pagination when it changes.

## Completion and next boundary

M7 is complete only after the scoped evidence and diff are reviewed, blocking findings are addressed, the PR is merged, and required checks pass on the resulting main commit. The PR carries those external commit/run identities so this source document does not embed its own changing artifact hash.

The next content wave is a separate bounded decision. Full faction lore, leadership, rivals, complete progression and current patch confirmation remain gaps. No arbitrary record-count target, new release, public endpoint or broader infrastructure is a hidden requirement of this pilot.
