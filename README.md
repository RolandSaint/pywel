# Pywel Knowledge Standard

Unofficial, portable, machine-readable Crimson Desert knowledge for AI agents.

Pywel stores atomic claims with stable identities, evidence, uncertainty, and game-version context. Its finite reference dataset can be consumed as offline JSON/JSONL or through a small local read-only REST or stdio MCP implementation. Required operation uses no model, cloud account, database, hosted service, or personal configuration.

> Pywel is not created, endorsed, or operated by Pearl Abyss. Crimson Desert and third-party materials remain subject to their respective rights.

## Pywel 1.0.0

**Pywel software 1.0.0 begins with the verified clean source snapshot accepted at [M5](docs/M5_COMPLETION.md), with reviewed publication-only documentation and CI changes.** M0–M5 are complete for their recorded scope. See [the scope](docs/RELEASE_SCOPE.md), [milestones](docs/ROADMAP_TO_1_0.md), [M1 evidence](docs/M1_COMPLETION.md), [M2 evidence](docs/M2_COMPLETION.md), [M3 evidence](docs/M3_COMPLETION.md), and [M4 evidence](docs/M4_COMPLETION.md).

The source manifest `quality/public-release-scope.json` retains **310 entities, 1,396 claims, 77 evidence records, 27 patch identities, one strategy, and one safe receipt**. Patch coverage ends at historical indexed version **1.14.00**. This is not current-live-game coverage, and release requires no additional content wave.

[This GitHub repository](https://github.com/RolandSaint/pywel) is the ongoing source of truth. Its history begins with the clean Pywel 1.0.0 source; the original private development history, refs, releases, assets, and local configuration are excluded and remain private. Use the `v1.0.0` tag and [release notes](https://github.com/RolandSaint/pywel/releases/tag/v1.0.0) for the public commit, artifact identities, checksums, and publication verification. Historical milestone records preserve the scope and limits of the earlier reviews.

## Install, verify, and read

These commands require a complete Git working checkout. The source export is an immutable review/publication artifact; the data-only bundle contains no runtime. To prepare a separate working checkout from a verified export, follow [OPERATIONS](docs/OPERATIONS.md). Use Node **24.18.0**, as pinned in `.node-version`. These commands create a checkout and run from its root:

```sh
git clone --branch v1.0.0 https://github.com/RolandSaint/pywel.git
cd pywel
npm ci --ignore-scripts --no-audit --no-fund
npm run security:audit
npm run check
npm run start
```

REST listens at `http://127.0.0.1:8787`; stop it with Ctrl-C. In another terminal:

```sh
curl http://127.0.0.1:8787/v1
curl 'http://127.0.0.1:8787/v1/search?q=Hernand'
curl 'http://127.0.0.1:8787/v1/answer?q=Is%20controller%20remapping%20available%3F&patch=9.99.00&format=full'
```

The future-patch query is a deliberate uncertainty check, not a claim about an existing patch. For MCP, have a stdio client launch `node dist/runtime/mcp/server.js` from the project root (or `npm run --silent mcp`); see [API_V1](docs/API_V1.md). Offline consumers can read `dist/data/corpus.json` or the per-family JSONL files without running a server. In a copied data-only bundle, `corpus.json` and the JSONL files are at its root; that bundle contains no installable runtime.

`npm run check` runs the supported checks; completion evidence must record their actual results. Reproducible builds and exports are checked separately where documented in [OPERATIONS](docs/OPERATIONS.md). Independent installation, correction, and restore are recorded for the named M4 candidate; [M5 acceptance](docs/M5_COMPLETION.md) records the certified source checks and the prior evidence that remains applicable. The release notes record verification of the publication source.

## Source and generated files

| Path | Role |
| --- | --- |
| `data/canonical/` | Reviewed structured knowledge and safe provenance. |
| `schemas/`, `data/vocabulary/` | Versioned structures and controlled terms. |
| `quality/public-release-scope.json` | Fixed retained dataset and publication boundary. |
| `src/` | Validation, one builder, shared query implementation, and local adapters. |
| `dist/data/` | Generated offline corpus, JSONL, schemas, docs, licenses, manifest, and checksums. |
| `dist/runtime/` | Compiled reference implementation; validates and reads canonical source with installed dependencies. |

Generated output is disposable; never edit it by hand. [Architecture](docs/ARCHITECTURE.md), [data model](docs/DATA_MODEL.md), [operations](docs/OPERATIONS.md), and [portability](docs/PORTABILITY.md) explain the surviving path.

## Agent contract and limits

Read `GET /v1` or the MCP `pywel://service` resource for discovery, then use bounded search or exact entity/evidence lookup. Every response identifies its schema and source build. Compact v3 answers retain typed facts and validity; full answers add detail with explicit selection limits. Use `GET /v1/codebook` or `pywel://codebook` to decode tuples. Retrieval accepts `en-US`; omitted spoiler context stays `none`, and platform `all` returns a union of platform records. Inspect the specific support, review boundary, warnings, and gaps. A related entity match, official patch identity, or integrity receipt cannot establish the requested gameplay fact.

The frozen M3 contract defines 16 REST operations, nine MCP tools, and shared typed response bodies. [API_V1](docs/API_V1.md), [OpenAPI](openapi/openapi.json), [response schemas](schemas/agent-contract.schema.json), and [compatibility rules](docs/COMPATIBILITY.md) describe the contract. Software 1.0.0 retains that contract; M3 conformance and M4 independent operation support the final M5 acceptance. HTTP MCP, SQLite, public writes, hosted services, models, queues, capture tooling, containers, and generated human pages are outside the supported path.

## Contributions, rights, and security

Use reviewed Git proposals following [CONTRIBUTING](CONTRIBUTING.md). Keep changes atomic and supported by public evidence, appropriate context, rights, and attribution. Commit and push after each completed milestone; main-branch acceptance requires review and passing required checks.

Software is Apache-2.0 under [LICENSE](LICENSE). Original database contributions and compatible adaptations use CC BY-SA 4.0 only within [LICENSE-DATA](LICENSE-DATA) and [DATA_RIGHTS](DATA_RIGHTS.md); third-party game IP is excluded from that grant. See [attribution](LICENSES/THIRD-PARTY-DATA.md), [SOURCE_POLICY](docs/SOURCE_POLICY.md), and [SECURITY](SECURITY.md).

Never add personal state, conversations, private paths, credentials, copied source bodies, game assets, saves, leaks, or unauthorized extraction output. No personal-system access, live deployment, paid service, or publication is necessary to operate the project.
