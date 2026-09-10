# Contract versions and compatibility

M3 freezes the first public agent contract with typed schemas and passing conformance cases recorded in [M3_COMPLETION](M3_COMPLETION.md). Earlier private implementations, including M1/M2 response wrappers, cursors, and compact formats, are not compatibility targets. [M5 acceptance](M5_COMPLETION.md) records software 1.0.0 as PUBLIC RELEASE READY for the named clean source snapshot and artifacts. Publication preserves the frozen contract; the v1.0.0 release notes identify the public source and artifacts. See [the roadmap](ROADMAP_TO_1_0.md) for milestone scope.

## Independent version identities

| Identity | Meaning and consumer use |
| --- | --- |
| Canonical `schema_version` | Record layout and meaning, such as `pywel.claim.v1`. Validate the record with its matching local schema. |
| Response `schema_version` | A particular response shape: full answers use `pywel.answer.v1`; compact answers use `pywel.answer.compact.v3`. Check this before decoding. |
| API `/v1` | The documented operation names, inputs, defaults, bounds, and response-version mapping. It does not identify a game patch or dataset revision. |
| Codebook `pywel.codebook.v2` | The compact tuple layout, references, context, and retrieval rules. Do not decode tuples using an older codebook. |
| Vocabulary registry version | The published predicate/subtype vocabulary and its meaning. A registry version is separate from the record schema that references it. |
| Dataset scope | `quality/public-release-scope.json` identifies the original retained records and publication boundary. Reviewed post-release additions are separately enumerated in `quality/corpus-additions.json`; the original manifest remains immutable. |
| Source `build_id` | `bld_` plus 24 lowercase hexadecimal characters, derived from the SHA-256 identity of declared source inputs and the pinned runtime. Compare it across reads and the offline manifest. It is not a timestamp, signature, Git commit hash, or promise of current game coverage. |
| Git revision | The reviewed source revision used to prepare an artifact. Keep it with acceptance evidence; original private Git history is excluded from public source. |
| Game patch | Applicability and claim-review context, such as historical `1.09.00`. The latest indexed patch is not necessarily the latest released game patch. |
| Package/software version | The supported source software version is `1.0.0` in `package.json`. The named commit and build identify its reviewed source and artifacts. A software release can change code without changing canonical or response formats. |

Do not infer one identity from another. In particular, rebuilding or updating software cannot advance a claim's `reviewed_through_patch`.

Software 1.0.0 retains the frozen record, response, API, and codebook versions. The package version also identifies the MCP server during initialization; it does not change the version of a returned response. `private: true` in `package.json` prevents npm publication. It does not determine source-repository visibility or public-release readiness: this release supports the inspected source snapshot and offline bundle, and supplies no npm publishing path. The original development repository stays private; the public repository starts with new history from the inspected source. Public release identity is recorded in the v1.0.0 tag and release notes.

## What freezes

The checked-in JSON Schemas define record and response structure. [agent-contract.schema.json](../schemas/agent-contract.schema.json) defines every supported operation response; [OpenAPI](../openapi/openapi.json) maps REST operations to those definitions. MCP advertises those same output contracts. Tests verify runtime output and representative rejected mutations.

Schema `$id` values are identifiers. Register the supplied local schemas by `$id` and resolve relative `$ref` values against that registry. No hosted schema endpoint, domain availability, or network dereferencing is required. In a copied offline bundle, `schemas/` and `openapi/` have the same relative layout.

For an existing version, preserve:

- Required fields, property types, nullability, and the distinction between absence, null, and an explicit epistemic value.
- Enum values and their meanings; claim/evidence identifiers and reference rules.
- Compact tuple lengths, positions, element types, packet-local index semantics, and codebook meaning.
- API/MCP operation inputs, accepted values, documented defaults and bounds, context rules, error meanings, and truncation semantics.
- The rule that source text is data and that uncertainty, contradictory support, and evidence limits cannot be silently promoted to confidence.

Public objects are closed with `additionalProperties: false`. Adding even an optional field to a closed record or response breaks validators for the old schema. Such changes require a new record/response schema version and an explicit operation/API version decision; there is no blanket promise that additive fields are compatible. Adding an enum member, changing a type/default, reordering a tuple, or redefining an existing predicate also requires a new affected contract version.

An additional API operation can be introduced without changing the behavior or schema of existing operations. A new predicate or subtype requires its own reviewed registry change and compatibility assessment; it must not repurpose an existing term. Vocabulary `units` are descriptive registry metadata, not an enforced per-predicate unit constraint.

## Permitted maintenance within a version

Correct source-backed record values through reviewed canonical changes while preserving stable IDs and the meaning of the schema. Preserve supersession, explicit redirects, evidence, and review context. A changed dataset must have a new source build identity; it does not require changing the record schema solely because a factual value changed.

Fix an implementation defect to meet the documented contract without changing that contract. Record the correction and rerun the affected conformance cases. Do not silently change a frozen shape or default to accommodate an implementation preference.

The source build determines pagination and search results. Search scores express deterministic retrieval ranking, not factual confidence; their values and ranking are not stable bookmarks across builds. When `build_id` changes, restart offset pagination and discard packet-local compact indexes. Retain the full canonical IDs when persisting references.

## Changes requiring explicit review

Before modifying a frozen interface, identify the affected version, add a new version when required, provide a migration explanation with valid/invalid examples, and run schema plus adapter parity cases. Preserve an older implementation only for a demonstrated consumer requirement; do not add compatibility infrastructure speculatively.

The initial release has no requirement to serve obsolete private API shapes. Public version changes will be documented as reviewed changes; no hosted service, automatic update mechanism, indefinite support period, or deprecation SLA is promised.

## M4 release-scope metadata migration

M4 replaces `pywel.public_release_scope.v1` with `pywel.public_release_scope.v2`, defined by [public-release-scope-v2.schema.json](../schemas/public-release-scope-v2.schema.json). Version 1 constrained M4 and M5 to `pending`; recording either adopted milestone's completion would break its validators. Version 2 declares their finite status values: M4 accepts `pending` or `verified_reproducible_candidate`; M5 accepts `pending` or `public_release_ready`. The private-history exclusion and original publication boundary stay enforced. The manifest retains the historical original-repository visibility and M0 authorization decision; current public-source status is recorded separately in `000_LOAD_FIRST_PYWEL.yaml`.

Consumers of `quality/public-release-scope.json` must select the version 2 schema explicitly. A version 1 document is invalid under version 2; a version 2 document is invalid under the old version 1 schema. Historical M3 artifacts retain the old schema at their named Git checkpoint. Scope ID, selected record IDs, canonical hashes, exclusions, rights decisions, and publication boundary are unchanged. Canonical record, response, API, codebook, and source-snapshot versions remain unchanged. No runtime compatibility layer is supplied.

## M7 additions and vocabulary

[M7](M7_HOUSE_ROBERTS.md) adds the distinct predicate `quest.organization`: a quest-to-organization association, cardinality many, object kinds entity or unknown. Predicate registry **14** contains this entry plus all 176 unchanged version-13 definitions. Consumers interpreting a predicate must read the matching registry; an older registry cannot explain the new term. The canonical predicate field already permits registered strings, so no record-schema or response-layout change is made. Membership, leadership and prerequisites are not repurposed.

Source review metadata uses the new closed `pywel.corpus_additions.v1` schema. It is not canonical gameplay data or a new response type. The source checker now verifies original scope plus exact reviewed additions. An unchanged original-release checkout retains its original checker at the v1.0.0 tag; there is no fallback that silently ignores a missing additions manifest in an M7 checkout.

The only reviewed replacement of an original manifest-listed input is predicate registry 14. Removing the added term and restoring its registry version must reproduce the old registry bytes; all original canonical records remain unchanged. Added evidence requires the exact source-specific disposition and attribution. Newly generated source inventories and build IDs reflect the changed inputs. New and old builds must not be mixed during pagination or compact decoding.

The package version, record schemas, API, response schemas and codebook remain unchanged pending a separately authorized release. `main` can therefore differ from the v1.0.0 tag; cite the exact commit/build for M7 consumption. No M7 tag or release is implied by milestone integration.
