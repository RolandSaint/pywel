# G02 — Official patch identities and review triage

Scope: the owner-approved patch catch-up after `expansion-2026.09.10.1`. Completion requires reviewed integration and passing checks on the actual main commit; the PR records that evidence. No release/tag/deployment is authorized here.

## Fixed source boundary

Base: `e8901037e03965e806696da0b239c9e8720f924b`, the published first expansion. Research cutoff: **2026-09-11 03:01:46 UTC / September 10, 22:01:46 America/Chicago**. The latest displayed official update was **2.01.00**, published September 4. The four [official Updates index pages](https://crimsondesert.pearlabyss.com/en-US/News/Notice?_categoryNo=2) were reconciled against the 27 indexed versions; each missing notice's substantive text and platform schedule was inspected. Previously indexed notice bodies were not comprehensively re-reviewed. This is not a claim that every historical revision, deleted notice or embedded platform patch has been independently rediscovered.

The result is **17 added version identities from 18 notices**: fourteen newer versions and three older omissions. One version has two distinct platform notices. The existing schema intentionally keeps one record per version; separate evidence IDs and the [machine-readable ledger](../quality/g02-patch-review.json) preserve notice-specific dates, revisions, available/pending platforms and review leads. No source bodies or media are copied.

| Version | Notice publication UTC | Official board |
| --- | --- | --- |
| 1.00.03 | March 23, 01:10 | [73](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=73) |
| 1.00.04, PlayStation | March 23, 07:25 | [74](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=74) |
| 1.00.04, Mac Steam | March 24, 16:51 | [75](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=75) |
| 1.02.00 | April 4, 01:14 | [80](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=80) |
| 1.15.00 | July 24, 02:40 | [109](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=109) |
| 1.16.00 | August 1, 03:30 | [110](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=110) |
| 1.16.01 | August 2, 01:00 | [111](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=111) |
| 1.16.02 | August 3, 14:40 | [112](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=112) |
| 1.16.03 | August 4, 04:50 | [114](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=114) |
| 1.16.04 | August 5, 09:00 | [115](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=115) |
| 1.17.00 | August 7, 12:30 | [116](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=116) |
| 1.18.00 | August 15, 03:43 | [117](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=117) |
| 1.18.01 | August 16, 04:00 | [119](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=119) |
| 1.18.02 | August 16, 10:00 | [120](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=120) |
| 2.00.00 | August 25, 18:20 | [123](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=123) |
| 2.00.01 | August 28, 00:00 | [126](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=126) |
| 2.00.02 | August 28, 00:00 | [127](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=127) |
| 2.01.00 | September 4, 04:20 | [128](https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=128) |

All dates above are in 2026. `released_at` retains the existing notice-publication anchor convention, not a universal storefront release time. For multi-notice 1.00.04 it is the earliest cited publication; each evidence record retains its own genuine `published_at`. A focused validation correction permits that legitimate case while rejecting an incorrect anchor, duplicate version, nonofficial source or missing reference. No public record/response shape changed.

Available-platform arrays include only storefronts explicitly scheduled or marked available in the inspected notice. Pending storefronts remain separately recorded, even where the body includes a platform-specific fix. Thus 1.16.02 does not claim Mac availability. For 1.00.03 the explicit rollout schedule, not the generic PC/Mac detail text, determines the conservative indexed storefronts. Retrieval timestamps are not patch-review dates. No exact simultaneous rollout is inferred from publication time or from two hotfixes having identical displayed timestamps.

## What changed in canon

**17 patches, 18 primary-official evidence records and one integrity receipt** were added. Totals: **320 entities, 1,447 stored claims, 106 evidence records, 44 patch versions, one strategy and six receipts**. Existing entities, claims, evidence, patches, strategies, receipts, vocabulary and the initial manifest remain byte-identical. The reviewed additions manifest extends the union rather than overwriting previous files.

Every added patch is `identity_only`, with zero normalized claims and no asserted affected-entity list. Selected impact mappings live in the quality ledger, not in accepted gameplay claims. All 1,447 claim records retain their exact status, confidence, applicability, spoiler level, evidence and review boundaries. In particular, none gains freshness merely because 2.01.00 is now indexed.

The default continues to mean latest indexed patch; its value now resolves to 2.01.00. Existing historical answers may change from unknown-patch to qualified partial support in that context, but must retain their claim-review gaps and the identity-only patch warning. Truly unindexed versions remain unknown. Pin the original release tag when reproducing the original default/patch set.

## Bounded impact queue

The ledger supplies **13 prioritized tasks referencing 46 distinct existing claims**, with source IDs, precise section locators and acceptance boundaries. Priority is a maintainer judgment, not an audience-frequency metric. Direct named changes and broader context reviews are distinguished; the queue does not assert that all referenced claims are wrong.

The first task is the explicitly changed prerequisite for **Where Misery Gathers**. Other high-priority scopes are Sealed in Stone's crane stage, the skill-learning system, camp/research/bank coverage, and The Cursed Knight completion. Lower-priority scopes cover farming, mounts, crafting, map UI, a Golden Star encounter dependency, mushroom categorization, pet looting and platform-specific stability. Retained historical change statements may remain correct as history and need supplementary current guidance rather than supersession.

This is selected impact triage, not exhaustive normalization of every note. Missing Bank/Bonds, Housing and Abyss Link entities are knowledge gaps, not permission to attach their mechanics to unrelated parent records. Neither target equipment item is specifically named in the inspected notices; that silence does not verify its stats or acquisition. The incomplete 1.16.00 trading-post unlock sentence remains a source limitation. Claim-specific research is the next separately approved task.

## Verification and release preservation

Focused tests cover exact patch/evidence membership; unchanged claim/entity hashes; both 1.00.04 notices and correct time validation; delayed platforms; true unknown versions versus newly indexed, unreviewed versions; reference-resolving triage; and full/compact REST with actual stdio MCP parity. Existing controls and uncertainty checks stay active. The M7 unknown-patch control now uses the still-unindexed 9.99.00; G02 separately tests 2.01.00's changed identity status without freshness credit.

M10 remains a regression against its receipt-defined published record set and its original additions-manifest hash. Its published acceptance bytes are not regenerated from later source. Ordinary CI retains installation, production audit, source/canonical/provenance/type/test/build checks and data determinism, but removes the two already-completed M10 packaging/upload steps. The frozen release can still be reproduced from its tag; G02 does not manufacture another candidate using that label.

The PR records actual results, review findings and the integrated main commit. No new release or hosting is part of G02. Implementation uses Chat/GitHub and existing CI, not a separate Work/Codex execution assignment.
