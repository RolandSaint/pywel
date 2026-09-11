# M10 — First expansion release candidate

**Release-readiness scope only. Publishing requires separate owner approval.** The exact accepted head, integrated main commit, CI run, artifact identity and checksums are recorded in [PR #11](https://github.com/RolandSaint/pywel/pull/11), outside the source tree so recording results does not change the candidate being certified. A pending or failed run is not readiness. This document alone is not certification.

## Release identity and finite boundary

The planned release label is **`expansion-2026.09.10.1`**, a dated source/data snapshot, not a new npm, API or schema version. The date names the September 10 America/Chicago expansion wave, not a game patch or claim-refresh date. The source includes maintained implementation fixes as well as expanded data; it is not byte-identical software to the original v1.0.0. Package/MCP initialization metadata remains `1.0.0` and `private: true`; consumers must compare the exact source commit and `build_id`, not that package field alone. There is no npm publication path.

The original `v1.0.0` tag and its assets remain unchanged at `b6d6c0b455273bc3ecb9bf00427156827939dc03`. The content boundary is the already integrated R01 revision `5cc9710affc3fdaf145c507bfd865eb0fac0e12c`. M10 adds no canonical facts or review credit and preserves both manifests exactly:

- Original scope SHA-256: `9bea33a672f0d2043e19e706e4d67cd8537823ad47154242916422c53c7aeb7f`.
- Additions SHA-256: `17f6abb88ce201d6095efa2efd2a061e63076da3c3577f6e4184d2c0cc07c8f0`.

| Stored family | v1.0.0 | Expansion |
| --- | ---: | ---: |
| Entities | 310 | 320 |
| Claims, including retained history | 1,396 | 1,447 |
| Evidence records | 77 | 88 |
| Patch identities | 27 | 27 |
| Strategies | 1 | 1 |
| Receipts | 1 | 5 |

The difference is ten entities, 51 stored claims, eleven evidence records and four integrity receipts. Three older guide summaries are superseded, not physically deleted; a count is not independent corroboration or whole-game completeness. All original and prior-wave canonical bytes are retained. Original private history, personal data, game assets and source-body copies remain excluded.

## Included improvements and compatibility

The snapshot includes G01's subject/recipe grounding corrections; M7's bounded House Roberts graph; M8A's selected four-quest entry/reward facts; M8B's two equipment references; R01's database-qualified refinement/acquisition reconciliation; and M9's anonymous public-file consumption instructions and test. Their exact evidence and qualifications remain in their existing milestone records and PRs. The database-first research rule is retained.

M10's first cumulative run found one additional blocker: the rivalry question Q04 returned an organization description instead of a requested rivalry fact. A narrowly scoped internal intent correction now requires a rivalry predicate rather than substituting role or membership. No rivalry data or vocabulary was added. Regressions require an explicit gap, preserve supported quest associations in a mixed request, and compare full/compact REST with actual stdio MCP. This is a correction to the existing requested-fact contract, not a general natural-language parser.

Record schemas, `/v1`, full answer v1, compact answer v3 and codebook v2 remain unchanged. Predicate registry 14 contains M7's added `quest.organization` and the 176 unchanged original definitions. Older consumers must load the matching vocabulary, as described in [COMPATIBILITY](COMPATIBILITY.md). The source/checker supports original scope plus explicit additions. Updating a dataset or build never advances its game-patch review boundary. Source changes invalidate stored pagination positions and packet-local compact indexes.

## Cumulative usefulness acceptance

`tests/m10-expansion.test.ts` reruns the same twenty M6 questions with their explicit original contexts. It writes `dist/m10-acceptance.json` only after all assertions pass. The report distinguishes three things:

1. Historical M6 states recorded from the old Node 22 diagnostic execution, not rerun old-engine certification.
2. Original release records freshly evaluated by the candidate engine.
3. Expanded records freshly evaluated by that same engine.

The second/third comparison isolates knowledge additions. Five original questions must gain relevant, evidence-linked **partial historical answers**: House Roberts identity, regional association and quest links; Righteous Verdict acquisition; and Witch's Ring effects. Eleven intentionally gap-focused questions must not substitute unrelated claims. The four published controller-remapping/classification controls retain their expected supported, partial and unknown behavior. Existing G01/M7/M8A/M8B/R01 tests cover their additional named questions, source fidelity, uncertainty, supersession and adapter parity.

Partial answers are not complete or current-build answers. This selected question set is neither random nor representative of all Crimson Desert questions; do not turn its counts into a product accuracy or game-coverage percentage. Correct abstention is a safety improvement, not newly learned content.

## Remaining limitations, not hidden release obligations

Historical indexed coverage still ends at **1.14.00**. Later source-page version labels and capture dates do not establish claim-specific current-game confirmation. New pilot assertions remain inferred/historical with null review boundaries and a conservative PC-Steam scope; platform `all` means a union. Publisher intent and guide/database reports are not independent gameplay observations. The retained strategy remains unobserved.

Leadership/rivalries, complete faction/quest coverage, Shorthanded, Celestial Transference, numeric movement caps, bonds, harvesting behavior, recruitment/housing unlocks and natural-language latest-patch routing remain gaps in the M6 sample. The ring's stamina-field meaning remains typed unknown. Database seller listings do not promise stock, unlock conditions or exclusive acquisition. Refinement fields do not include socket bonuses or certify a live setup.

No-install access is pinned public-file consumption, not hosted REST/MCP or anonymous semantic search. Raw catalogs are unfiltered and include superseded history; consumers must interpret context, spoilers and lineage before presenting answers. The isolated network smoke proves retrieval/record selection in a fresh process, not independent LLM reasoning quality. Tests and hashes verify their stated scopes, not the underlying truth of every source or legal clearance for every downstream use.

## Candidate preparation and verification

On a clean working checkout using Node **24.18.0**, GNU tar and `sha256sum`, run:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run runtime:check
npm run security:audit
npm run check
npm run test:determinism
node --import tsx scripts/prepare-release.mjs expansion-2026.09.10.1
```

The preparation command requires the successful twenty-question report for the exact checkout. It reuses `checkM1`, `exportPublicSource` and `verifyDistribution`. It refuses existing output candidates, performs two clean source exports, compares normalized source archives, packages the already-reproduced data, restores both actual archives into temporary directories, verifies exact inventories/hashes and data source binding, and checks that deliberate source/data tampering is rejected. It leaves tracked source unchanged. It does not install inside the immutable export, add services, or publish anything.

Output is `dist/release-candidate/`:

| File | Purpose |
| --- | --- |
| `pywel-expansion-2026.09.10.1-source.tar.gz` | Exact manifest-verified source export, excluding Git history and installed packages. |
| `pywel-expansion-2026.09.10.1-data.tar.gz` | Offline corpus/JSONL, schemas, required notices, manifest and checksums; no installable runtime. |
| `CANDIDATE.json` | Exact source/tree/build/runtime identities, archive digests and measured verification. |
| `M10-ACCEPTANCE.json` | All twenty cumulative results and bounded methodology. |
| `RELEASE_NOTES.md` | This scoped release description. |
| `SHA256SUMS` | SHA-256 bindings for the other five files. |

CI prepares these only after the existing full checks and data determinism check pass, and retains them as a GitHub Actions candidate artifact for seven days. No repository write permission, release creation or paid hosting is added. Retention is temporary; an expired artifact must be regenerated from the approved exact source and checked before use. The original and expanded data build/export paths remain the same; this script only packages and verifies their outputs.

Archive reproducibility is scoped to the recorded pinned Node and GNU tar environment; `CANDIDATE.json` records both. A hash is not a signature. Keep the trusted source revision, CI/artifact identity and checksum record together. The archive round trip is a fresh filesystem test by the current automated process, not a claim that a second independent human repeated M4. Existing M4 independent-operation evidence applies only to its named historical candidate.

## Completion and next approval

M10 readiness requires actual diff/source review, resolution of blocking findings, passing candidate checks, checked-head merge, passing main CI and verified availability/identity of the resulting candidate package. PR #11 is the acceptance record for that exact state. The script's `prepared_not_published` output never changes to a public-release claim by itself.

After owner publication approval, publish only the accepted source revision and verified package under the planned snapshot label. Do not move v1.0.0, mix PR-merge and main identities, substitute a later mutable main, publish npm, introduce hosting or add more content during publication. When consuming an immutable source export, follow [OPERATIONS](OPERATIONS.md) to make a separate working checkout; never initialize or install into the preserved export.

This finishes one bounded expansion cycle. Any additional content, software-version change, deployment or further release gets its own approval; unfinished game knowledge does not reopen this accepted wave.
