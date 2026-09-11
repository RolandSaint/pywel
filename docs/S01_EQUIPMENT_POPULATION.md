# S01 — First substantive equipment population

Owner-approved scope: up to 200 eligible equipment entries, from reviewed public databases, through reviewed merge and passing main verification. Base: `38c6389cfe79bd428fb8cad73f026e6915679812` (G02). This is populated knowledge, not a new readiness prerequisite or release. The PR records actual integration and test results.

## Result and depth

The admitted cohort has **200 new identities: 80 weapons, 80 armor pieces, 40 accessories**. It adds **1,144 claim records, 200 evidence records and one receipt**. Source totals become **520 entities / 2,591 stored claims / 306 evidence records / 44 patches / one strategy / seven receipts**.

Claims are counted by their purpose, not all called new mechanics: 729 selected numeric refinement-cell reports; 200 source item classifications; 200 source equipment categories; 14 qualified acquisition listings (11 seller labels and three quest labels); one relationship to an already indexed quest. Every admitted item has useful selected stat information, not just a name. This is not complete equipment coverage, complete effects or complete acquisition coverage.

No earlier canonical file is edited. Existing identities and normalized-name collisions are excluded instead of silently merged. Both published tags and all release assets are unchanged. No source runtime, schema, vocabulary, dependency, hosted service, model, production importer or publishing workflow is added.

## Sources and mapping

A temporary read-only collector inspected ordinary public CrimsonDB HTML using an identifying user agent, the site's robots rules, one request per second, same-host redirects and bounded response sizes. It stopped rather than bypassing access/rate restrictions. The completed pass used 212 requests and produced a selected-field projection, not retained page bodies, scripts, media or recovered game files. Source pass: [34628099692](https://github.com/RolandSaint/pywel/actions/runs/34628099692), artifact 10275232695. The projection hash and complete admitted/excluded identity ledger are in [s01-equipment-review.json](https://github.com/RolandSaint/pywel/blob/f9fd37b023b151144493fcc266b302663c9d1c35/quality/s01-equipment-review.json). The artifact is a temporary audit aid, not a required runtime dependency.

The finite selection follows the first eligible entries exposed by each category index until the 80/80/40 caps. That selection is not a claim of popularity, completeness or random sampling. Each individual item page supplies its own source locator. IDs are deterministic from the original source URL; source paths remain resolvable in evidence/ledger rather than being treated as official game IDs.

Only the +5 and +10 table rows and these fields are converted: Attack, Defense, Critical Rate, Attack Speed, Movement Speed. The last three stay **levels**, not percentages. Values are explicitly reported as CrimsonDB table values; socket bonuses are neither added nor subtracted. Neither "base stat" nor "unsocketed total" is inferred. The special Electro-Mecha Spear progression and the armor's Attack values were checked rather than normalized to a guessed conventional progression.

Seventeen rendered detail pages were inspected as a cross-section and to resolve every flagged scalar omission. These sample pages are listed in the ledger. The mapping and value/range/identity checks cover all 200 candidates; this does not claim that a human or independent model manually verified every source cell or observed gameplay. Same-database checks are not independent corroboration. All 200 evidence records share the existing unresolved-upstream reliability group.

The initial seller parser retained no usable labels because its section boundary was over-conservative. Its output was **not** used as evidence of seller absence. Eleven seller labels and three quest labels were inspected separately; other acquisition fields remain gaps. The source's technical shop labels are retained as source listings, not interpreted as coordinates, live inventory, unlock gates or guaranteed obtainability. Sunset Reed Cloth Gloves links to the existing The Face Behind the Mask quest ID; absent quest/merchant identities are not invented.

## Exclusions and uncertainty

Seven vehicle-weapon candidates and the ambiguous base Kuku Spear were excluded. Two gauntlets and five circlets lacked usable +10 scalar table rows and were omitted. The already indexed Witch's Ring was excluded as a duplicate; its R01 uncertainty and supersession remain unchanged. The ledger records these sixteen encountered exclusions; unvisited entries beyond the caps are simply outside scope.

A dash in three selected +5 cells (Skyblazer Cloth Cloak movement speed, Rainstorm Necklace critical rate, Flower Petal Earring movement speed) is not converted to numeric zero. Other supported cells remain admitted. Regeneration percentages, corrupted health/spirit figures, skill cooldown strings, socket-derived totals, complete cost/material tables, maps, creative descriptions and media were excluded. Their omission does not assert the items lack those effects.

The source header displays v1.17.00, but this is not a per-claim confirmation. All additions remain **inferred/historical secondary-source reports**, with null patch/review bounds. PC-Steam is the inherited conservative intake scope, not a tested-platform observation; other named platforms withhold these claims. G02's indexed 2.01.00 does not refresh them. Effects/category claims use `discovery`; acquisition/quest links use `quest_major`. Shared evidence metadata contains no quest or seller names, preventing acquisition details from leaking into lower-spoiler effects answers.

The existing API can return explicitly labelled +5 and +10 claims together. It does not gain arbitrary refinement arithmetic or a new numeric-stat endpoint. Exact-ID claim reads and offline records supply the complete selected item set; compact answer caps still apply. A partial answer is not a fully verified loadout calculation.

## Source-specific retention and rights

The [database survey](https://github.com/RolandSaint/pywel/blob/f9fd37b023b151144493fcc266b302663c9d1c35/docs/DATABASE_SOURCES.md) checked CrimsonWiki's community license and multiple public databases before this batch. No adequate open equipment export was established. CrimsonDB public pages and privacy notices did not establish an open-data or full-database redistribution grant. S01 does **not** claim one.

The existing limited-original-factual-extraction policy is applied separately to every enumerated source, with exact dispositions in `quality/corpus-additions.json` and [central attribution](../LICENSES/THIRD-PARTY-DATA.md). The retained material is a small selected field projection of each item and independently written reporting statements, not copied creative expression, full refinement tables, costs/material combinations, the source database's arrangement, game assets or recovered files. Public access and robots permission do not establish reuse rights. The [Copyright Office's fact/expression distinction](https://www.copyright.gov/what-is-copyright/) informs that bounded decision, not a blanket fictional-world, database-right, contractual or downstream commercial clearance. Underlying publisher and third-party rights stay outside Pywel's license; retain [DATA_RIGHTS](../DATA_RIGHTS.md) and the correction/removal policy. A later wholesale import needs its own supported reuse basis.

## Acceptance and preservation

Existing validation and receipt/manifest checks cover every new record. S01 tests check cohort counts, unique identities, exact earlier-record hashes, evidence resolution, refinement qualifiers, scoped uncertainty, omitted cells, seventeen answer examples, acquisition privacy and full/compact REST against actual stdio MCP. The historical G02 and M10 tests now select their named earlier cohorts rather than incorrectly treating later authorized additions as corruption; their original hashes/assertions remain intact.

Temporary collection/conversion helpers stay off main; only reviewed canonical records, dispositions, the compact audit ledger, focused tests and documentation are product changes. The final PR must pass pinned Node 24.18.0 CI, reviewed integration and main checks. Report the exact integrated commit and actual results. New publication remains separately authorized.
