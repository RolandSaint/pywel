# G05: named items touched by the recent patches

This document records the item-focused contribution prepared from main `6195e52daca31514fa8864d0c9f61207ad2b0cf3`. Source admission is not completed integration: [PR #24](https://github.com/RolandSaint/pywel/pull/24) records the actual reviewed head, feedback, checks, merge and resulting-main verification.

## Finite item result

The four G04 notices, versions 2.02.00 through 2.03.02, were inspected for item-specific statements. Three exact named objects have no matching name or alias in the complete 592-entity baseline. G05 adds three minimal generic item references, four claim facets describing three events, and one contribution receipt. No new evidence or patch identity is imported. Candidate totals are **595 entities / 2,700 stored claims / 310 evidence records / 48 patch identities / one strategy / twelve receipts**.

| Named object | Supported change | Direct source and review boundary |
| --- | --- | --- |
| Crow Cloth Blindfold | Fix to Kliff's appearance while wearing it with some unspecified settings enabled. No particular setting is inferred. | [2.02.00](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=130), Others; existing `evd_g04notice1300001`. |
| Vaporwalker | Water Stride can slide with this item equipped. An effect facet and a patch-history facet serve the existing two query intents. | [2.03.00](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=131), Combat / Action; existing `evd_g04notice1310001`. |
| Lumberjacks' Witness Report | The named poster continues spawning while unread. Its generic object reference does not establish inventory collectability or a pickup location. | Same 2.03.00 notice, Content. |

The two Vaporwalker facets and G04's retained Water Stride assertion represent **one event from one publisher**, not three independent confirmations. No item stats, refinement effects, equipment class, quantity, acquisition route or implied universal prerequisite is added. All 81 earlier canonical files and the prior data/vocabulary tree remain unchanged.

## Scope held rather than guessed

The audit ledger `quality/g05-patch-item-review.json` records twelve generic or already-system-scoped mentions. These include lantern visibility and controller aiming, silver pouches for a new game created from existing save data, indoor armor noise, unspecified bardings, mounted-item freezes, storage disappearance, an unnamed quest letter and Ether Rest's power core. None identifies a specific existing gear record to update. Existing G04 controls, mount, housing, storage, quest and location assertions remain in place instead of being imported again or attached to arbitrary items. The silver threshold does not establish a pouch denomination or stack limit.

This batch does not revisit older G02 notices, resume S06 or restore S02. An untouched item is not confirmed current merely because the recent notes omit its name.

## Source, chronology and rights

The method is **interactive agent web reading**, not human/manual collection, a bulk collector or game extraction. Reuse the existing official-publication evidence records and attribution under the unchanged DATA_RIGHTS and SOURCE_POLICY boundary. G05 freshly inspected the Others subsection for the blindfold; G04's older locator describes its own selected sections and is not retrospectively claimed to include that review. The publication is the same, not another independent source. Preserve original evidence capture times and ownership labels. No source body, media, page-capture hash or new rights-holder grant is retained.

All new assertions remain `official` / `intended` at confidence 0.98. They describe publisher statements, not independently observed gameplay. Their review bounds stop at the directly supporting patch. The 2.03.00 statements exclude Mac App Store, still pending in that inspected notice. The 2.02.00 notice includes it as available. Publication timestamps are not universal rollout times. Queries at 2.03.02 must retain the claim-review gap rather than receive fabricated freshness.

## Verification contract

The test-local Git-object digest reconstructs the entire previous data tree while excluding only the three new G05 files. It must equal `065e1aeae0a3abb17f6c109a0c257dc94ce11372`; this works in shallow CI without retrieving an old commit or storing a duplicate baseline. The new records have exact manifest bindings and a recomputable seven-record receipt.

Regressions require unique identities, precise event/source mapping, unchanged evidence ownership and dates, own-patch positives, earlier-patch and spoiler exclusions, pending-platform exclusions, current-patch uncertainty, unsupported acquisition gaps, and nonempty matching full/compact REST and actual stdio MCP answers. Existing G04 and M10 fixture expectations remain frozen; the live union is checked separately. Required pinned-runtime CI, actual feedback review, guarded merge and resulting-main CI are recorded in PR #24, not inferred from this preparation document.

No runtime, schema, vocabulary, dependency, source-policy or permanent workflow change is part of G05. No outreach, release, deployment, paid resource or personal-system action is authorized. S06 stays paused and S02 stays withheld.
