# Data model

The canonical format is JSON under `data/canonical/`, with versioned schemas in `schemas/` and controlled vocabularies in `data/vocabulary/`. Catalog files are packaging containers; validation and exports operate on their individual records. [RELEASE_SCOPE](RELEASE_SCOPE.md), the immutable initial manifest and the reviewed additions manifest define the retained dataset.

## Identity and claims

Record IDs are opaque and stable. Entity slugs are readable lookup keys; renaming display text does not change identity. Entity types and controlled subtypes describe indexed identity, not independently verified gameplay. Exact ID lookup is distinct from a natural-language answer about an entity.

A claim contains one subject–predicate–object assertion, with a registered predicate and typed object; status, behavior kind, confidence, and specific evidence; applicable patch/platform/locale/spoiler context; provenance; and optional supersession links. A correction may supersede an earlier claim while preserving the explicit relationship.

Publisher statements support intended behavior. Direct observations, independent corroboration, and inferences have separate meanings. `disputed`, `stale`, and `retracted` states remain distinguishable. Explicit objects such as `unknown`, `unmeasured`, `not_applicable`, `conflicting`, `redacted`, and `source_unavailable` must never become confident scalar values.

Catalog predicates describe only an identity or category indexed by a source. They do not establish in-game availability, stats, rewards, coordinates, objectives, or behavior. An answer must match the requested predicate; a related patch or service claim cannot establish an entity's type.

`data/vocabulary/predicates.json` declares object kinds and core/provisional/retired predicate status. Cross-entity facts use explicit relationship predicates. New predicates require a reviewed registry change and applicable validation; they are not an invitation to expand release coverage. Registry `units` are descriptive metadata: current validation checks the predicate and object kind, not a per-predicate unit allowlist. Primitive object branches enforce matching value types, and full/compact responses preserve that typed object.

The model supports preserved redirects when identity equivalence has adequate evidence. Redirects cannot point to themselves, form chains, target a missing entity, or cross incompatible types. The frozen M1 dataset currently contains no redirects.

## Evidence and provenance

Evidence stores minimum necessary source metadata, precise public HTTPS locators, source context/date, rights and retention labels, reliability, and independence groups. It does not mirror source bodies. Source availability and licensing do not establish accuracy or current-patch validity. See [SOURCE_POLICY](SOURCE_POLICY.md) and [DATA_RIGHTS](../DATA_RIGHTS.md).

Substantive claims require inspectable support. Locator-only evidence cannot establish normalized gameplay assertions. Reposts sharing an upstream source do not count as independent corroboration. The retained dataset excludes private artifact URNs and personal observation records whose evidence cannot be supplied publicly.

Receipts bind exact related records with a recomputable canonical JSON digest. Every record citing an active related-record receipt must be within its hash scope. Public projections preserve the receipt and all bytes required to validate it. A digest proves integrity only; it does not prove truth, source availability, acceptance by an outside party, or permission to reproduce material.

## Patch and applicability context

Schema/API versions, build identity, and game patches are different identifiers. The original `v1.0.0` and published `expansion-2026.09.10.1` snapshots index historical patches through **1.14.00**. [G02](G02_PATCH_CATCHUP.md) extends the maintained source's patch-identity index through **2.01.00** at its fixed research cutoff; its added entries are identity-only and do not refresh gameplay claims. An omitted query patch resolves to the latest indexed stable patch for the selected source build and is disclosed as an assumption. Read the resolved value from service discovery or the response rather than treating either snapshot's version as a permanent default. No indexed ceiling certifies the current live game.

`from_patch` and `through_patch` bound recorded applicability. `reviewed_through_patch` is the last patch against which the specific assertion was reviewed. Do not infer either termination or continued validity merely because a later patch exists. Unknown/future patches and requests beyond a claim's review boundary cannot yield unqualified current support.

Patch-neutral catalog claims have null patch bounds and remain narrow identity assertions. A canonical validity list containing `all` is a platform wildcard and cannot mix it with named platforms. A query with `platform=all` instead retrieves the union of platform records, so inspect each returned claim's validity. The public interface accepts only `locale=en-US`; the wider canonical locale pattern does not promise translated retrieval. Spoiler defaults to `none` for all requests and never rises because of question wording.

Patch records have explicit note-coverage labels. A patch identity proves only that its locator was indexed. The frozen M1 dataset contains no normalized patch-change or patch-review records: source prose and its dependent review objects were removed. M2 removed the corresponding unused formats and runtime paths. Review boundaries remain claim-level; patch-note ingestion cannot refresh unrelated claims.

## Strategies

A strategy is an ordered conditional graph with a goal, prerequisites, entry node, actions, transitions, priorities, evidence, observation counts, and validity context. Validation checks referenced entities, graph reachability, and transitions. Source support is not independent verification; an unobserved strategy remains labeled as such. The fixed dataset retains one strategy and does not require expansion.

The frozen M3 contract defines response schemas and [compatibility rules](COMPATIBILITY.md) independently of game patches, source build IDs, dataset scope, and software versions. [API_V1](API_V1.md) documents compact typed facts, packet-local references, context, bounded selection, and truncation. Contract conformance uses temporary fixtures; M3–M5 retain the fixed canonical data bytes and dataset. [M4 evidence](M4_COMPLETION.md) records independent operation and recovery; [M5 acceptance](M5_COMPLETION.md) records software 1.0.0 as PUBLIC RELEASE READY for the named source snapshot and artifacts.
