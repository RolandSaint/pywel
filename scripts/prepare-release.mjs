// Release preparation only. Reuse the existing source/data validators; never publish.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { checkM1, exportPublicSource } from '../src/cli/m1-check.ts';
import { verifyDistribution } from '../src/cli/verify-dist.ts';
import { findProjectRoot } from '../src/core/paths.ts';
import { CANONICAL_RELEASE_NODE_VERSION } from '../src/build/runtime.ts';

const root = findProjectRoot();
const label = process.argv[2];
assert.match(label ?? '', /^expansion-[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[1-9][0-9]*$/, 'Supply a dated expansion snapshot label');
assert.equal(process.versions.node, CANONICAL_RELEASE_NODE_VERSION, 'Use the pinned release runtime');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
assert.equal(git('status', '--porcelain'), '', 'Candidate requires a clean working checkout');
const commit = git('rev-parse', 'HEAD');
assert.match(commit, /^[a-f0-9]{40}$/);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const out = resolve(root, 'dist/release-candidate');
const first = resolve(root, 'dist/public-source-first');
const source = resolve(root, 'dist/public-source');
async function requireAbsent(path) {
  try { await lstat(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error(`Refusing to overwrite existing candidate: ${path}`);
}
for (const path of [out, first, source]) await requireAbsent(path);

// A test report is evidence for the named cases, not a substitute for the full CI run/review.
const acceptanceBytes = await readFile(resolve(root, 'dist/m10-acceptance.json'));
const acceptance = JSON.parse(acceptanceBytes);
assert.equal(acceptance.source_commit, commit);
assert.equal(acceptance.release_label, label);
assert.equal(acceptance.checks_passed, true);
assert.equal(acceptance.results.length, 20);
const m1 = await checkM1(root);
const data = resolve(root, 'dist/data');
const verifiedData = await verifyDistribution(data, root);

// Export twice without overwriting either candidate; compare exact manifest-bound source bytes.
await exportPublicSource(root);
await rename(source, first);
await exportPublicSource(root);
await checkM1(first);
await checkM1(source);
const sourceManifest = await readFile(resolve(source, 'SOURCE_MANIFEST.json'));
assert.deepEqual(await readFile(resolve(first, 'SOURCE_MANIFEST.json')), sourceManifest, 'Source exports differ');

function archive(directory) {
  const tar = execFileSync('tar', [
    '--sort=name', '--format=ustar', '--mtime=@0', '--owner=0', '--group=0', '--numeric-owner',
    '--mode=u+rwX,go+rX,go-w', '-C', directory, '-cf', '-', '.',
  ], { maxBuffer: 32 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C' } });
  return gzipSync(tar, { level: 9 }); // Node emits no wall-clock gzip timestamp or filename.
}
const sourceArchive = archive(source);
assert.deepEqual(archive(first), sourceArchive, 'Reproduced source archive differs');
const dataArchive = archive(data);
assert.deepEqual(archive(data), dataArchive, 'Repeated data archive differs');
await mkdir(out);
const sourceName = `pywel-${label}-source.tar.gz`;
const dataName = `pywel-${label}-data.tar.gz`;
await writeFile(resolve(out, sourceName), sourceArchive, { flag: 'wx' });
await writeFile(resolve(out, dataName), dataArchive, { flag: 'wx' });

// Verify the actual archive round trip, then exercise tamper rejection on disposable copies.
const scratch = await mkdtemp(resolve(tmpdir(), 'pywel-release-verify-'));
let archiveChecks;
try {
  const restoredSource = resolve(scratch, 'source');
  const restoredData = resolve(scratch, 'data');
  await mkdir(restoredSource);
  await mkdir(restoredData);
  for (const [name, target] of [[sourceName, restoredSource], [dataName, restoredData]]) {
    execFileSync('tar', ['-xzf', resolve(out, name), '--no-same-owner', '--no-same-permissions', '-C', target]);
  }
  const sourceCheck = await checkM1(restoredSource);
  assert.equal(sourceCheck.clean_snapshot_verified, true);
  const offlineCheck = await verifyDistribution(restoredData);
  const boundCheck = await verifyDistribution(restoredData, root);
  assert.equal(boundCheck.build_id, verifiedData.build_id);
  await writeFile(resolve(restoredSource, 'README.md'), 'deliberately changed verification fixture\n');
  await assert.rejects(checkM1(restoredSource), /Source snapshot changed/);
  await writeFile(resolve(restoredData, 'README.md'), 'deliberately changed verification fixture\n');
  await assert.rejects(verifyDistribution(restoredData), /hash mismatch|Checksum|Manifest/);
  archiveChecks = { source_round_trip: true, data_standalone: offlineCheck.ok, data_source_bound: boundCheck.source_bound, source_tamper_rejected: true, data_tamper_rejected: true };
} finally { await rm(scratch, { recursive: true, force: true }); }

await writeFile(resolve(out, 'M10-ACCEPTANCE.json'), acceptanceBytes, { flag: 'wx' });
// The notes travel outside docs/, so their two sibling links must still resolve.
const notes = (await readFile(resolve(root, 'docs/M10_RELEASE_CANDIDATE.md'), 'utf8'))
  .replace(/\]\((COMPATIBILITY|OPERATIONS)\.md\)/g,
    (_, name) => `](https://github.com/RolandSaint/pywel/blob/${commit}/docs/${name}.md)`);
assert(!/\]\((COMPATIBILITY|OPERATIONS)\.md\)/.test(notes));
await writeFile(resolve(out, 'RELEASE_NOTES.md'), notes, { flag: 'wx' });
const archiveFiles = [sourceName, dataName];
const files = await Promise.all(archiveFiles.map(async name => {
  const bytes = await readFile(resolve(out, name));
  return { name, bytes: bytes.length, sha256: digest(bytes) };
}));
const software = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const candidate = {
  status: 'prepared_not_published', release_label: label, repository: 'RolandSaint/pywel', source_commit: commit,
  git_tree: git('rev-parse', 'HEAD^{tree}'), package_version: software.version, npm_private: software.private,
  node: process.versions.node, tar: execFileSync('tar', ['--version'], { encoding: 'utf8' }).split('\n')[0],
  build_id: verifiedData.build_id, counts: m1.counts,
  original_scope_sha256: m1.scope_sha256, additions_sha256: m1.corpus_additions_sha256,
  source_manifest_sha256: digest(sourceManifest), data_checksums_sha256: digest(await readFile(resolve(data, 'checksums.sha256'))),
  data_bundle: verifiedData, archives: files,
  checks: { ...archiveChecks, source_exports_identical: true, source_archives_identical: true, repeated_data_archive_identical: true, cumulative_question_report: true },
  limitations: [
    'Full CI and scoped review must pass for this exact commit before readiness acceptance.',
    'Data build reproduction is checked by the preceding test:determinism command.',
    'This verifies fresh processes and restored archives, not a second human or model operator.',
    'Historical indexed patch ceiling remains 1.14.00; no current-game confirmation is added.',
    'Source snapshot label is separate from package/API/schema versions. Compare commit and build, not package version alone.',
    'No release, tag, npm publication, hosting or public announcement is authorized by this file.',
  ],
};
await writeFile(resolve(out, 'CANDIDATE.json'), `${JSON.stringify(candidate, null, 2)}\n`, { flag: 'wx' });
const names = [...archiveFiles, 'M10-ACCEPTANCE.json', 'RELEASE_NOTES.md', 'CANDIDATE.json'].sort();
const checksums = (await Promise.all(names.map(async name => `${digest(await readFile(resolve(out, name)))}  ${name}\n`))).join('');
await writeFile(resolve(out, 'SHA256SUMS'), checksums, { flag: 'wx' });
execFileSync('sha256sum', ['-c', 'SHA256SUMS'], { cwd: out, stdio: 'inherit' });
assert.equal(git('status', '--porcelain'), '', 'Preparation changed source');
console.log(`M10_RELEASE_CANDIDATE ${JSON.stringify({ ...candidate, checksum_file_sha256: digest(Buffer.from(checksums)) })}`);
