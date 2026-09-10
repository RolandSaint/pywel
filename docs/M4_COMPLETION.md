# M4 — independently reproducible release candidate

> Historical checkpoint for M4 commit `71959624fd5940a9eb66c482a3518fb0f058184d`, tree `9ce9005676fd4f24b00d22e2bf855c605faa2598`. Its verification, measurements, and pending M5 statements describe that revision. See [M5 acceptance](M5_COMPLETION.md) for the final software 1.0.0 source snapshot, artifacts, and PUBLIC RELEASE READY decision.

M4 is complete for the independently reproduced release candidate on the milestone branch in private development PR #189 (historical review; not required for public operation). Main-branch acceptance remains subject to review. M5 remains pending; Pywel is not PUBLIC RELEASE READY.

The exercise starts from GitHub M3 commit `a1d9b12fe0b4ec0f3c61b9b631d773858af8f2c0`, tree `ffb6ff72130aa4a6fc7d809c093b1e673db3945a`. The final M4 commit, exact source/export/bundle identities, independent reproduction result, and CI run are recorded in private development PR #189 (historical review; not required for public operation). Digests of the final artifacts are kept outside their own source inputs to avoid self-reference.

## Independent operation and recovery

An independent assistant operator received the immutable M3 source export and its trusted review digests, without the builder's conversation history or working checkout. The operator independently verified every file and reconstructed a separate Git working directory containing only the 161 declared source files. The source tree matched GitHub; original private history, export metadata, installed dependencies, and generated output were not copied into the new history. The immutable export stayed unchanged.

The operator installed locked dependencies into a fresh directory, checked the pinned Node runtime, ran all required checks, built twice, compared exact file inventories and bytes, and regenerated the source export. Both M3 artifact identities matched the previously recorded candidate:

| M3 baseline identity | Verified value |
| --- | --- |
| Build ID | `bld_1f2c6aa39792ffeb68418353` |
| Bundle checksum-file SHA-256 | `6e42f4b7213bc5bfb17aa89c34aaaf85b58c896d519bafac8d1130dd3642c30d` |
| Source-export manifest SHA-256 | `e5e233f0a930e222f89a9343254db78cc4c447a8f1db1a6d206630f782b1227d` |

Real compiled REST and stdio MCP processes returned matching service, codebook, search, supported, stale-review, unknown-patch, evidence, and missing-evidence results. REST remained on loopback; MCP exposed nine read tools and two resources. SIGINT, SIGTERM, and MCP stdin closure shut down cleanly. Linux seccomp denied outbound connect/send operations in the adapter processes, with an active denied-call probe confirming the restriction.

The operator identified an actual maintenance obstacle: export verification, copying, initial Git identity, and restore were described only in prose. A reviewed two-document correction added executable commands using Node built-ins, an externally supplied trusted manifest digest, an absent destination, explicit local Git identity, and saved baseline hashes. The operator independently executed the documented copy command, applied the reviewed correction, passed checks, and committed it locally. Its build changed to `bld_2fb4c215f888ce26cf9e9286`, with checksum-file SHA-256 `528bf8001a1fbc3774aaf69561d69b193cb598c7c74bf6019b55da952aa890c1`; canonical bytes stayed fixed. Recovery returned to exact M3 source, reinstalled, passed all 137 baseline tests, regenerated every artifact byte, and repeated the reads and shutdown checks successfully. New local commit IDs identify the exercise history; the GitHub revision separately identifies authoritative source.

The final M4 export is independently verified and reconstructed again after the reviewed fixes and completion metadata are assembled. Its rebuilt data and source export match the final digests recorded in the PR. Restoring the earlier M3 candidate uses its own source and schema; it does not require a compatibility layer in M4.

## Scoped review and corrections

The independent review covered source and artifact inventories, immutable export boundaries, fixed canonical selection, provenance receipts, publication projection and rights holds, build identity, REST/MCP inputs and read-only behavior, query uncertainty and graph traversal, and recovery instructions. It found no unresolved release-blocking issue in that surface after these corrections:

- A graph that exactly filled its edge limit could incorrectly report truncation when revisiting an already returned edge. Skipping the duplicate before applying the cap fixes this with one line. A regression covers complete eight-edge traversal, the exact cap, and a smaller cap that really truncates.
- The export-to-checkout instructions now run without installing into or altering the export. Tests of the exact documented block cover a valid copy and refusals for a wrong trusted digest, changed source, an existing destination, an unexpected directory, and linked manifest/source files.
- Release-scope metadata moves explicitly to `pywel.public_release_scope.v2`. The old version constrained M4/M5 to `pending`; widening it silently would violate M3's compatibility policy. The replacement schema declares the already adopted milestones' finite statuses while preserving the publication boundary. The [migration note](COMPATIBILITY.md#m4-release-scope-metadata-migration) explains the affected version and invalid old/new combinations. The old schema remains available at the M3 checkpoint.

No canonical data, dependency, adapter surface, canonical record format, agent response format, API version, or codebook version changes. M4 retains 310 entities, 1,396 claims, 77 evidence records, 27 patch identities, one source-supported unobserved strategy, and one public receipt. Selection, canonical hashes, exclusions, rights decisions, and original-history boundary remain fixed. Scope metadata changes only its schema version and M4 status.

Integrated checks pass **139 tests across 17 files**, type checking, canonical validation, repository policy, source-boundary checks, build, and distribution verification. Validation has zero errors and the unchanged `strategy_unobserved` warning; no gameplay observation credit is claimed. The full dependency audit reports zero vulnerabilities on 2026-09-10. Final GitHub checks run against the milestone commit. M4 adds no service, dependency, standalone operational tool, deployment path, automated updater, or extra approval process.

## Measured cost and limits

Measurements below describe the independent M3 baseline exercise in the shared managed Linux x86-64 environment: Node **24.18.0**, nine visible logical CPUs, an eight-CPU quota, and a 20 GiB memory limit. These describe the measurement environment, not minimum machine requirements.

| Operation | Elapsed seconds | Largest child peak RSS, KiB |
| --- | ---: | ---: |
| Fresh dependency-directory install | 1.814 | 335,664 |
| Full check, 137 baseline tests | 15.157 | 313,680 |
| Standalone data build and compilation | 1.122 | 156,432 |
| Two-build determinism check | 4.345 | 208,348 |
| Production dependency audit | 7.343 | 99,720 |

Each command was measured from a fresh measuring process using elapsed monotonic time and `RUSAGE_CHILDREN`. RSS is the largest child-process peak for that command, not simultaneous process-tree memory. Baseline retained logical sizes were 3,882,227 bytes for the immutable source export, 128,038,425 bytes for installed dependencies, 3,376,669 bytes for the data bundle, and 194,127 bytes for compiled runtime. These are retained footprints, not transient peak disk usage. Final M4 sizes and reproduction results are recorded in the PR.

The independent install used a fresh dependency directory with cached public npm packages and the existing pinned Node binary. A separate-cache online bootstrap failed in the managed environment; a cold registry download was not established. Empty npm configuration and disabled global/system Git configuration kept personal settings out. The dependency audit used the managed network configuration; compiled reads ran with outbound networking blocked. Required project build/read operation uses no paid model calls and provisions no services.

Independence here means another assistant operator and a separate source reconstruction in the same environment. It is not a separate human, machine, operating system, or independently provisioned toolchain. The scoped review does not re-prove every gameplay assertion, live source availability, private history, or legal rights. The fixed dataset's dated rights dispositions and explicit uncertainty remain in force.

## Remaining acceptance

M5 must apply every release definition-of-done item to one final named commit and artifact set and record **PUBLIC RELEASE READY** only when there is no unresolved critical blocker. The [roadmap](ROADMAP_TO_1_0.md) remains authoritative. Main-branch acceptance still requires review; public visibility and publishing are separate actions. Original private history stays excluded. No personal systems or data were accessed, and no publication, deployment, paid resource, or outside contact occurred.
