# Operations

Installation and runtime commands apply to a complete Git working checkout. A clean source export is an immutable review/publication artifact. A copied `dist/data/` bundle is for offline reading and contains no installable runtime. The supported reference runtime validates canonical source at startup; it does not load a second database or fetch remote evidence.

## Install and verify

Use Node **24.18.0** from `.node-version` and `.nvmrc`. From the project root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run runtime:check
npm run security:audit
npm run check
npm run test:determinism
```

`check` runs repository policy, canonical validation, fixed-source checks, type checking, retained tests, one build, and distribution verification. `security:audit` checks retained production dependencies; CI must not bypass its findings. `test:determinism` performs two clean data builds, verifies each, and compares their exact inventories and bytes under the pinned runtime. `npm run build` is the standalone build command; it regenerates `dist/data/` and compiles code into `dist/runtime/`.

The offline bundle contains `corpus.json`, per-family JSONL, predicate/subtype vocabulary, public schemas, documentation, licenses, `manifest.json`, and `checksums.sha256`. The manifest records source inventory/digests, Node version, build identity, counts, warnings, and artifact inventory/digests. The checksum file covers every generated data file except itself. No wall-clock timestamp, domain, or service account is a build input.

`npm run test:dist` verifies the generated inventory and canonical/public projection against the current source. Agent-response schemas and OpenAPI are included in that portable bundle; schema IDs resolve to supplied local files. The retained test suite checks response schemas and equivalent REST/MCP operations. A matching checksum detects corruption; it is not a signature or evidence of source truth. Preserve source identity and obtain candidate files through a trusted channel.

## Local REST

After a successful build:

```sh
npm run start
```

The service binds to `127.0.0.1:8787`. Optional `PORT` selects another loopback port; for example, in a POSIX shell, `PORT=8790 npm run start`. No credentials, cloud, model, or personal configuration are required. Open a second terminal to read:

```sh
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/v1
curl 'http://127.0.0.1:8787/v1/search?q=Hernand&limit=5'
```

Ctrl-C sends SIGINT and closes the server; SIGTERM is also handled. If startup fails validation, correct or restore source before restarting. If the port is busy, stop the existing process or select another local port. Do not expose the process publicly as an incidental deployment step.

## Local stdio MCP

Configure a client to launch `node dist/runtime/mcp/server.js` with its working directory set to the project root. Alternatively launch `npm run --silent mcp` from that directory. `--silent` prevents npm's command banner from corrupting the protocol stream. Protocol messages use stdout and operational notices use stderr.

Read `pywel://service` and `pywel://codebook`, list the nine read-only tools, and call `pywel_search` or `pywel_answer`. The latter uses `format: "full"` for a descriptive answer; `structuredContent` is the REST response body directly, with no `result` wrapper. The [API guide](API_V1.md) lists the retained tools and limits. Closing stdin or sending SIGINT/SIGTERM closes the MCP process. No HTTP MCP endpoint is supplied.

## Manual maintenance and recovery

1. Start from the reviewed GitHub revision on an `agent/*` branch. Read existing records before proposing a duplicate. The initial dataset is fixed; content changes need an explicit scope decision and reviewed manifest diff.
2. Review an allowed public source and record its precise locator, context/date, rights basis, and attribution. Do not copy source bodies or import personal data.
3. Review the specific affected assertions. Correct, supersede, or mark gaps explicitly; never advance claim review boundaries merely because a patch was indexed.
4. Update canonical records and necessary recomputable provenance together. Run the affected validation/tests and full required checks, regenerate artifacts, and inspect the source and generated diff.
5. Commit and push after each completed milestone. Use a reviewed pull request; merge into `main` only after required checks pass. Keep milestones and actual verification evidence current.

To recover, stop the runtime, return to the previous reviewed source revision in a clean checkout, perform the locked install and checks, regenerate, compare the previous candidate's declared data hashes, and repeat representative known/unknown reads before restarting. The commands below preserve the required baseline before a correction. Restore from the exact source revision; never patch generated files to hide a correction. The original private history is not part of the public recovery unit. Public users restore reviewed revisions from the new repository history.

## Immutable source export and working checkout

`npm run m1:export` prepares and verifies `dist/public-source` with an exact `SOURCE_MANIFEST.json`; it does not publish. The command refuses to overwrite an existing candidate. Preserve the inspected export unchanged. Its strict inventory intentionally rejects additions such as `node_modules/`, `dist/`, or Git metadata, so do not install, build, or initialize Git inside it. Data builds replace only `dist/data/`, leaving an existing source export separate.

To operate from an export, obtain the expected `SOURCE_MANIFEST.json` SHA-256 and reviewed GitHub revision from the candidate's trusted review record. Computing a digest from the received export alone does not establish its identity. In a POSIX shell with the pinned Node available, set these values and choose absent working/evidence directories outside the export, with existing parents:

```sh
set -eu
export PYWEL_EXPORT='/absolute/path/to/public-source'
export PYWEL_WORK='/absolute/path/to/operator-checkout'
export PYWEL_EVIDENCE='/absolute/path/to/candidate-evidence'
export PYWEL_SOURCE_SHA256='<expected manifest SHA-256 from the review record>'
export PYWEL_REVIEWED_REVISION='<reviewed GitHub commit SHA>'

node --input-type=module <<'NODE'
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

const source = resolve(process.env.PYWEL_EXPORT);
const work = resolve(process.env.PYWEL_WORK);
const expected = process.env.PYWEL_SOURCE_SHA256;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };
if (!lstatSync(source).isDirectory() || realpathSync(source) !== source)
  fail('Export must be a real directory without symlink ancestors');
if (work === source || work.startsWith(source + sep) || source.startsWith(work + sep) ||
    realpathSync(dirname(work)) !== dirname(work)) fail('Working directory must be separate');
const manifestPath = resolve(source, 'SOURCE_MANIFEST.json');
if (!lstatSync(manifestPath).isFile()) fail('Source manifest must be a regular file');
const manifestBytes = readFileSync(manifestPath);
if (!/^[a-f0-9]{64}$/.test(expected) || digest(manifestBytes) !== expected)
  fail('Source manifest does not match the trusted candidate digest');
const manifest = JSON.parse(manifestBytes);
const files = manifest.files.map(entry => entry.path);
if (new Set(files).size !== files.length || files.some(path =>
    !/^[a-zA-Z0-9._/-]+$/.test(path) || path === 'SOURCE_MANIFEST.json' ||
    path.split('/').some(part => ['', '.', '..', '.git', 'node_modules', 'dist'].includes(part))))
  fail('Unsafe or duplicate source path');
const allowedFiles = new Set([...files, 'SOURCE_MANIFEST.json']);
const allowedDirs = new Set(files.flatMap(path => {
  const parts = path.split('/');
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
}));
const actualFiles = [];
function walk(prefix = '') {
  for (const entry of readdirSync(resolve(source, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory() && allowedDirs.has(path)) walk(path);
    else if (entry.isFile() && allowedFiles.has(path)) actualFiles.push(path);
    else fail(`Unexpected or non-regular export entry: ${path}`);
  }
}
walk();
if (actualFiles.length !== allowedFiles.size) fail('Export is missing a declared file');
const verified = manifest.files.map(entry => {
  const bytes = readFileSync(resolve(source, entry.path));
  if (digest(bytes) !== entry.sha256) fail(`Changed source file: ${entry.path}`);
  return { path: entry.path, bytes };
});
mkdirSync(work); // Refuse an existing destination; never overwrite it.
for (const { path, bytes } of verified) {
  mkdirSync(dirname(resolve(work, path)), { recursive: true });
  writeFileSync(resolve(work, path), bytes, { flag: 'wx' });
}
console.log(`Verified and copied ${verified.length} source files`);
NODE
```

Stop if verification fails. The command uses Node built-ins and installs nothing in the export. It checks the trusted manifest digest, exact inventory, regular files, and each file's digest before creating the checkout. Keep `SOURCE_MANIFEST.json` with the unchanged export; it is review metadata, not a working-checkout file. Initialize new local Git history without requiring personal Git identity settings:

```sh
set -eu
git init -b agent/operator-baseline "$PYWEL_WORK"
git -C "$PYWEL_WORK" add .
git -C "$PYWEL_WORK" -c user.name='Pywel Local Operator' \
  -c user.email='operator@example.invalid' commit -m 'Record verified source snapshot'
cd "$PYWEL_WORK"
```

Run the installation and verification commands above. After they pass and before proposing one correction, save the baseline outside the source checkout:

```sh
mkdir "$PYWEL_EVIDENCE"
printf '%s\n' "$PYWEL_REVIEWED_REVISION" > "$PYWEL_EVIDENCE/reviewed-revision.txt"
printf '%s\n' "$PYWEL_SOURCE_SHA256" > "$PYWEL_EVIDENCE/source-manifest.sha256"
git rev-parse HEAD > "$PYWEL_EVIDENCE/local-baseline-revision.txt"
cp dist/data/manifest.json "$PYWEL_EVIDENCE/manifest.json"
cp dist/data/checksums.sha256 "$PYWEL_EVIDENCE/checksums.sha256"
git switch -c agent/correction
```

Propose the correction through [CONTRIBUTING](../CONTRIBUTING.md), inspect its diff, and run the affected checks. Documentation and milestone-status files are source-build inputs: changing them changes `build_id`, the generated manifest, and declared checksums even when canonical data is unchanged. Record correction results separately; do not compare that changed candidate to the baseline as a determinism test.

For a restore drill, stop any running adapters and commit or otherwise preserve the proposed correction before continuing. The clean-status check below prevents switching with pending tracked or untracked changes. The saved local baseline represents the verified export; its new Git commit ID differs from the reviewed GitHub revision, while the source bytes match.

```sh
set -eu
test -z "$(git status --porcelain)"
git switch --detach "$(cat "$PYWEL_EVIDENCE/local-baseline-revision.txt")"
npm ci --ignore-scripts --no-audit --no-fund
npm run runtime:check
npm run check
cmp "$PYWEL_EVIDENCE/checksums.sha256" dist/data/checksums.sha256
```

Successful `cmp` plus `check`'s distribution verification establishes that the restored build matches the saved candidate's declared bytes. Repeat the known/unknown REST and MCP reads recorded for that candidate and verify clean shutdown. Preserve the export throughout; do not delete its manifest or weaken its guard to make installation pass.

This creates a working representation of the reviewed source without importing original private Git history. Creating a local working checkout does not publish it or authorize a new release. [M4 evidence](M4_COMPLETION.md) records the independently executed export-to-checkout transition, reviewed correction, and exact restore, with its measured environment and limits.

Required operation costs zero paid model calls and provisions zero services. Build sizes and timings are recorded in milestone evidence; no hosting budget or freshness SLA is promised. M4 records another operator carrying out install, read, correction, and restore against the named candidate. [M5 acceptance](M5_COMPLETION.md) records software 1.0.0 as PUBLIC RELEASE READY for the named clean source snapshot and checksummed artifacts. The public repository starts with new history from the certified clean source; original development history remains private. Use the v1.0.0 tag and release notes for the public commit, artifact identities, and publication verification.
