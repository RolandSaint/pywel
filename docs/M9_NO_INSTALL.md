# M9 — No-install public-file consumption

Owner-approved objective: demonstrate a useful public consumption path without cloning or installing Pywel, starting with existing files rather than a new hosted service. Baseline is integrated M8B, `9b5627c3bea1467a011bea314bd9ed4d3eb3dcc4`. Completion requires scoped review, any blocking corrections, merge and successful checks on the resulting main commit. [PR #9](https://github.com/RolandSaint/pywel/pull/9) records exact integration and actual verification; this document alone is not a completion claim.

## Delivered path and stopping point

`AGENT_START.md` is the public agent entry. `examples/public-read.json` gives a bounded set of relative catalog routes and six executable selection examples: four equipment questions, one typed reward gap and an absent-name control. The examples do not duplicate canonical answers, serve as a full-corpus index, or define a new REST/MCP response contract.

An HTTP-capable or GitHub-connected agent pins a source commit, reads selected catalog files, resolves exact entity/claim/evidence identities, and retains the original source and uncertainty. The additions manifest binds the selected canonical bytes at that trusted commit. This path uses GitHub's existing public file hosting. No Pywel server, owner PC, credentials, clone, npm install, new service, model call or paid resource is needed by the consumer.

The measured test reads the entry, example routes, the additions manifest and six canonical catalogs: nine files. It does not fetch the full source checkout, full corpus bundle, installed dependencies or compiled runtime. Byte and request counts are emitted by the test, not estimated here.

## Verification method

`tests/support/public-read-smoke.mjs` uses only Node built-ins. Node is the test harness's existing interpreter, not a requirement imposed on all consuming agents. The script is not an installed Pywel client, query engine or general-purpose remote SDK. It performs exact row selection for the six documented examples, verifies file hashes and evidence resolution, and checks that historical/platform/review metadata and the typed unknown survive. It deliberately emits neither API answer-state nor server build identity.

The unit test copies the probe into a fresh temporary directory and launches a child process with a minimal environment: no GitHub/API credentials, NODE_OPTIONS, project imports or node_modules. A local-fixture invocation checks deterministic route consistency and a tampered-byte case must fail. In this repository's GitHub Actions runs, an additional invocation reads the exact public PR head or post-merge commit over unauthenticated HTTPS. The live child receives no path to a local checkout. Its scratch directory must contain only the copied probe afterward. Requests are cached within one invocation and bounded by time, file count and bytes; redirects and non-200 responses fail rather than being treated as empty data.

The first candidate's test failed its 512 KiB budget because it unnecessarily fetched the large original release manifest on every example read. The repair removes that full-audit download from the addition-only routine path, rather than increasing the limit, copying a second manifest, or relaxing canonical validation. Selected files still must match their committed additions hashes; original/addition integrity remains checked in the normal full CI workflow. The bounded smoke is not a whole-corpus audit.

The live test is skipped outside `RolandSaint/pywel` GitHub Actions, where the environment may have no outbound access. A skipped/local-fixture run is not a live-access pass. The managed Chat container's anonymous HTTPS attempt failed at DNS resolution during planning, so it is not claimed as external network proof. Actual live proof must come from the named CI run and its `M9_LIVE_PUBLIC_READ` record.

This proves the bounded consumer transport and source-selection path in a fresh process, not an independent model's reasoning quality. No separate fresh LLM/Work/Codex session is claimed. The existing query, full/compact REST and real stdio MCP tests continue separately; raw-source reads are not represented as adapter parity.

## Limits preserved

- Raw source files are unfiltered. They can contain spoilers and records outside the selected context; client-side presentation filtering is required. Strict server-side exclusion requires the installed adapters or separately approved service, not this raw route.
- A miss in the examples is a slice-limited miss, not proof of whole-corpus or whole-game absence. Other subjects need additional pinned file discovery. No anonymous semantic-search endpoint is invented.
- The corpus remains historical; no new game patch is indexed and no review boundary advances. Git revision pinning establishes software/data source identity, not current gameplay.
- Integrity is not factual truth, publisher permission or independent confirmation. Consumer trust in the repository/revision remains explicit.
- No canonical records, scope/addition manifests, runtime, vocabulary, public schemas, dependencies, workflow, release tags or assets change for this milestone. The built output acquires a new source-bound identity because source documentation/tests change.

## Database-source correction

The owner also requested that research use the substantial public databases rather than relying on guide articles. [DATABASE_SOURCES](DATABASE_SOURCES.md) records the actually inspected candidates, licensing/export limits and a database-first research order. That is a source survey, not another content wave or blanket import permission. Official/observation evidence still controls intent and demonstrated behavior. An explicitly bounded follow-up can reconcile the two equipment records against database entries without expanding the architecture.

## Reproduce

From a normal contributor checkout with the pinned Node runtime:

```sh
npm ci
npm run runtime:check
npm run security:audit
npm run check
npm run test:determinism
```

For the standalone live smoke only, copy `tests/support/public-read-smoke.mjs` to an otherwise empty directory and invoke it with one trusted public commit containing M9:

```sh
node public-read-smoke.mjs COMMIT_SHA
```

No dependency installation or Pywel files are required in that directory. This optional reproduction script is developer evidence; ordinary agents can follow `AGENT_START.md` with their existing HTTP tools instead. No new release or deployment is authorized or necessary for the public-file route.
