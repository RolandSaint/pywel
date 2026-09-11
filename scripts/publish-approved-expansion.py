"""One approved release operation; no build, source edit, or existing-release overwrite."""
import hashlib
import io
import json
import os
import subprocess
import tempfile
import urllib.request
import zipfile
from pathlib import Path

REPO = 'RolandSaint/pywel'
LABEL = 'expansion-2026.09.10.1'
COMMIT = 'e8901037e03965e806696da0b239c9e8720f924b'
TREE = 'f2b91dcf41b2d4fdc3e8496a946f78fdcdb6de29'
BUILD = 'bld_3b390763f36f8e1be929bcbc'
OLD_COMMIT = 'b6d6c0b455273bc3ecb9bf00427156827939dc03'
RUN = 34550101996
ARTIFACT = 10180472156
ZIP_SHA = 'ac00e602a5112e778ac70c1921862714803faf06057368fa255541f871683d94'
SUMS_SHA = '476bf0647f93c576458dceb5ddd74dddbb48cf9595fe3c9de4520c9b2a874dcf'
NAMES = {'CANDIDATE.json', 'M10-ACCEPTANCE.json', 'RELEASE_NOTES.md', 'SHA256SUMS',
         f'pywel-{LABEL}-source.tar.gz', f'pywel-{LABEL}-data.tar.gz'}

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def gh(*args, data=None):
    result = subprocess.run(['gh', *args], input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
    return result.stdout

def api(path, method='GET', payload=None, binary=False):
    args = ['api', f'repos/{REPO}/{path}', '--method', method,
            '-H', 'Accept: application/octet-stream' if binary and path.startswith('releases/assets/') else 'Accept: application/vnd.github+json',
            '-H', 'X-GitHub-Api-Version: 2022-11-28']
    data = None
    if payload is not None:
        args += ['--input', '-']
        data = json.dumps(payload).encode()
    result = gh(*args, data=data)
    return result if binary else json.loads(result)

def maybe(path):
    try:
        return api(path)
    except RuntimeError as error:
        if '(HTTP 404)' in str(error):
            return None
        raise

def old_identity():
    tag = api('git/ref/tags/v1.0.0')['object']
    require(tag == {'sha': OLD_COMMIT, 'type': 'commit',
                    'url': f'https://api.github.com/repos/{REPO}/git/commits/{OLD_COMMIT}'}, 'v1.0.0 tag changed')
    release = api('releases/tags/v1.0.0')
    # Downloads alter counters, not the release or asset identities being preserved.
    return {k: release[k] for k in ('id', 'tag_name', 'name', 'body', 'draft', 'prerelease', 'updated_at')} | {
        'assets': sorted([(a['id'], a['name'], a['size'], a.get('digest'), a['updated_at'])
                          for a in release['assets']])}

def public_bytes(url):
    # Intentionally anonymous; no token or other credentials are attached.
    request = urllib.request.Request(url, headers={'User-Agent': 'Pywel-public-release-verification'})
    with urllib.request.urlopen(request, timeout=60) as response:
        require(response.status == 200, 'Public download is not available')
        return response.read(4 * 1024 * 1024)

require(os.environ.get('GITHUB_REPOSITORY') == REPO, 'Wrong repository')
require(os.environ.get('GITHUB_REF') == 'refs/heads/agent/publish-approved-expansion-2026-09-10', 'Wrong publication branch')
require(os.environ.get('GITHUB_EVENT_NAME') in {'create', 'push'}, 'Wrong publication event')
old = old_identity()
main_before = api('git/ref/heads/main')['object']['sha']
require(api(f'git/commits/{COMMIT}')['tree']['sha'] == TREE, 'Approved tree differs')
run = api(f'actions/runs/{RUN}')
require(run['head_sha'] == COMMIT and run['head_branch'] == 'main' and run['event'] == 'push'
        and run['status'] == 'completed' and run['conclusion'] == 'success', 'Approved main CI is not successful')
artifact = api(f'actions/artifacts/{ARTIFACT}')
require(not artifact['expired'] and artifact['workflow_run']['id'] == RUN
        and artifact['digest'] == f'sha256:{ZIP_SHA}', 'Wrong or expired verified artifact')
archive = api(f'actions/artifacts/{ARTIFACT}/zip', binary=True)
require(len(archive) == 1016826 and sha(archive) == ZIP_SHA, 'Candidate ZIP differs from approved bytes')
with zipfile.ZipFile(io.BytesIO(archive)) as z:
    require(set(z.namelist()) == NAMES and len(z.infolist()) == len(NAMES), 'Unexpected candidate file set')
    require(sum(i.file_size for i in z.infolist()) < 2 * 1024 * 1024, 'Candidate exceeds size bound')
    files = {n: z.read(n) for n in sorted(NAMES)}
require(sha(files['SHA256SUMS']) == SUMS_SHA, 'Checksum index differs')
checks = [line.split('  ', 1) for line in files['SHA256SUMS'].decode().splitlines()]
require({n for _, n in checks} == NAMES - {'SHA256SUMS'} and len(checks) == 5, 'Incomplete checksum index')
for expected, name in checks:
    require(sha(files[name]) == expected, f'Checksum failed: {name}')
candidate = json.loads(files['CANDIDATE.json'])
require((candidate['source_commit'], candidate['git_tree'], candidate['build_id'], candidate['release_label'])
        == (COMMIT, TREE, BUILD, LABEL), 'Candidate identities do not match approval')
acceptance = json.loads(files['M10-ACCEPTANCE.json'])
require(acceptance['source_commit'] == COMMIT and acceptance['checks_passed'] is True, 'Acceptance report mismatch')
releases = api('releases?per_page=100')
require(len(releases) < 100, 'Inspect release pagination before proceeding')
require(not any(r['tag_name'] == LABEL for r in releases), 'Existing release is never overwritten; inspect it separately')
existing_tag = maybe(f'git/ref/tags/{LABEL}')
require(existing_tag is None or (existing_tag['object']['type'] == 'commit'
        and existing_tag['object']['sha'] == COMMIT), 'Existing expansion tag differs; never move it')
print('PREFLIGHT PASSED: exact approved package, acceptance, tree and successful main CI; no rebuild.', flush=True)

notes = f'''# Pywel Expansion 2026.09.10.1

This owner-approved release publishes the checked first source-and-data expansion. It is an unofficial Crimson Desert knowledge snapshot for AI agents, not a current-game certification or a new npm/API version.

## Exact release identity

- Tag: `{LABEL}`
- Source commit: `{COMMIT}`
- Source tree: `{TREE}`
- Data build: `{BUILD}`
- Accepted main CI: https://github.com/{REPO}/actions/runs/{RUN}
- Readiness and review: https://github.com/{REPO}/pull/11
- Publication execution: https://github.com/{REPO}/actions/runs/{os.environ['GITHUB_RUN_ID']}

The six assets are the **unchanged** files from the approved M10 package. No rebuild, source edit, npm publication or hosting accompanies this action. The attached candidate metadata and preparation notes intentionally retain their historical `prepared_not_published` state; this release records the subsequent owner-authorized publication. The old `v1.0.0` tag and assets are preserved.

## What changed since v1.0.0

This snapshot integrates subject/recipe grounding fixes; the bounded House Roberts and four-quest progression pilot; Righteous Verdict and Witch's Ring acquisition/effects; database-backed refinement and acquisition reconciliation; and no-install public-file discovery. M10 also corrected unsupported rivalry matching and verified that packaged data binds to the actual shipped source.

The corpus contains **320 entities, 1,447 stored claims, 88 evidence records, 27 patch identities, one source-supported unobserved strategy and five receipts**. Relative to v1.0.0, this adds ten entities, 51 stored claim records, eleven evidence records and four receipts. Three superseded guide summaries remain preserved. Counts do not measure whole-game completeness or independent corroboration.

The accepted main ran **232 passing tests across 26 files** on Node 24.18.0, plus canonical/provenance/attribution checks, production dependency audit with zero reported vulnerabilities, reproducible data builds, reproduced source exports, restored-archive verification and tamper rejection. This is evidence for those tested scopes, not proof of every gameplay fact.

## Consume and verify

Start without installing Pywel at https://github.com/{REPO}/blob/{COMMIT}/AGENT_START.md and retain that revision throughout retrieval. This is public-file access, **not hosted REST or remote MCP**. Raw files retain history and require the consuming agent to handle applicability, spoilers and supersession.

Download all six attached files into one directory and run `sha256sum -c SHA256SUMS` (or `shasum -a 256 -c SHA256SUMS`). The source and data tarballs expand into the selected directory; extract them into **separate empty directories**, not on top of each other. The source export includes `SOURCE_MANIFEST.json`; do not install or initialize Git inside that immutable export. For a working checkout, follow https://github.com/{REPO}/blob/{COMMIT}/docs/OPERATIONS.md . The data archive supplies offline JSON/JSONL, schemas, manifests, checksums and notices; it has no installable runtime. GitHub's automatic tag archives are separate from the supplied checked tarballs.

The source archive SHA-256 is `d72ba0efeb8d0715d0927b152e63e831c08c798b75d861a559fab9911d197ef0`.
The data archive SHA-256 is `e0fad8b0315dfb880415b986473e2d4e15da53f9cf596da5cb3d89efeae0688c`.
The SHA256SUMS file's own SHA-256 is `{SUMS_SHA}`.

## Limits and compatibility

Historical indexed coverage remains **1.14.00**. Claim-level current-patch confirmation remains incomplete; the ring's stamina-field meaning and documented world/progression gaps are unresolved. Source dates, seller listings and database versions do not prove live stock, unlock conditions or current gameplay. All original and prior-wave canonical data is retained. Record/response/API/codebook layouts are unchanged; consumers must load predicate registry 14 and compare commit/build identity. Package/MCP initialization metadata remains `1.0.0` with npm publication disabled.

Pywel is not created, endorsed or operated by Pearl Abyss. Code and data licensing remain governed by the supplied LICENSE, LICENSE-DATA, DATA_RIGHTS.md and third-party attribution. No additional rights or gameplay-observation credit is implied by publication. Detailed scope and question results are in the attached release notes and M10 acceptance report.
'''

# Upload into a new draft, verify every uploaded byte, then make it public.
if existing_tag is None:
    api('git/refs', 'POST', {'ref': f'refs/tags/{LABEL}', 'sha': COMMIT})
release = api('releases', 'POST', {'tag_name': LABEL, 'target_commitish': COMMIT,
    'name': 'Pywel Expansion 2026.09.10.1', 'body': notes, 'draft': True,
    'prerelease': False, 'make_latest': 'false'})
release_id = release['id']
with tempfile.TemporaryDirectory(prefix='pywel-publication-') as directory:
    paths = []
    for name, data in files.items():
        path = Path(directory, name)
        path.write_bytes(data)
        paths.append(str(path))
    gh('release', 'upload', LABEL, '--repo', REPO, *paths)

draft = api(f'releases/{release_id}')
require(draft['draft'] and len(draft['assets']) == 6 and {a['name'] for a in draft['assets']} == NAMES,
        'Draft asset set is incomplete or unexpected')
for asset in draft['assets']:
    expected = files[asset['name']]
    require(asset['state'] == 'uploaded' and asset['size'] == len(expected), 'Asset metadata mismatch')
    require(sha(api(f"releases/assets/{asset['id']}", binary=True)) == sha(expected), 'Uploaded bytes differ')
require(api(f'git/ref/tags/{LABEL}')['object']['sha'] == COMMIT, 'Tag mismatch before publication')
require(old_identity() == old, 'v1.0.0 changed; do not publish')
api(f'releases/{release_id}', 'PATCH', {'draft': False, 'prerelease': False, 'make_latest': 'true'})

# Public availability is verified without authentication, not inferred from creation success.
live = json.loads(public_bytes(f'https://api.github.com/repos/{REPO}/releases/tags/{LABEL}'))
require(live['id'] == release_id and not live['draft'] and not live['prerelease'], 'Release is not published')
require({a['name'] for a in live['assets']} == NAMES and len(live['assets']) == 6, 'Public assets differ')
verified_assets = []
for asset in live['assets']:
    data = public_bytes(asset['browser_download_url'])
    require(data == files[asset['name']], f"Anonymous download differs: {asset['name']}")
    verified_assets.append({'name': asset['name'], 'bytes': len(data), 'sha256': sha(data)})
require(old_identity() == old, 'Original release changed')
main_after = api('git/ref/heads/main')['object']['sha']
report = {'published': True, 'release_url': live['html_url'], 'release_id': release_id,
    'tag': LABEL, 'source_commit': COMMIT, 'build_id': BUILD,
    'anonymous_asset_checks': verified_assets, 'v1_0_0_unchanged': True,
    'main_before': main_before, 'main_after': main_after, 'main_unchanged': main_before == main_after,
    'candidate_zip_sha256': ZIP_SHA, 'candidate_ci_run': RUN}
print('PYWEL_PUBLICATION_VERIFIED ' + json.dumps(report, sort_keys=True), flush=True)
Path(os.environ['GITHUB_STEP_SUMMARY']).write_text('# Publication verified\n\n```json\n' + json.dumps(report, indent=2) + '\n```\n')
