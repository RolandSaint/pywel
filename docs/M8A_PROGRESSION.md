# M8A — Four-quest entry and selected rewards

Owner-approved scope: start/unlock information and selected rewards for the four quests already indexed by M7. Base: `6de83627eed68c4ba965469884718ea83aff0d6f`. [PR #7](https://github.com/RolandSaint/pywel/pull/7) records the reviewed head, final CI and integrated main verification. Completion requires all three; this document alone does not certify integration.

This is a historical knowledge addition, not a new release, live-game certification or complete House Roberts walkthrough. M8B and any release/deployment need separate approval.

## Eight questions: six new positive answers, one explained gap, one preserved answer

Evaluation uses patch `1.14.00`, platform `pc-steam`, locale `en-US`, spoiler ceiling `quest_major`. It compares retrieval at a fixed context; it does not prove that the guides were tested on that build. All added claims remain inferred/historical, with null patch/review bounds. Positive answers remain partial with review gaps. Sealed in Stone's reward query returns unknown with the explicit source-limited reason below, not a fictitious reward or a filled positive knowledge gap.

| Quest | Entry/unlock question | Selected reward question |
| --- | --- | --- |
| First Trial of Trust | Identifies the servant interaction near Bluemont Manor. This is an entry instruction, not an exhaustive set of hard unlock gates. | Records the reported contribution amount; Knowledge rewards are not normalized. |
| Stolen Quarry | Records Troubled Count as a prerequisite without creating another quest entity. | Records the reported contribution amount as a quest reward. Encounter drops belong to the existing Excavatron actor instead. |
| Sealed in Stone | Links the existing Stolen Quarry identity as a prerequisite. | Returns a typed unknown: the guide reports no direct item reward, while other reward types are not established. The source-limited report is not an affirmative reward object. |
| The Count's Honor | Preserves M7's existing Sealed in Stone prerequisite unchanged. This is the already-answerable control, not new coverage. | Records three item rewards with quantities, a contribution amount, and the reported alliance. |

The batch adds **13 claim records, 3 evidence records and 1 receipt**, with **no new entities**. The 13 records comprise three prerequisite/entry assertions, seven positive quest-reward assertions, two encounter rewards, and one explicit unknown. Resulting counts: **318 entities / 1,426 claims / 82 evidence records / 27 patches / 1 strategy / 3 receipts**. All original and M7 canonical files remain unchanged. Six questions gain positive qualified facts, one gains an explained source-limited gap, and one preserves its accepted M7 answer. An explained unknown is not counted as a filled positive answer.

The PC-Steam restriction is the inherited conservative pilot scope, not an independently observed Steam result. Named console/Epic contexts withhold the added claims. An aggregate `all` request returns the union with each claim's narrower validity. No claim review is advanced by a guide's publication or retrieval date.

## Sources and attribution

Inspected September 10, 2026. Exact locators and calendar dates are retained in the evidence records; unavailable publication times remain null. Source agreement is not automatically independent corroboration, and none of these records asserts an original gameplay observation by Pywel.

| Evidence ID | Author and source | Bounded passage use |
| --- | --- | --- |
| `evd_m8aconsolepulse2026091001` | Aiden Nguyen, Console Pulse, [Estate in Dismay walkthrough](https://consolepulse.com/multiplatform/crimson-desert/guides/crimson-desert-estate-in-dismay), published May 30 and updated August 17, 2026 | Start section, Troubled Count prerequisite sentence, and selected reward entries for the first, third and fifth quests. |
| `evd_m8asealedguide2026091001` | Larc, GAMES.GG, [Sealed in Stone guide](https://games.gg/crimson-desert/guides/crimson-desert-how-to-complete-sealed-in-stone-quest/), updated March 30, 2026 | The explicit unlock dependency and no-direct-item statement. Same author/publisher group as M7's GAMES.GG record, not a second independent source for that record. |
| `evd_m8avulkk2026091001` | Siow, VULKK, [Stolen Quarry walkthrough](https://vulkk.com/2026/03/26/crimson-desert-troubled-count-walkthrough-karin-quarry-excavatron/), updated March 31, 2026 | Excavatron reward paragraph, transition to Sealed in Stone, and final item quantities. |

These publishers and authors retain their rights. Each record is `publisher_owned`, not openly licensed article content. The additions manifest records an exact source-specific, limited-original-factual-extraction decision. Retained material is only selected independently expressed assertions, necessary labels/amounts and attribution. No article body, table layout, screenshots, video, game assets or source database is distributed or relicensed.

The [Copyright Office's facts/expression distinction](https://www.copyright.gov/what-is-copyright/) informs this limited editorial decision; it is not blanket clearance of fictional-world expression, contracts, database rights or downstream commercial uses. Console Pulse's [terms](https://consolepulse.com/terms) retain ownership and restrict substantial copying; no open licence or publisher permission is claimed. [DATA_RIGHTS](../DATA_RIGHTS.md), [SOURCE_POLICY](SOURCE_POLICY.md), the unofficial/free distribution boundary and correction/removal process still apply. This is not independent legal certification.

## Deliberate omissions and disagreements

The two longer walkthroughs differ on the order of combat and quarry liberation. M8A does not choose an order or ingest a walkthrough; the disagreement remains a research lead outside the eight approved questions. Their overlapping reward labels do not by themselves establish independent observation.

Quest rewards are not equated with encounter drops or nearby optional treasure. The Gold Vein Map and Mining Knuckledrill records use existing `actor.reward` on Excavatron (`ent_7e38fb7b48e5b55432fe64ca`), not `quest.reward` on Stolen Quarry. They remain accessible through actor/entity/claim reads and offline records. The Sealed in Stone unknown object retains the guide's no-direct-item report in its reason; it does not claim absence of every reward or progression benefit. Knowledge entries, experience, item statistics, complete prerequisites and later quest arcs are not silently included or declared absent. Troubled Count remains a referenced source label, not a newly constructed entity.

Direct Game8 retrieval was unavailable during research; snippets were discovery leads, not canonical evidence. External database links listed by a guide do not authorize extraction and were not imported. No personal playthrough, private system, conversation, game-file extraction or copyrighted source body was used.

## Implementation and verification

No runtime code, vocabulary, schema, dependency, workflow or interface change is required. Existing `quest.prerequisite`, `quest.reward`, `actor.reward` and the typed unknown object express the corrected records. The cumulative `quality/corpus-additions.json` adds exact IDs, digests and source-use decisions; existing M7 bindings and the original release manifest stay intact. The separate receipt binds the 16 new claim/evidence records and proves integrity only.

The eight questions and exact targets were committed before data in `aab9f26767690c291ac79117a16ba84de62d4d8b`. [Initial red CI 34533135367](https://github.com/RolandSaint/pywel/actions/runs/34533135367) reproduced 11 missing-data failures with all 181 prior tests passing on pinned Node 24.18.0. Source validation, scope checks and type checking passed before those expected failures.

Automatic review subsequently identified the negative-reward and encounter-attribution mistakes. Corrected semantic expectations and two focused regressions were committed before the data repair at `50091757f0f4416115afbad96e8f918446276aa0`; [review-regression CI 34535732860](https://github.com/RolandSaint/pywel/actions/runs/34535732860) failed against the uncorrected records. The no-direct-item answer is deliberately no longer scored as a positive answer. The encounter information is retained under the correct actor rather than deleted or hidden in quest prose.

Acceptance requires the full suite on the final candidate, then main after integration. Tests check exact facts and quantities, evidence resolution, the unchanged prior prerequisite, the six-positive/one-gap/one-preserved distinction, fabricated subjects, leadership abstention, platform/spoiler/unknown-patch boundaries, compound queries, and full/compact REST versus an actual stdio MCP process. Existing validation, provenance, receipt hashes, distribution verification and determinism remain enabled. Passing tests verify those assertions and machinery, not all gameplay truth.

Use the pinned Node runtime and locked install:

```sh
npm ci
npm run runtime:check
npm run security:audit
npm run check
npm run test:determinism
```

PR #7 records actual final results and review dispositions. The `v1.0.0` tag/assets remain unchanged; use an identified main commit/build to consume M8A. Do not mix old release artifacts with this source or infer current-patch applicability from its software version.
