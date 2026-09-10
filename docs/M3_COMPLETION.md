# M3 — stable agent contract

> Historical checkpoint for M3 commit `a1d9b12fe0b4ec0f3c61b9b631d773858af8f2c0`. Its counts and remaining milestones describe that revision. See [M4_COMPLETION](M4_COMPLETION.md) for current independent reproduction and recovery evidence.

M3 is complete for the verified contract candidate on the milestone branch in private development PR #189 (historical review; not required for public operation). The PR records the separate milestone commit, exact final artifact identities, and GitHub CI result. Main-branch acceptance remains subject to review. M4 and M5 remain pending; Pywel is not PUBLIC RELEASE READY.

The M1/M2 canonical data remains byte-identical: 310 entities, 1,396 claims, 77 evidence records, 27 patch identities, one source-supported unobserved strategy, and one public provenance receipt. Only the M3 milestone status changes in the release-scope manifest; selection, hashes, rights decisions, exclusions, and publication boundary stay fixed.

## Frozen contract

[API_V1](API_V1.md), [OpenAPI](../openapi/openapi.json), [response schemas](../schemas/agent-contract.schema.json), and [COMPATIBILITY](COMPATIBILITY.md) define the supported interface. All 16 REST operations have closed, typed success and error contracts. Nine MCP read tools and two resources return the same bodies through the REST implementation without network requests. Every response identifies its schema version and source build. Schemas resolve locally; no schema host is required.

The three supported consumption paths remain offline JSON/JSONL, loopback REST, and stdio MCP. Offset pagination is the sole pagination mechanism. Unknown or duplicate parameters, invalid bounds, malformed identifiers, and unsupported locales are rejected. Retrieval is English (`en-US`), defaults to spoiler `none`, and discloses resolved patch/platform context. `platform=all` selects the union of matching records; it does not assert universal applicability. Retrieval links preserve the resolved context, including explicitly requested historical records.

Compact v3 and codebook v2 preserve typed claim objects, full validity, canonical IDs, evidence references, and uncertainty. Full answers cap selection at 20 claims/eight strategies; compact answers return at most five/two. Both report matched/returned counts. Compact omission counts describe only the bounded full packet. Truncation, stale reviews, or disputes beyond a returned cap cannot silently become unqualified support. Following `full_path` retrieves the bounded full answer, not every matching corpus record.

Canonical scalar schemas now distinguish number, boolean, and string values, including explicit epistemic states. Invalid type/value combinations and unused ID prefixes are rejected. The corpus, build manifest, and source snapshot also have closed standalone schemas. Inspected snapshots cannot weaken boundary checks by supplying a permissive replacement schema: independent source-manifest invariants remain enforced.

Compatibility policy separates record, response, API, codebook, vocabulary, dataset, source build, Git revision, game patch, and software versions. Closed objects require a new affected version even for an optional added field. Earlier private response shapes are not supported compatibility targets.

## Deletions and bounded additions

Removed generic MCP output schemas, duplicate MCP response construction, the redundant freshness tool, cursor pagination, nested delivery wrappers, implicit spoiler escalation, ignored token-budget inputs, and unsupported locale promises. Removed the direct Zod dependency; its existing transitive dependency remains locked. No new dependency, transport, service, data expansion, client SDK, or compatibility layer was added.

The source candidate contains 161 files, including 24 TypeScript source files, 20 schemas, and 13 guides under `docs/`. The generated offline data bundle contains 52 text files. The additional schemas and focused tests directly establish the retained consumer contract. Exact final byte counts and digests are recorded in the PR to avoid self-referential artifact hashes.

## Verification record

Verification uses pinned Node **24.18.0** and the checked-in lockfile on 2026-09-10. The final required check passes **137 tests across 17 files**, type checking, repository policy, canonical validation, fixed dataset/rights/provenance checks, build, and source-bound distribution verification. Validation reports zero errors and the unchanged `strategy_unobserved` warning; no gameplay observation credit is claimed. The full dependency audit reports zero vulnerabilities, including production dependencies.

Conformance tests exercise all retained REST responses and full/compact forms, exact MCP parity, local schema closure, valid/invalid canonical objects, evidence success/not-found, redirects, strict inputs, pagination, context-preserving links, and build identity. Query cases include supported/unknown/partial/conflicting answers, unknown patches, stale reviews, compound predicates, spoiler/platform filtering, and uncertainty beyond response caps. Tampered corpus/manifest payloads remain invalid after checksums are refreshed; source-snapshot schema weakening, path escapes, unsafe metadata, and invalid canonical source are rejected.

Two clean data builds have identical inventories and bytes. Two clean source exports have identical files and `SOURCE_MANIFEST.json`. Export verification preserves the original-history exclusion and immutable boundary. Final digests are recorded with the milestone commit in the PR; checksums establish integrity, not gameplay truth or independent trust.

An independent fresh source checkout installed locked dependencies in about **1.75 seconds** and passed the full check in about **13.6 seconds** in this review environment. Real compiled REST and stdio MCP processes ran with only `PATH`, `PORT`, and the test network-blocking `NODE_OPTIONS`, with outbound Node network APIs disabled. Sixteen payload comparisons matched exactly; all nine input and nine output MCP schemas compiled offline. Both processes exited 0. The final verifier correction was copied into that checkout, rebuilt, and passed source-bound bundle verification and compiled protocol checks again. These measurements preceded only completion-document/status edits; final checks cover the recorded source. They establish M3 installation and contract behavior, not M4 correction/restore.

## Remaining scope

M4 independently verifies one named release candidate's export-to-checkout transition, reproduction, a reviewed correction, and restoration of a prior candidate, with measured resource use and a scoped review. M5 alone establishes PUBLIC RELEASE READY. Heuristic question retrieval is not a general natural-language reasoning guarantee. Coverage expansion, hosting, and speculative features remain deferred.

The original repository and history remain private. No personal systems or data were accessed. This milestone does not publish or deploy the project, provision paid resources, or authorize outside contact.
