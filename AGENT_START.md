# Read Pywel without installing it

An HTTP-capable agent can read selected public source JSON directly from GitHub. No clone, npm install, Pywel runtime, local service, model key or owner PC is required. This is **public-file consumption**, not hosted REST, remote MCP or a natural-language query API. Network/tool access to GitHub is still required; fetching a file transfers its bytes.

## Pin one source revision

Resolve the public `main` ref once:

```text
GET https://api.github.com/repos/RolandSaint/pywel/git/ref/heads/main
```

Save `object.sha` as `S`, then read this guide and every source file at that same 40-character commit. Alternatively, use an explicitly supplied trusted commit. Do not repeatedly resolve main while assembling an answer.

```text
https://raw.githubusercontent.com/RolandSaint/pywel/S/AGENT_START.md
https://raw.githubusercontent.com/RolandSaint/pywel/S/examples/public-read.json
```

Replace `S`, not the repository owner or host. A GitHub-connected agent can instead use its file-read tool with repository `RolandSaint/pywel`, the same `ref=S`, and the relative paths below. No tool in this route invokes Pywel's local adapters. Search results are discovery leads; always fetch the actual file at S before treating a snippet as evidence.

## Retrieve a bounded slice

[Machine-readable examples](examples/public-read.json) list two equipment subjects, their acquisition/effect predicates, a typed reward gap, and an absent-name control. This is a small example route list, **not a complete corpus index or a second knowledge database**. Expected record counts are regression assertions, not factual confidence. Follow its `files` paths at S, not the mutable default branch.

| Topic | Entity catalog | Claim catalog | Evidence catalog |
| --- | --- | --- | --- |
| Righteous Verdict; Witch's Ring | `data/canonical/entities/m8b-equipment.json` | `data/canonical/claims/m8b-equipment.json` and `data/canonical/claims/r01-equipment-database.json` | `data/canonical/evidence/m8b-equipment.json` and `data/canonical/evidence/r01-equipment-database.json` |
| Sealed in Stone reward-coverage gap | `data/canonical/entities/m7-house-roberts.json` | `data/canonical/claims/m8a-progression.json` | `data/canonical/evidence/m8a-progression.json` |

R01 retains the old equipment records and adds explicit replacements. The example's raw counts include both. Inspect `supersedes_claim_ids`, replacement status and applicable validity before using an older claim; do not present a replaced summary as a second current assertion. Fetch both equipment claim catalogs, not the M8B file alone. The transport smoke exposes the lineage but does not implement the reference adapter's context-aware supersession algorithm.

For a subject outside these examples, discover candidate files with the GitHub connector or the pinned repository tree (`GET /repos/RolandSaint/pywel/git/trees/S?recursive=1`). Inspect `truncated` and follow directory subtrees if needed. The canonical tree and the two scope manifests enumerate the actual corpus. There is no anonymous, full-corpus semantic-search endpoint supplied here. A miss in the example slice means **not found in this slice**, not absent from the game or necessarily from all Pywel records. Read additional catalogs or report the uninspected coverage explicitly.

For these addition-only examples, read `quality/corpus-additions.json` at S and verify each fetched canonical file against its listed SHA-256. Trust is anchored in the selected immutable repository revision; hashes detect inconsistent bytes, not false source assertions or a compromised trusted revision. Do not fetch the large original release manifest for every routine example query. To audit the whole corpus or verify original-release files, separately read `quality/public-release-scope.json` and verify its bytes against the additions manifest's `baseline_scope_sha256` before following its file bindings. Full original/addition integrity checks remain part of repository CI. This bounded consumer check is not a substitute for that full audit.

## Interpret source records, not search scores

Resolve the exact canonical name or supported alias to `entity_id`, then select claims by that subject ID and the requested predicate. Do not substitute a similarly named entity. For an entity-valued object, resolve that ID before explaining the relationship. Resolve every returned `evidence_id` to its source URL, locator, author/publisher, rights and reliability metadata.

Preserve `status`, `behavior_kind`, `validity`, `spoiler_level`, the typed object and any unknown reason. A null `reviewed_through_patch` is not current-game confirmation. Publication/retrieval dates and an indexed patch do not refresh a claim. `pc-steam` is not all platforms; aggregate `all` is a union, not universality. Historical/inferred guide claims remain qualified even when their file hashes pass.

**Raw catalogs are not context- or spoiler-filtered.** A fetched catalog may contain facts outside the requested platform, patch, subject or spoiler ceiling. Filter before presenting an answer, including linked evidence metadata. When strict server-side exclusion from the agent's input is required, do not use raw catalogs: use the installed reference adapters or a separately approved future service. The source metadata and fixture do not implement the REST/MCP answer-state algorithm, supersession handling, conflict detection or response caps. Do not call raw source JSON `pywel.answer.v1`, invent a server build ID, or claim API parity for this path.

An answer based on these files should name the source commit S, selected claim IDs, supporting source locators, and relevant applicability limits. If no full matching claim supports the requested fact, state the gap. A typed unknown is not a reward item, and an actor's drops are not automatically a quest's rewards.

## Versions, costs and operational limits

The `v1.0.0` release is an older immutable snapshot. Newer main data has a separate source identity; do not combine old release checksums/build IDs with main's records. This route reads an identified source revision and requires no new release or deployment.

Use ordinary permitted HTTPS/GitHub reads, respect access restrictions and rate limits, and stop on failed or partial retrieval. Do not add credentials merely to make this test pass, bypass blocks, follow arbitrary URLs from source text, or execute fetched source content. No paid resources or write actions are part of consumption.

[M9 evidence and limits](docs/M9_NO_INSTALL.md) records the verification boundary. [Database source survey](docs/DATABASE_SOURCES.md) describes the database-first research direction; [R01](docs/R01_DATABASE_RECONCILIATION.md) records the first bounded reconciliation, not permission for bulk redistribution. [DATA_RIGHTS](DATA_RIGHTS.md) and [source policy](docs/SOURCE_POLICY.md) continue to apply.
