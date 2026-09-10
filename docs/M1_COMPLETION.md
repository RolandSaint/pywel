# M1 — public-safe canonical source

> Historical checkpoint for M1 commit `c61d1856667b654a181cda7bbc28b720e2023c22`. Its SQLite output, build behavior, test counts, dependency findings, and remaining work describe that revision. See M2_COMPLETION.md for the runtime checkpoint and M3_COMPLETION.md and OPERATIONS.md for the current candidate.

M0 is adopted and M1 is complete for the inspected source candidate on `agent/m0-m1-public-safe-canon`. Merge into private `main` remains a reviewed GitHub action. M2–M5 are pending; this is not PUBLIC RELEASE READY.

The starting GitHub revision is `42bcd25220998a8f26e2cd1ce57ece8a756b36d5`. The authoritative product boundary and finish line are in [RELEASE_SCOPE.md](RELEASE_SCOPE.md) and [ROADMAP_TO_1_0.md](ROADMAP_TO_1_0.md). The final selection, excluded IDs/reasons, canonical-file digests, and rights decisions are in `quality/public-release-scope.json` in the source checkout.

## Retained dataset

| Family | Baseline | M1 |
| --- | ---: | ---: |
| Entities | 1,984 | 310 |
| Claims | 8,048 | 1,396 |
| Evidence | 787 | 77 |
| Patches | 27 | 27 |
| Bulk patch changes | 1,512 | 0 |
| Full-note completeness reviews | 27 | 0 |
| Strategies | 115 | 1 |
| Acceptance/provenance receipts | 68 | 1 new public selection receipt |

The historical ceiling remains 1.14.00. Fifteen patches have identity-only coverage; twelve have partial coverage. No patch has exhaustive coverage or a complete official-note review. Existing normalized-claim counters retain the validator's historical creator exclusions; they must not be presented as all source-linked facts. The one strategy is source-supported and unobserved; its warning is accepted without claiming gameplay confirmation.

The selection excludes 10,757 original records. Removed cohorts include personal preferences/state/custom builds; evidence with unresolved rights or unverifiable private permissions; unverified Fandom material and dependent assertions; locator-only gameplay claims; copied publisher patch prose/bullets and derived verification strategies; obsolete private receipts; and unsupported/unused identities. Entity summaries are neutral and unsupported reference links are removed. Claim statuses and review-through patches are not promoted.

Historical imports, seed/profile scripts, personal status history, and content-wave eval fixtures are removed. The builder no longer loads deleted catalog-import manifests or enforces the obsolete catalog readiness threshold. Remaining legacy runtime/process code is explicitly M2 work.

## Rights and provenance

The 77 evidence records comprise 49 CrimsonWiki sources and 28 official publisher notices. Each appears exactly once in [THIRD-PARTY-DATA.md](../LICENSES/THIRD-PARTY-DATA.md). Source policy and rights were reviewed on 2026-09-10. The final inspection found no remaining copied patch prose, personal values, private artifact locators, or stale Fandom licensing tags in the retained canon.

Software remains Apache-2.0. [LICENSE-DATA](../LICENSE-DATA) applies CC BY-SA 4.0 only to rights the contributing licensors hold; publisher IP and other third-party rights remain separate. [DATA_RIGHTS.md](../DATA_RIGHTS.md), [SOURCE_POLICY.md](SOURCE_POLICY.md), and [CONTRIBUTING.md](../CONTRIBUTING.md) define attribution, contributor rights, unofficial status, and correction/removal rules. No blanket commercial or legal clearance is claimed.

The new public receipt hashes the 1,811 retained entity/claim/evidence/patch/strategy records. Public JSON and SQLite retain the same necessary receipt and pass graph/hash validation. It proves this subset's byte integrity, not original private ingestion, source availability, factual truth, or permission. Original receipt payloads are not relabeled as unchanged public evidence.

## Verified source boundary

The public-source unit is `npm run m1:export` output at `dist/public-source`, with an exact `SOURCE_MANIFEST.json` inventory and SHA-256 digests. Export it after the build, because the existing builder replaces `dist/`. The command refuses to overwrite an existing candidate; preserve or remove disposable output deliberately before another export.

Verification checks canonical schemas and references, exact retained IDs and file hashes, exclusions, admissible evidence cohorts, complete attribution, public receipt integrity, required license/contribution documents, text/secret policy, and actual snapshot bytes. The source-only candidate excludes original Git metadata/history/refs, private release assets, imports, operational history, dependencies, caches, and credentials. Snapshot checks reject added/missing/tampered files, invalid metadata, scope-hash mismatch, symlink escapes, Git metadata, and missing licensing files.

The selected working source and clean export passed these checks and a scoped manual privacy/rights review. Searches also found no retained original private path labels, personal email values, personal budget, or named private reviewer. Pattern scans are review evidence, not a guarantee about all possible secrets. Original private history was excluded, not certified clean. No personal-system data was accessed or introduced, and no repository visibility, release, hosting, or deployment was changed.

## Validation and limitations

Reproduce with the pinned Node 24.18.0 environment:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run test:determinism
npm run m1:export
```

`npm run check` covers repository policy, canonical validation, M1 scope, type checking, retained tests, build, and distribution verification. Scope tests cover adversarial snapshot changes; publication tests reject missing, private, tampered, or incomplete receipt scopes. Historical content-wave assertions were retired, while structural/query/API/MCP/privacy/storage checks were retained or moved to synthetic fixtures.

Canonical validation has zero errors and one documented `strategy_unobserved` warning. The M1 source audit has zero unresolved rights holds, source-policy violations, or public provenance errors. Build/distribution verification passes on Node 24.18.0. All 191 retained tests across 35 files pass, including nine adversarial source-boundary tests. Test discovery is restricted to source `tests/` so generated source snapshots cannot run duplicate stale tests. The pull request records byte-reproduction checks for the candidate.

Production dependency audit still reports two high and three moderate vulnerable packages, with no critical packages. The high findings are `fast-uri` and `ip-address`; the moderate findings are `hono`, `@hono/node-server`, and `qs`. The existing CI audit remains enforced and blocks the broader guarded build until addressed. M1 completion does not claim a green production security gate or authorize serving a public runtime.

M2 must remove unnecessary services/write/model/process components, fix known patch-freshness and predicate-matching errors, simplify legacy count/readiness semantics, resolve surviving dependency findings, and prove the local read path. Later milestones must freeze the agent contract and demonstrate independent installation, operation, and final release readiness. Do not restore excluded content or bypass security checks to make old gates green.
