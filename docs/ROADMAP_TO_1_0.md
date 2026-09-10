# Roadmap to PUBLIC RELEASE READY

M0 was adopted on 2026-09-10. The product definition, fixed dataset rule, keep/delete/defer decisions, public-source boundary, and complete definition of done are in [`RELEASE_SCOPE.md`](RELEASE_SCOPE.md).

**Current acceptance: M0–M5 are complete for their recorded scope. Software 1.0.0 is PUBLIC RELEASE READY for the named clean source snapshot and checksummed artifact set in [M5_COMPLETION.md](M5_COMPLETION.md).** M1 source evidence is in [M1_COMPLETION.md](M1_COMPLETION.md), `quality/public-release-scope.json`, and `npm run m1:check`. [M2_COMPLETION.md](M2_COMPLETION.md) records the runtime candidate; [M3_COMPLETION.md](M3_COMPLETION.md) records contract conformance; [M4_COMPLETION.md](M4_COMPLETION.md) records independent operation, correction, recovery, and review. M5 identifies which prior evidence remains applicable and records the final checks. The public source starts from that certified clean snapshot with reviewed publication-only changes; release notes identify the public commit and artifacts. Original private development history remains excluded. A passing M1 check establishes its source-boundary scope only.

| Milestone | Outcome and acceptance criteria | Dependencies | Blockers and deletion work |
| --- | --- | --- | --- |
| **M0 — FINITE RELEASE SCOPE DEFINED** | **Adopted.** Fixed general-knowledge dataset selection, historical coverage through 1.14.00, English/offline/local read interfaces, zero required personal/cloud/model dependencies, and an inspected-candidate finish line. | Review of baseline `42bcd25220998a8f26e2cd1ce57ece8a756b36d5`. | Supersede whole-game percentages, mandatory hosting/domain/model operation, and repeated finalization requirements. |
| **M1 — PUBLIC-SAFE CANONICAL SOURCE** | **Verified source candidate complete.** Final record manifest; personal/preferences/state and private metadata removed; rights-held evidence and unsupported dependent claims removed or resolved; safe provenance complete; code/database licensing and attribution explicit; all canonical data validates; selected source snapshot and exposure boundary pass privacy/secret review. | M0. | Publication-unsafe records, unresolved rights, broken public provenance, and unsafe original history. Delete unsafe import/private operational material; exclude original history/refs/assets from the clean public-source candidate. |
| **M2 — SIMPLE, RELIABLE READ PATH** | **Verified runtime candidate complete.** One build produces the public bundle. Loopback REST and stdio MCP validate canonical JSON and share its public projection and query implementation. Unknown-patch, claim-freshness, and query/predicate-matching defects are fixed. Surviving dependency findings are resolved; actual install/start/read/shutdown works. | M0; can overlap M1. | Remove optional writes/models/cloud dependencies, obsolete gates/queues, duplicate outputs, and seed machinery. Collapse finalization/review chains. Remove unneeded Docker, SQLite, HTTP MCP, and Cloudflare paths. |
| **M3 — STABLE AGENT CONTRACT** | **Verified contract candidate complete.** One authoritative response schema types all 16 REST operations and nine MCP tools, with the same response bodies and finite conformance/parity cases. Compact v3 preserves typed assertions and validity; compact/full limits, truncation, uncertainty, evidence, strict inputs, English retrieval, context defaults, and version rules are explicit. Canonical data remains fixed. | Verified M1 and M2 candidates. | Remove generic output schemas, cursor pagination, duplicate MCP wrappers/freshness, implicit spoiler escalation, and unsupported locale/token-budget promises. Any schema or adapter-conformance failure blocks acceptance. |
| **M4 — INDEPENDENTLY REPRODUCIBLE RELEASE CANDIDATE** | **Verified reproducible candidate complete.** Another operator uses a fresh checkout without personal configuration to install, validate, test, build twice, compare declared hashes, query retained adapters, propose one correction, and restore a prior candidate. CI and one scoped review pass; findings and actual resource measurements are recorded against the candidate. | M3. | Remaining defects, outdated instructions, unproven operation, security/rights findings, and unreproducible packaging. Replace ceremony with specific evidence and relevant rechecks. |
| **M5 — PUBLIC RELEASE READY** | **Complete for the software 1.0.0 candidate identified in [M5 acceptance](M5_COMPLETION.md).** Every definition-of-done item passes on that named commit and checksummed artifact set: safe exposure boundary, absent secrets/private material, valid canonical data, resolved rights/licenses, passing tests/security gates, reproducible outputs/install, stable documented interface, clear contribution/legal policies, independent operation, and no known critical blocker. The checklist explicitly records **PUBLIC RELEASE READY**. | M4 and final candidate diff review. | Any unresolved critical privacy, rights, correctness, security, or reproducibility finding blocks completion. Live publishing, a domain, model operation, and whole-game coverage are not prerequisites. |

The dependency order is M0 → M1 and M2 → M3 → M4 → M5. Existing working components and validation evidence can be reused where still applicable. Milestone completion requires its outcome, not framework existence, an old accepted label, a content count, or a narrow green check.

## M1 exposure decision

At M1, the source of truth was the private GitHub project. M1 selected a clean deterministic public-source snapshot with safe provenance and a checksummed inventory. The new public repository is the ongoing source of truth. It excludes the original `.git`, private history, refs, release assets, local settings, and caches. The original private repository must not be exposed as a shortcut. This does not certify its historical contents as safe.

M1 completion prepared the safe source. It neither froze the API nor claimed the surviving runtime and release bundle were finished. The M1 milestone did not authorize public visibility, publication, deployment, resource purchase/provisioning, model funding, or outside contact.

## M2 runtime acceptance

M2 removes the old catalog/depth quotas, readiness/finalization contracts, review-handoff chains, model/manager/capture pipelines, write inboxes, queues, cloud/HTTP MCP/SQLite/container paths, and duplicate human/static outputs. These components no longer control acceptance or create a coverage obligation.

The M2 regression tests and actual local reads demonstrate these corrections:

- An unknown/future patch or a context newer than a claim's own review boundary cannot be reported as unqualified support.
- `Is Axiom Bracelet an item?` cannot be supported by `patch.changed_interface` alone.
- `Is City of Hernand a location?` cannot be supported by `location.service` alone.
- Patch identity and note ingestion cannot refresh unrelated claims.

M2 verification covers a locked install, zero reported dependency vulnerabilities, passing tests, reproducible offline output, and actual local start/read/shutdown without personal configuration or paid services. The milestone commit and GitHub CI result are linked from its completion record. The dataset remains fixed. M3 records final typed-response and compatibility conformance; M4 records independent operational evidence within its documented environment and limits.

## M3 contract acceptance

The [agent guide](API_V1.md), [response schema](../schemas/agent-contract.schema.json), [OpenAPI](../openapi/openapi.json), and [compatibility policy](COMPATIBILITY.md) define the finite contract. M3 completion records passing evidence for:

- Typed success/error bodies for every retained REST operation, matching MCP tools/resources, and schema-validated examples plus rejected invalid shapes.
- Stable canonical IDs, redirect resolution, exact evidence retrieval, context defaults, strict English input, and offset pagination with source-build identity.
- Compact typed predicates/objects/validity, bounded full retrieval, exact selection counts, preserved warnings/gaps, and visible truncation.
- Unknown/future patch, stale review, unsupported predicate, disputed support, spoiler ceiling, and platform filtering cases, including uncertainty beyond the returned cap.
- Reproducible artifacts/source export, canonical bytes unchanged, passing tests and security gates, and a separate milestone commit with GitHub CI.

The contract does not require a new dataset wave, service, runtime dependency, schema-hosting endpoint, client SDK, compatibility layer, or automated updater. [M4 completion](M4_COMPLETION.md) records independent operation and restore of the named release candidate. [M5 acceptance](M5_COMPLETION.md) records the final public-readiness checklist for software 1.0.0 without expanding the retained dataset or interface.

Commit and push after each completed milestone. Main-branch acceptance remains a separate reviewed merge with passing required checks. M5 records readiness for the named source snapshot and artifacts. The separately authorized v1.0.0 publication begins new history from that source boundary; it does not expose the original private development repository or authorize later releases and deployments.
