# M8B — Two-item acquisition and qualified effects

Owner-approved scope: four questions about Righteous Verdict and Witch's Ring. Base main: `10f7ad51e8c74aa404cc6a36bf7a7ef975ae65c2`. [PR #8](https://github.com/RolandSaint/pywel/pull/8) records the accepted head, reviews, merge and successful main CI. This document does not itself certify integration or a new release.

## Question boundary

| Fixed question | Intended improvement |
| --- | --- |
| Where can I get Righteous Verdict? | A source-linked acquisition route, not an assertion that other acquisition methods are impossible. |
| What effects does Righteous Verdict have? | Attached-gear and configuration-qualified speed/critical-rate summaries, not intrinsic unsocketed stats. |
| Where can I get Witch's Ring? | A source-linked Chapter 9 acquisition, withheld below the required spoiler ceiling. |
| What effects does Witch's Ring have? | Refined attack-speed information and a reported stamina-regeneration bonus, without choosing an unresolved numeric magnitude. |

Evaluation context is `1.14.00`, `pc-steam`, `en-US`, `quest_major`. This fixes the retrieval comparison; it does not establish that a guide was tested on that build. All nine added claims are inferred/historical with null patch and review bounds. The inherited PC-Steam pilot scope is a conservative distribution restriction, not independently observed Steam gameplay; named other-platform requests withhold the additions. Aggregate `all` reads retain each record's narrower validity. Source retrieval or recent article updates do not confer patch freshness.

The batch adds **2 entities, 9 claims, 3 evidence records and 1 receipt**. Counts become **320 entities, 1,435 claims, 85 evidence records, 27 patches, 1 strategy and 4 receipts**. Claims comprise two categories, two acquisitions and five qualified effect summaries. Existing names were checked before adding identities; all original, M7 and M8A canonical files remain unchanged. The four questions must gain on-topic partial answers with evidence and review-gap warnings; this is not a whole-game completeness measure.

## Sources and attribution

Relevant passages were inspected September 10, 2026. Publication calendar dates are recorded below and in locators; source publication timestamps remain null where timezone/time are not established.

| Evidence ID | Author and source | Retained passage scope |
| --- | --- | --- |
| `evd_m8bconsolepulse2026091001` | Aiden Nguyen, Console Pulse, [3 Best Two-Handed Swords in Crimson Desert](https://consolepulse.com/multiplatform/crimson-desert/guides/3-best-two-handed-swords-in-crimson-desert), published May 14, updated September 7, 2026 | Section 1 and its acquisition subsection. Only the two-handed category, route, attached gear names and two configuration-qualified summaries. |
| `evd_m8bringsguide2026091001` | Larc, GAMES.GG, [Crimson Desert Best Rings You Should Get](https://games.gg/crimson-desert/guides/crimson-desert-best-rings/), June 5, 2026 | Witch's Ring subsection, first two paragraphs: acquisition and refined speed. No mirror-puzzle walkthrough or exclusivity assertion. |
| `evd_m8bpromaxrings2026091001` | Eva Roberts, Gaming ProMax, [Best Rings in Crimson Desert](https://gamingpromax.com/best-rings-in-crimson-desert/), June 6, 2026 | Witch's Ring subsection: reported stamina-bonus direction only. Its magnitude and activation/refinement details are not adopted. |

These remain secondary, publisher-owned guide records, not original gameplay observations or open article licences. Prior GAMES.GG author/publisher grouping is retained. The Console Pulse article shares its author/publisher with M8A; separate article/group labels do not establish independence. Confidence is a bounded editorial label, not a measured probability of correctness.

The cumulative additions manifest records an exact source-specific limited factual-extraction decision for each of these three records. Retention is restricted to minimal independently expressed assertions and necessary identifying labels, with attribution. No source body, table layout, narrative walkthrough, screenshots, video, game assets or extracted database is retained or relicensed. The [Copyright Office facts/expression distinction](https://www.copyright.gov/what-is-copyright/) informs this editorial decision, not blanket clearance of fictional expression, database rights, contracts, non-U.S. law or downstream commercial use. Existing [DATA_RIGHTS](../DATA_RIGHTS.md), [SOURCE_POLICY](SOURCE_POLICY.md), free unofficial distribution and correction/removal limits apply. The [central attribution notice](../LICENSES/THIRD-PARTY-DATA.md) covers each record once.

## Deliberate unresolved details

The sword source describes one refinement-5 setup with attached Abyss Gear. Its listed speed and critical rate therefore remain qualified summaries; no bare `stat.*` record asserts intrinsic, unsocketed or all-refinement values. A verified base/refinement table and any unique intrinsic ability remain outside this batch. Attached gear names do not prove separate activation mechanics.

The ring sources support a refined speed bonus and report stamina regeneration. Gaming ProMax gives a stamina magnitude different from the [BrokenBuilds accessories guide](https://brokenbuilds.gg/crimson-desert/best-builds/best-accessories). Their build/refinement observations are not matched, so this batch retains only the bonus direction and explicitly leaves its magnitude unresolved. BrokenBuilds is a disagreement lead, not an additional normalized source or database import. No exact +10 requirement, complete stat progression or current-patch claim is inferred.

Game8 item pages could not be retrieved; search excerpts were leads, not canonical evidence. A Shacknews item guide was excluded from normalized support after its reuse restriction was inspected. Third-party item databases were not imported. No personal playthrough, private repository, game-file extraction or source media was used. Source availability and rights do not establish factual accuracy.

## Implementation and verification

Existing `item.category`, `item.acquisition` and `item.effect_summary` suffice. There is no runtime, vocabulary, schema, dependency or workflow change. The static cumulative manifest adds only the new IDs, file hashes and source dispositions; prior canonical bindings and the initial release manifest stay intact. The receipt binds the fourteen new entity/claim/evidence records and proves their integrity, not gameplay truth.

The four questions and negative cases were committed before data in `c6ff72859c5015715ad2e5e8ade9b27b7875d0cb`. [Initial CI 34538289467](https://github.com/RolandSaint/pywel/actions/runs/34538289467) reproduced eight missing-data failures with 198 passing tests, including all 196 pre-existing tests, on pinned Node 24.18.0. Canonical, provenance and type checks passed before the expected assertion failures.

Acceptance requires all checks on the final candidate and then on the merged main commit. The ten M8B tests cover exact subjects, counts and evidence, no-data comparison, context/spoiler limits, fabricated names, compound questions, and eight full/compact comparisons between REST and actual stdio MCP within the integration test. Passing tests establish those behaviors, not all gameplay truth. Local data/hash preparation is not a claim of a local pinned-runtime installation; supported-runtime results come from GitHub CI.

```sh
npm ci
npm run runtime:check
npm run security:audit
npm run check
npm run test:determinism
```

Use PR #8 for actual final results and review dispositions. M8B integration does not create a release or update the v1.0.0 tag/assets. Consume an identified main commit/build, not a mixture with older release artifacts. No new hosting, paid resource or subsequent milestone is authorized here.
