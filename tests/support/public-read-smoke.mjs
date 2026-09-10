// Transport/record-selection smoke test, not a Pywel query engine or installed client.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [snapshot, localRoot] = process.argv.slice(2);
assert.match(snapshot ?? '', /^[a-f0-9]{40}$/, 'Supply one immutable commit SHA');
const origin = `https://raw.githubusercontent.com/RolandSaint/pywel/${snapshot}/`;
const cache = new Map();
let bytes = 0;
const limit = 512 * 1024;
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function read(path) {
  assert.match(path, /^[A-Za-z0-9_.\/-]+$/);
  assert(!path.startsWith('/') && !path.split('/').some(part => part === '..' || part === '.'));
  if (cache.has(path)) return cache.get(path);
  assert(cache.size < 16, 'Example read exceeded file budget');
  let buffer;
  if (localRoot) {
    buffer = await readFile(resolve(localRoot, path));
  } else {
    const response = await fetch(new URL(path, origin), {
      redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Accept: 'text/plain, application/json' },
    });
    assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
    assert(response.body, `${path}: missing response body`);
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      assert(bytes + size <= limit, 'Example read exceeded byte budget');
      chunks.push(chunk);
    }
    buffer = Buffer.concat(chunks);
  }
  bytes += buffer.length;
  assert(bytes <= limit, 'Example read exceeded byte budget');
  cache.set(path, buffer);
  return buffer;
}

try {
  const entry = new TextDecoder('utf-8', { fatal: true }).decode(await read('AGENT_START.md'));
  assert(entry.includes('(examples/public-read.json)'), 'Entry does not expose sample routes');
  const parse = buffer => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  const example = parse(await read('examples/public-read.json'));
  assert.equal(example.format, 'pywel.public_read_examples.v1');
  assert.equal(example.coverage, 'selected_examples_not_full_corpus');
  const additions = parse(await read('quality/corpus-additions.json'));
  // The selected files are additions. Full original-manifest auditing remains in repository CI.
  assert.match(additions.baseline_scope_sha256 ?? '', /^[a-f0-9]{64}$/);
  const bound = new Map(additions.canonical_files.map(file => [file.path, file.sha256]));
  const families = { entities: [], claims: [], evidence: [] };
  for (const family of Object.keys(families)) {
    assert(Array.isArray(example.files[family]) && example.files[family].length <= 3);
    for (const path of example.files[family]) {
      assert(path.startsWith(`data/canonical/${family}/`) && path.endsWith('.json'));
      const buffer = await read(path);
      assert.match(bound.get(path) ?? '', /^[a-f0-9]{64}$/, 'File lacks reviewed addition binding');
      assert.equal(digest(buffer), bound.get(path), `${path}: digest mismatch`);
      const catalog = parse(buffer);
      assert(Array.isArray(catalog.records), `${path}: not a catalog`);
      families[family].push(...catalog.records);
    }
  }
  const evidence = new Map(families.evidence.map(record => [record.evidence_id, record]));
  assert.equal(evidence.size, families.evidence.length, 'Duplicate evidence ID in example slice');
  const results = [];
  for (const request of example.requests) {
    const entities = families.entities.filter(entity => entity.canonical_name.text === request.entity_name);
    assert(entities.length <= 1, `Ambiguous example name: ${request.entity_name}`);
    const entity = entities[0];
    const claims = entity === undefined ? [] : families.claims.filter(claim =>
      claim.subject_entity_id === entity.entity_id && claim.predicate === request.predicate);
    assert.equal(claims.length, request.expected_records, request.entity_name);
    assert.equal(claims.filter(claim => claim.object.kind === 'unknown').length, request.expected_unknown_records);
    for (const claim of claims) {
      assert.equal(claim.schema_version, 'pywel.claim.v1');
      assert.equal(claim.status, 'inferred');
      assert.equal(claim.behavior_kind, 'historical');
      assert.equal(claim.validity.reviewed_through_patch, null);
      assert.deepEqual(claim.validity.platforms, ['pc-steam']);
      assert.deepEqual(claim.validity.locales, ['en-US']);
      assert(claim.evidence_ids.length > 0);
      for (const id of claim.evidence_ids) {
        const source = evidence.get(id);
        assert(source, `Unresolved evidence ${id}`);
        assert.match(source.source.url, /^https:\/\//);
        assert(source.source.locator && source.source.publisher);
        assert(source.rights.attribution_required);
      }
    }
    results.push({
      entity_name: request.entity_name, entity_id: entity?.entity_id ?? null,
      predicate: request.predicate, record_ids: claims.map(claim => claim.claim_id),
      unknown_records: claims.filter(claim => claim.object.kind === 'unknown').length,
      evidence_ids: [...new Set(claims.flatMap(claim => claim.evidence_ids))],
      review_boundaries: claims.map(claim => claim.validity.reviewed_through_patch),
      selection: entity ? 'exact_subject_and_predicate' : 'absent_from_example_slice_only',
    });
  }
  // No answer_state/build_id is invented: these are source rows, not API answer packets.
  console.log(JSON.stringify({
    ok: true, transport: localRoot ? 'local_fixture' : 'anonymous_https',
    repository: 'RolandSaint/pywel', snapshot, requests: cache.size, bytes,
    raw_source_is_unfiltered: true, current_game_verification: false,
    files: [...cache].map(([path, buffer]) => ({ path, sha256: digest(buffer), bytes: buffer.length })),
    results,
  }));
} catch (error) {
  console.error(`public_read_smoke=fail ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
