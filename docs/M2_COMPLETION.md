# M2 — simple, reliable read path

> Historical checkpoint for M2 commit `4bbb01a2b73b8e50297bfb71c15b438484a45bd2`. Its counts, interface candidates, and remaining milestones describe that revision. See M3_COMPLETION.md and API_V1.md for the current contract candidate.

M2 is complete for the verified runtime candidate on `agent/m0-m1-public-safe-canon`. Its separate milestone commit, exact candidate hashes, and GitHub CI result are recorded in private development PR #189 (historical review; not required for public operation). Main-branch acceptance remains subject to review. M3–M5 remain pending; Pywel is not PUBLIC RELEASE READY.

M1 commit `c61d1856667b654a181cda7bbc28b720e2023c22` is the fixed source/data checkpoint. M2 changes no `data/**` bytes: 310 entities, 1,396 claims, 77 evidence records, 27 patch identities, one source-supported unobserved strategy, and one public provenance receipt. Only the M2 milestone status changes in the release-scope manifest; its record selection, hashes, exclusions, rights decisions, and publication boundary stay fixed.

## Surviving implementation

Canonical JSON, schemas, and vocabulary feed one validated public projection and one query implementation. Local loopback REST and stdio MCP read that canonical source directly. One build writes a deterministic offline JSON/JSONL bundle to `dist/data` and compiles the runtime to `dist/runtime`. Rebuilding removes obsolete compiled modules and preserves separately prepared source exports.

The bundle has 46 text files: corpus, six record-family JSONL files, two vocabularies, 16 schemas, 11 guides, root documentation/notices, OpenAPI, manifest, and checksums. Copied schemas/notices and the exact artifact inventory are checked against source. Standalone checks establish internal integrity; trusted source identity is still required. Checksums are not signatures or proof of gameplay truth.

| Measure | M1 checkpoint | M2 candidate |
| --- | --- | --- |
| Source files | 320 | 151 |
| Generated data/site files | 764 | 46 |
| npm scripts | 52 | 14 |
| Locked dependency packages reported by audit | 278 | 213 |
| Reported production vulnerabilities | 2 high, 3 moderate | 0 |
| Required models, paid services, personal systems | No release requirement | None used by retained runtime |

Removed model/manager pipelines, public write intake, attestations, captures, watchers, queues, catalog/depth quotas, benchmark/finalization/review orchestration, seed machinery, Cloudflare/Worker deployment, Docker, SQLite, HTTP MCP, and human-page generation. Removed the empty bulk patch-change and full-note-review runtime families, schemas, routes, tuples, and freshness exemptions. No compatibility or replacement orchestration layer was added.

## Correctness and boundaries

Game-version applicability uses indexed patch identities and explicit per-claim review boundaries. Historical patch counters describe a retained subset; they cannot establish completeness or refresh facts.

| Query/context | Verified result |
| --- | --- |
| Controller remapping at reviewed patch `1.09.00` | Supported publisher intent, with evidence and observation limits. |
| Controller remapping at known patch `1.14.00` | Partial, with a claim review gap. |
| Controller remapping at future `9.99.00` | Unknown, with `patch_unknown`. |
| `Is Axiom Bracelet an item?` | Unknown; interface-change claims cannot establish classification. |
| `Is City of Hernand a location?` | Unknown; service claims cannot establish classification. |

Tests also cover missing/conflicting patch context, historical supersession, contradictions, compound-question gaps, stale/retracted/unknown facts, empty and instruction-shaped queries, filtering, pagination, and REST/MCP parity. Metadata-only schemas placed inside canon are rejected. Canonical/schema/build input symlinks are rejected, as are source-export escapes, missing or tampered provenance, extra bundle files, and altered copied artifacts even after checksums are refreshed. Retired write and HTTP MCP routes return 404, including when obsolete write toggles are set.

## Verification record

Verification uses pinned Node **24.18.0** and the checked-in lockfile. The final required check passes **94 tests across 14 files**, type checking, source policy, canonical validation, fixed dataset/rights/provenance checks, build, and source-bound distribution verification. Canonical validation has zero errors and one unchanged `strategy_unobserved` warning; no gameplay observation credit is claimed. Both production and full dependency audits report zero vulnerabilities on 2026-09-10.

Reproducibility requires two clean data builds with identical inventories and bytes, and two clean source exports with identical files and manifests. Exact final build identity and digests are recorded in the milestone PR because embedding an artifact's own digest in its source would change that artifact. Export verification includes the original-history exclusion and strict immutable `SOURCE_MANIFEST.json` boundary.

An isolated fresh Git checkout passed `npm ci` in about 8 seconds and the full check in about 12 seconds in the review environment. Real compiled REST and stdio MCP processes started, read known/unknown cases, and exited 0 on SIGTERM with outbound Node networking disabled and no personal configuration or credentials. MCP exposed 10 read-only tools. This operational check used the same locked dependencies and runtime paths before the final input/artifact guards; the final integrated tests cover those guards. Timings are measurements, not service commitments.

Reproduction commands and local start/read/shutdown instructions are in [README](../README.md), [API_V1](API_V1.md), [OPERATIONS](OPERATIONS.md), and [PORTABILITY](PORTABILITY.md). Installation runs in a Git working checkout. Source exports remain immutable; creating a separate working checkout does not weaken the export guard. Commit and push after each milestone, with review and required checks before merging private main.

## Remaining scope

M3 freezes the supported agent schemas, typed responses, compatibility rules, and finite conformance cases. Candidate heuristic retrieval is not a general natural-language reasoning guarantee. M4 independently verifies the final candidate's export-to-checkout transition, reproduction, correction, and restore. M5 alone establishes PUBLIC RELEASE READY. Coverage expansion, hosted access, and speculative features remain deferred.

The original repository and history remain private and excluded from eventual publication. No personal systems were accessed. No public visibility, publishing, deployment, paid resources, model calls, or outside contact occurred.
