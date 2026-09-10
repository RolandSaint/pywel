# M5 — PUBLIC RELEASE READY

> Historical checkpoint for certified M5 commit `e054cc101bdbe3cd1a8b3e49c69c38572756b795`. The acceptance statements below describe that private-development revision. The public source starts from its verified clean snapshot with narrowly reviewed publication documentation and a main-push CI trigger. Current public commit, build, and artifact identities belong to the [v1.0.0 release record](https://github.com/RolandSaint/pywel/releases/tag/v1.0.0), not the historical values below.

**Pywel reference source 1.0.0 is PUBLIC RELEASE READY for the inspected clean source snapshot and its checksummed data artifacts.** All required outcomes in [RELEASE_SCOPE](RELEASE_SCOPE.md) are complete for this candidate. No known critical blocker remains within that boundary.

The separate M5 commit, Git tree, source inventory, source-export manifest digest, build ID, bundle checksum-file digest, independent verification, and successful GitHub CI run are recorded together in private development PR #189 (historical review; not required for public operation). These identities are recorded outside their own build inputs to avoid self-reference. Use that named artifact set; a later changed revision needs proportionate review and affected checks again.

The original development repository remains private, and its history, refs, release assets, and local configuration are excluded, not certified clean. Main-branch acceptance remains a reviewed GitHub action. This milestone does not merge, publish, deploy, or change visibility. When publication is authorized, begin public history with the verified clean snapshot using [OPERATIONS](OPERATIONS.md).

## Certified M5 identities

This public-safe summary preserves the accepted M5 evidence without requiring access to the private review. The source and artifact hashes identify that earlier candidate; publication documentation changes produce a different source/build identity while retaining the certified canonical data and frozen contracts.

| M5 item | Accepted value |
| --- | --- |
| Source commit | `e054cc101bdbe3cd1a8b3e49c69c38572756b795` |
| Source tree | `b6f2c7f234d4b9660a7140ed6466fa4f88efa44e` |
| Source inventory | 163 files / 3,892,415 bytes |
| Build ID | `bld_74fe234e0295709d7c85f2bf` |
| Bundle inventory | 54 files / 3,409,362 bytes |
| Bundle checksum-file SHA-256 | `3a560084f25c143f9a3b6031316777e35caaca59857b4f190820a424fb0a937a` |
| Source-export inventory | 164 files / 3,916,799 bytes |
| Source-export manifest SHA-256 | `c629a09de02de6eb5a3773986a83632ec977bff0d7f7679716c46f3ec0602d0f` |
| Fixed release-scope SHA-256 | `9bea33a672f0d2043e19e706e4d67cd8537823ad47154242916422c53c7aeb7f` |
| Private-development CI run | `34484156177`, passed against the accepted M5 commit |
| Tests | 139 passed across 17 files |
| Independent final operator report SHA-256 | `e7706e84e6134924e8a584a6341b3a0f7f5e4c21af0bd6fed16cf652490ec5c5` |

The independent operator verified the exact source/export inventory, reproduced both artifacts, and passed compiled REST/MCP reads and clean shutdown with outbound networking blocked. Final source, privacy/security, rights/attribution, and documentation reviews found no unresolved critical blocker. No private Git objects, original refs, private release assets, or personal configuration accompany this summary. The limitations in the original acceptance record remain in force.

## Final acceptance checklist

Reviewed on **2026-09-10**. Earlier milestone evidence is retained at its named checkpoint; the final source and artifacts receive the checks described below.

| Area | Result and acceptance evidence |
| --- | --- |
| Canonical data model | **PASS.** The fixed selection contains 310 entities, 1,396 atomic claims, 77 evidence records, 27 patch identities, one strategy, and one safe receipt. Canonical and vocabulary bytes match M4 and the fixed manifest. No user state or new content wave is included. |
| Schemas | **PASS.** All 20 distributed schemas resolve locally. M3 valid/invalid conformance cases and the M4 scope-v2 migration tests pass; no record, response, API, or codebook format changes in M5. |
| Validation | **PASS.** Canonical validation, reference/receipt checks, repository policy, and source-boundary checks pass with zero errors. The single `strategy_unobserved` warning remains explicit: source support supplies no gameplay observation credit. |
| Provenance and evidence | **PASS.** All 1,396 claims resolve to retained evidence. All 77 evidence records have matching attribution; the 49 wiki records have history locators. Safe receipt integrity resolves; there are zero rights holds and source-policy violations. Integrity is not proof of truth, rights, or remote availability. |
| Patch/version handling | **PASS.** The historical patch ceiling remains 1.14.00. Unknown patches and expired reviews remain explicit gaps. Software 1.0.0 is distinct from API, schemas, codebook, dataset selection, build ID, and game patch; [COMPATIBILITY](COMPATIBILITY.md) documents each identity. |
| Agent consumption | **PASS.** [API_V1](API_V1.md) documents discovery, IDs, search, redirects, evidence, context, offset pagination, explicit partial/unknown/conflict states, and bounded full/compact responses. M3 conformance tests and final compiled reads pass. Retrieval stays `en-US`, default spoiler `none`, with disclosed platform-union semantics. |
| REST/MCP or equivalent | **PASS.** Offline JSON/JSONL works without a service. Sixteen read-only loopback REST operations, nine stdio MCP tools, and two MCP resources retain shared typed semantics. Final compiled protocol checks confirm matching payloads and MCP software version 1.0.0. |
| Generated artifacts | **PASS.** Two pinned-runtime data builds have identical inventories and bytes; source-bound distribution verification passes. Two source exports match. Another operator independently reconstructs the final export and reproduces both artifact identities recorded in the PR. Generated output stays disposable. |
| Tests | **PASS.** The final full check passes 139 tests across 17 files, type checking, validation, policy, build, and distribution verification. The separate determinism check and GitHub CI pass for the named candidate. |
| Security and privacy | **PASS.** Final selected-source and artifact review finds no credentials, private paths, personal-state values, private assets, or unresolved critical finding. The dated dependency audit reports zero vulnerabilities. Local reads need no external fetch, query logging, write API, account, model, or personal system. [SECURITY](../SECURITY.md) names the supported source and a contact-request procedure that keeps report details off public issues. |
| Portability | **PASS.** Another assistant operator verifies the immutable export and creates a separate working checkout without original Git history or personal configuration. Fresh dependency-directory installation, validation, build, and read succeed using the pinned runtime and public package cache. The limits below remain explicit. |
| Deployment | **PASS.** The documented local Node install/start/read/shutdown path works for the final packaged source. REST remains on loopback; MCP uses stdio. Clean shutdown and reads with outbound networking blocked are verified. No additional host, container, domain, or service is claimed. |
| Documentation | **PASS.** README and the 15 bundled guides cover purpose, authority, unofficial status, scope, installation, interfaces, evidence limits, update, export, and restore. Relative links resolve in source and the data bundle. M4's executed copy/restore instructions remain unchanged; current status and support instructions identify M5. |
| Contributor workflow | **PASS.** [CONTRIBUTING](../CONTRIBUTING.md), issue templates, and the PR template require atomic source-backed changes, context, rights, privacy, relevant checks, and reviewed Git acceptance. No automatic promotion or new contribution service is needed. |
| Licensing and legal boundaries | **PASS within the fixed distribution boundary.** Software/schema/documentation licensing, contributor data rights, third-party attribution, unofficial status, source dispositions, and correction/removal procedures are explicit. The dated primary-policy review below finds no unresolved rights or attribution blocker. |
| Operational cost | **PASS.** Required builds and reads use zero paid model calls and zero provisioned services. [M4 measurements](M4_COMPLETION.md#measured-cost-and-limits) record runtime, machine, time, memory, and retained footprints. The PR records final source/bundle sizes and independent command timings; these are measured observations, not minimum hardware or hosting promises. |
| Maintenance | **PASS.** M4 independently executed a reviewed correction, rebuild, and exact restore of M3, including repeated reads. The surviving manual procedure is unchanged. Review affected claims when patches change; ingestion never silently refreshes unrelated evidence and no freshness SLA is promised. |
| Public release readiness | **PASS — PUBLIC RELEASE READY.** One named clean source revision and checksummed artifact set satisfy every required row, with independent operation, final scoped review, and no known critical blocker. Publishing remains a separate authorized action. |

## Final diff and verification scope

M5 names software version 1.0.0, records completion in the existing scope-v2 status field, adds this checklist to the portable documentation, and replaces stale status/support language. It removes one private-workspace-specific rejection literal from the publication scanner while retaining the generic path checks. No canonical data, dependency selection, transport, query behavior, frozen contract, or deployment requirement changes. The package remains `private: true` to prevent accidental npm publication; this does not prevent distributing the clean source under its licenses.

The final checks repeat installation into a fresh dependency directory, runtime pin verification, the full check, dependency audit, deterministic builds, source export comparison, and independent final reconstruction. Actual compiled REST/MCP reads cover discovery, codebook, search, supported answers, stale-review partial answers, unknown patches, evidence, missing IDs, and the M4 graph-cap correction. The final operator also confirms MCP initialization reports 1.0.0 and that adapter shutdown succeeds.

M4's separate correction and exact recovery exercise is reused because the operational procedure, canonical data, dependencies, and adapter/query code are unchanged. Independence means another assistant operator and a separate reconstruction in the same managed Linux environment, using the existing Node 24.18.0 binary and cached public npm packages. A separate human, machine, operating system, and cold online toolchain bootstrap were not established or required by the adopted scope. The scoped reviews do not re-prove every gameplay assertion or live historical source.

`npm run m1:check` intentionally still reports `release_ready: false`: it verifies the M1 source boundary and cannot decide the later manual milestone criteria. M5's verdict is this complete checklist together with its named commit, artifact, review, and CI evidence, not a renamed automated gate.

## Dated rights review

The final review reconciles all 77 evidence records against attribution and the unchanged rights dispositions: 49 compatible-license wiki sources and 28 publisher-owned sources. [CrimsonWiki's terms](https://crimsonwiki.org/terms) retain the documented community-license/game-IP distinction. [CC BY-SA 4.0 legal terms](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en) support the documented attribution, changes, share-alike, and database-rights scope. [Pearl Abyss Fan Content Guidelines](https://crimsondesert.pearlabyss.com/en-US/Policy?_policyNo=130), checked on 2026-09-10, retain the documented free unofficial fan-content boundary and applicable conditions.

No unresolved rights or attribution blocker was found within this fixed free unofficial reference distribution boundary. The review supplies no separate publisher permission or blanket downstream commercial clearance. Third-party game IP remains outside Pywel's license grants, and the publisher boundary adds no restriction to rights actually granted under CC BY-SA. See [DATA_RIGHTS](../DATA_RIGHTS.md), [attribution](../LICENSES/THIRD-PARTY-DATA.md), and [SOURCE_POLICY](SOURCE_POLICY.md) for the operative scopes and correction/removal process. Historical source availability is not guaranteed.

## Completion and deferred work

There is no further engineering milestone required for this initial release. The [roadmap](ROADMAP_TO_1_0.md) ends at M5. Actual publication needs separate authorization and must preserve the clean-snapshot boundary; it is not evidence that the original private history is safe to expose.

The existing [post-release and demonstrated-need lists](RELEASE_SCOPE.md#useful-after-release) remain deferred. Coverage updates, gameplay observations, consumer benchmarks, hosting, packaging conveniences, and patch notifications are optional follow-on work. Models, orchestration, automated promotion, extraction tooling, extra transports/storage, and generalized infrastructure remain unjustified without a demonstrated requirement. None is a hidden release obligation.
