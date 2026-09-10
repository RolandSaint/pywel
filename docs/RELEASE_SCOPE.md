# Initial public release scope

Adopted 2026-09-10 as M0. This document and `docs/ROADMAP_TO_1_0.md` supersede earlier scope and release-completion requirements. M2 removed the superseded implementations. M3 verified the stable agent contract without adding canonical data, dependencies, services, or another supported transport. [M5 acceptance](M5_COMPLETION.md) records software 1.0.0 as PUBLIC RELEASE READY for one named clean source snapshot and checksummed artifact set. Milestone acceptance requires recorded verification. The v1.0.0 publication uses that certified source boundary; its public commit and artifact identities are recorded in the release notes.

## Product and fixed dataset

Pywel v1 is an unofficial, machine-readable Crimson Desert knowledge contract, a bounded reference dataset, and a small reference implementation. Public source history begins with the inspected clean snapshot. An agent can retrieve evidence-linked answers with explicit version and uncertainty context using offline files or local read-only interfaces.

The initial dataset is selected from the reviewed GitHub baseline `42bcd25220998a8f26e2cd1ce57ece8a756b36d5`. Retain only general game knowledge with a resolved publication disposition and safe, resolvable provenance. Remove user preferences, personal playthrough state, private metadata, rights-held evidence, and assertions that lose all admissible support. Preserve valid identity-only records and explicit uncertainty; no coverage percentage can expand the release obligation.

`quality/public-release-scope.json` enumerates the final selected record IDs and source boundary. Scope changes require a reviewed reason and manifest diff. No new catalog expansion is necessary except to repair a retained record or satisfy an explicit conformance case. The patch ceiling is 1.14.00, describing historical indexed coverage only. Later patches are dataset updates, not a moving release prerequisite.

## Retain, delete, defer

Retain canonical JSON, stable IDs, atomic claims, safe evidence and provenance, explicit uncertainty, patch review boundaries, versioned schemas, meaningful validation, deterministic query code, JSON/JSONL exports, manifest/checksums, and reviewed Git contributions. Retain local read-only REST and stdio MCP over the shared query implementation. M2 removed SQLite and HTTP MCP: neither has a demonstrated consumer requirement that justifies retaining another supported path.

Remove or collapse Atlas/model pipelines, manager/verifier machinery, capture/OCR tooling, public contribution and attestation writes, queues, mandatory cloud/domain deployment, expanding catalog thresholds, six-pass finalization, and required independent-benchmark quotas. Retire historical seed/import scripts once accepted data and necessary safe provenance stand independently. M1 removes publication-unsafe material; M2 completes runtime and process simplification.

Required operation uses zero paid model calls, zero provisioned services, and zero personal-system dependencies. The first release needs one verified local Node installation and read path. A container, hosted endpoint, custom domain, rich human website, and automated updater are deferred future decisions, with no dormant implementation retained.

## Public-source boundary

GitHub remains the only source of truth. The private development repository and its original history stay private. Public source starts as a deterministic clean snapshot from one reviewed revision, including the safe canonical data, necessary provenance, schemas, code, licenses, documentation, and checksummed inventory.

Exclude original `.git` data, historical refs, private release assets, caches, local settings, credentials, and personal records. This boundary avoids exposing unreviewed original history; it does not declare that history clean or create a second ongoing authority. The public repository begins with the inspected snapshot and accepts ordinary reviewed history from then on. In the retained scope-v2 manifest, `original_repository_visibility: private` and `public_visibility_authorized: false` record the original development repository boundary and the M0 scope decision; they are not the current public repository status. Current source metadata is in `000_LOAD_FIRST_PYWEL.yaml`.

M1 checks the source snapshot boundary. M2 verified generated data bundles and their source/artifact identity. M3 adds typed response contracts and bounded adapter parity; [M4 evidence](M4_COMPLETION.md) records independent reproduction, correction, and restore of the named candidate. [M5 acceptance](M5_COMPLETION.md) applies every definition-of-done row to the final named source snapshot and artifacts. The original M0 scope authorized readiness work, not publication. The separately authorized v1.0.0 publication preserves the original-history exclusion and adds no deployment, cloud resource, domain, or outside-contact requirement.

## Definition of done before public release

| Area | Done means |
| --- | --- |
| Canonical data model | Every retained ID is in the fixed manifest. Atomic typed claims carry evidence, status, applicability, conflict/supersession, and review context. Personal preferences and state are absent. |
| Schemas | Every public record family and supported consumer response has a locally resolvable versioned schema, compatibility policy, and meaningful valid/invalid examples. Closed objects do not promise additive-field compatibility; affected contract changes require a new version. |
| Validation | All canonical documents, unique IDs, graph references, redirects, evidence, receipts, and patch intervals validate. Warnings have explicit dispositions and never silently increase confidence. |
| Provenance and evidence | Each substantive assertion has specific inspectable support and a resolved publication disposition. Safe public receipts resolve. Inaccessible evidence and limits are explicit; hashes prove integrity only. |
| Patch/version handling | Schema, API, dataset, source/build, and game patch identities are distinct. Default patch assumptions are disclosed. Unknown/future patches and expired claim reviews produce gaps; note ingestion does not refresh unrelated claims. |
| Agent consumption | Short discovery leads to offline manifest, schema/codebook, bounded retrieval, and evidence. Identity, search, redirects, unknown/partial/conflict, offset pagination, full detail, and truncation are documented and demonstrated. `en-US` retrieval, strict spoiler defaults, platform-union semantics, and full/compact record limits are explicit. |
| REST/MCP or equivalent | Offline files suffice. Local read-only REST and stdio MCP have shared semantics, typed output, consistent identity/context, and parity tests. Public writes are absent from supported release behavior. |
| Generated artifacts | One documented JSON/JSONL bundle, schemas, manifest, and checksums have exact inventories tied to inputs and builder. Two clean pinned-runtime builds produce identical declared bytes. No SQLite output or database service is required. |
| Tests | All retained tests and finite conformance cases pass on the named candidate, including evidence, uncertainty, patch boundaries, applicable filters, malformed input, privacy, and artifact integrity. |
| Security and privacy | The selected source, artifacts, metadata, and exposure boundary contain no secrets or private/user-specific material. No personal dependency or known critical blocker remains; high/critical production dependency findings are closed. Source content remains data, never instructions. |
| Portability | Another operator installs, validates, builds, and reads without the builder's filesystem, accounts, cloud, or models. Builder constraints and portable consumption are documented separately. |
| Deployment | One reproducible local Node install/start/read/shutdown path passes. Each additional claimed container/host path is tested as packaged or omitted. No domain or live service is required. |
| Documentation | README explains purpose, unofficial status, authority, scope, quickstart, interfaces, limits, and update/release/restore. Primary instructions and examples work on the candidate. |
| Contributor workflow | A root-discoverable guide and PR template require atomic changes, source/context/rights information, privacy boundaries, and relevant checks. Acceptance is reviewed Git, not automatic promotion. |
| Licensing and legal boundaries | Code/database scopes and notices are explicit; every retained source has a resolved disposition and attribution. Dated source-policy review, unofficial status, contributor rights, and correction/takedown route are documented. |
| Operational cost | Required reads/builds use no paid model or provisioned service. Actual source/bundle size, build/test time, and named runtime/machine requirements are recorded. Hosting has no implied promise or budget. |
| Maintenance | A maintainer manually reviews a source/patch, updates or supersedes affected claims, validates, regenerates, reviews the diff, releases, and restores a prior candidate. Staleness stays explicit; no unsupported freshness SLA. |
| Public release readiness | One named commit and artifact set meet every row. An independent operator completes reproduction; one scoped review has no unresolved critical findings. The final checklist explicitly records PUBLIC RELEASE READY. |

The standard is complete at that point; the game need not be exhaustively known. Publication follows readiness; the v1.0.0 release notes identify the accepted public source and its verification. Any subsequent candidate change gets proportionate review and the affected checks again.

## Useful after release

- Expand or refresh coverage in response to actual unanswered agent questions.
- Observe important gameplay gaps and publish the limitations of source-only claims.
- Measure consumer value and token cost with a scoped external benchmark.
- Add one hosted read endpoint when consumers need continuous access.
- Add container/package bindings or contributor conveniences when repeated use demonstrates their value.
- Add lightweight patch notifications after the manual maintenance process works and missed updates become an observed problem.

## Do not build without demonstrated need

Autonomous truth editors, Atlas/manager/verifier orchestration, public write APIs, attestations and reputation systems, queues, generalized provider/storage compatibility layers, capture/OCR agents, personal playthrough profiles, personal integrations, multiple clouds, failover, managed databases, vector/LLM search, a rich human wiki, accounts, multilingual retrieval, and recursive review machinery are outside scope. Game extraction or automated game/service access also requires documented rights-holder authorization.

Deferred ideas are not an authorized backlog. Do not retain dormant components solely for hypothetical flexibility.
