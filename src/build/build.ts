import { lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, sha256 } from "../core/canonical-json.js";
import { findProjectRoot } from "../core/paths.js";
import { validateCorpus, validateIntegrity } from "../core/validate.js";
import { latestPatch } from "../core/version.js";
import { buildPublicationRecordAudit, loadPublicationContract, publicKnowledgeProjection, type PublicationContract } from "../quality/publication.js";
import { sourceBuild, type SourceEntry } from "./source-build.js";
import { CANONICAL_RELEASE_NODE_VERSION, isCanonicalReleaseRuntime, type BuildRuntimeFingerprint } from "./runtime.js";

export const JSONL_FAMILIES = {
  "entities.jsonl": "entities",
  "claims.jsonl": "claims",
  "evidence.jsonl": "evidence",
  "patches.jsonl": "patches",
  "strategies.jsonl": "strategies",
  "receipts.jsonl": "receipts",
} as const;

export interface ArtifactEntry { path: string; bytes: number; sha256: string }
export interface BuildManifest {
  schema_version: "pywel.build_manifest.v2";
  build_id: string;
  build_runtime: BuildRuntimeFingerprint;
  canonical_release_node: string;
  canonical_release_runtime_match: boolean;
  source_tree_sha256: string;
  sources: SourceEntry[];
  latest_known_patch: string | null;
  counts: Record<string, number>;
  projection: { scope: "public_knowledge_v1"; publication_contract_id: string };
  artifacts: ArtifactEntry[];
  validation: { errors: number; warnings: string[] };
}

export function copiedArtifactPaths(contract: PublicationContract): string[] {
  return [
    "README.md", "CONTRIBUTING.md", "DATA_RIGHTS.md", "SECURITY.md", "LICENSE", "LICENSE-DATA",
    "LICENSES/THIRD-PARTY-DATA.md", "openapi/openapi.json",
    ...contract.public_schemas.map((name) => `schemas/${name}`),
    ...contract.public_docs.map((name) => `docs/${name}`),
  ];
}

async function writeText(root: string, path: string, value: string): Promise<void> {
  const target = resolve(root, path);
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, value, "utf8");
}

async function assertRealDirectoryIfPresent(path: string): Promise<void> {
  try {
    if (!(await lstat(path)).isDirectory()) throw new Error(`Build output parent must be a real directory: ${path}`);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function artifactInventory(root: string): Promise<ArtifactEntry[]> {
  if (!(await lstat(root)).isDirectory()) throw new Error("Bundle root must be a real directory");
  const artifacts: ArtifactEntry[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        const bytes = await readFile(path);
        artifacts.push({ path: relative(root, path).replaceAll("\\", "/"), bytes: bytes.byteLength, sha256: sha256(bytes) });
      } else throw new Error(`Unsupported bundle entry: ${path}`);
    }
  }
  await visit(root);
  return artifacts.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

export async function buildData(projectRoot: string): Promise<BuildManifest> {
  const { report, store } = await validateCorpus(projectRoot);
  if (!report.valid || store === undefined) throw new Error(`Canonical corpus is invalid: ${canonicalJson(report.errors)}`);
  const publicStore = publicKnowledgeProjection(store);
  const errors = validateIntegrity(publicStore).filter((issue) => issue.severity === "error");
  if (errors.length > 0) throw new Error(`Public corpus integrity failed: ${canonicalJson(errors)}`);
  const contract = await loadPublicationContract(projectRoot);
  const audit = buildPublicationRecordAudit(store, contract);
  if (audit.automated_violations.length > 0 || audit.record_specific_rights_holds.length > 0) {
    throw new Error("Canonical corpus has unresolved publication violations or rights holds");
  }
  const { sources, buildId, runtime } = await sourceBuild(projectRoot);
  const output = resolve(projectRoot, "dist", "data");
  await assertRealDirectoryIfPresent(resolve(projectRoot, "dist"));
  await assertRealDirectoryIfPresent(output);
  // This disposable directory is the only output replaced. Compiled runtime and source snapshots survive.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const latestKnownPatch = latestPatch(publicStore.patches.map((patch) => patch.version)) ?? null;
  const corpus = {
    schema_version: "pywel.corpus.v1",
    build_id: buildId,
    build_runtime: runtime,
    latest_known_patch: latestKnownPatch,
    publication_projection: { scope: "public_knowledge_v1" },
    ...publicStore,
  };
  await writeText(output, "corpus.json", canonicalJson(corpus, true));
  for (const [path, family] of Object.entries(JSONL_FAMILIES)) {
    const records = publicStore[family];
    await writeText(output, path, records.map((record) => `${canonicalJson(record)}\n`).join(""));
  }
  await writeText(output, "predicate-registry.json", canonicalJson(publicStore.predicateRegistry, true));
  await writeText(output, "entity-subtypes.json", canonicalJson(publicStore.entitySubtypeRegistry, true));
  for (const path of copiedArtifactPaths(contract)) {
    if (path.includes("..") || path.startsWith("/") || path.includes("\\")) throw new Error(`Unsafe publication path: ${path}`);
    await writeText(output, path, await readFile(resolve(projectRoot, path), "utf8"));
  }
  const manifest: BuildManifest = {
    schema_version: "pywel.build_manifest.v2",
    build_id: buildId,
    build_runtime: runtime,
    canonical_release_node: CANONICAL_RELEASE_NODE_VERSION,
    canonical_release_runtime_match: isCanonicalReleaseRuntime(runtime),
    source_tree_sha256: sha256(canonicalJson(sources)),
    sources,
    latest_known_patch: latestKnownPatch,
    counts: Object.fromEntries(Object.values(JSONL_FAMILIES).map((family) => [family, publicStore[family].length])),
    projection: { scope: "public_knowledge_v1", publication_contract_id: contract.contract_id },
    artifacts: await artifactInventory(output),
    validation: { errors: 0, warnings: report.warnings.map((warning) => warning.code).sort() },
  };
  await writeText(output, "manifest.json", canonicalJson(manifest, true));
  const checksums = (await artifactInventory(output)).map((artifact) => `${artifact.sha256}  ${artifact.path}\n`).join("");
  await writeText(output, "checksums.sha256", checksums);
  return manifest;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildData(findProjectRoot()).then((manifest) => {
    process.stdout.write(`${canonicalJson({ ok: true, build_id: manifest.build_id, output: "dist/data", files: manifest.artifacts.length + 2 })}\n`);
  }).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
