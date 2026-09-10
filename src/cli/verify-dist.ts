import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { artifactInventory, copiedArtifactPaths, JSONL_FAMILIES, type BuildManifest } from "../build/build.js";
import { sourceBuild } from "../build/source-build.js";
import { CANONICAL_RELEASE_NODE_VERSION, isCanonicalReleaseRuntime } from "../build/runtime.js";
import { canonicalJson, sha256 } from "../core/canonical-json.js";
import type { KnowledgeStore } from "../core/types.js";
import { compileStandaloneValidator, validateCorpus, validateIntegrity } from "../core/validate.js";
import { latestPatch } from "../core/version.js";
import { inspectPublicationText, loadPublicationContract, publicKnowledgeProjection } from "../quality/publication.js";
import { findProjectRoot } from "../core/paths.js";

function safePath(path: string): void {
  if (typeof path !== "string" || !/^[A-Za-z0-9_.\/-]+$/.test(path) || path.startsWith("/") || path.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Unsafe artifact path: ${String(path)}`);
  }
}

export async function verifyDistribution(bundleRoot: string, projectRoot?: string): Promise<{
  ok: true; build_id: string; files: number; bytes: number; source_bound: boolean;
}> {
  const actual = await artifactInventory(bundleRoot);
  const required = ["corpus.json", "manifest.json", "checksums.sha256", "predicate-registry.json", "entity-subtypes.json",
    "LICENSE", "LICENSE-DATA", "DATA_RIGHTS.md", "LICENSES/THIRD-PARTY-DATA.md", ...Object.keys(JSONL_FAMILIES)];
  for (const path of required) if (!actual.some((artifact) => artifact.path === path)) throw new Error(`Missing required artifact: ${path}`);
  const contents = new Map<string, string>();
  for (const artifact of actual) {
    safePath(artifact.path);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(await readFile(resolve(bundleRoot, artifact.path)));
    const violations = inspectPublicationText(text, artifact.path);
    if (violations.length > 0) throw new Error(`Publication content violation: ${canonicalJson(violations)}`);
    contents.set(artifact.path, text);
  }
  const manifest = JSON.parse(contents.get("manifest.json")!) as BuildManifest;
  const validateManifest = await compileStandaloneValidator(bundleRoot, "pywel.build_manifest.v2");
  if (!validateManifest(manifest)) throw new Error(`Build manifest schema is invalid: ${canonicalJson(validateManifest.errors)}`);
  if (manifest.schema_version !== "pywel.build_manifest.v2" || manifest.projection?.scope !== "public_knowledge_v1") throw new Error("Invalid build manifest contract");
  if (manifest.canonical_release_node !== CANONICAL_RELEASE_NODE_VERSION ||
      manifest.canonical_release_runtime_match !== isCanonicalReleaseRuntime(manifest.build_runtime)) throw new Error("Invalid build runtime identity");
  for (const artifact of manifest.artifacts) safePath(artifact.path);
  const expectedArtifacts = actual.filter((artifact) => !["manifest.json", "checksums.sha256"].includes(artifact.path));
  if (canonicalJson(manifest.artifacts) !== canonicalJson(expectedArtifacts)) throw new Error("Manifest artifact file-set, byte count, or hash mismatch");
  const checksumText = contents.get("checksums.sha256")!;
  const seen = new Set<string>();
  for (const line of checksumText.trimEnd().split("\n")) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (match === null) throw new Error("Malformed checksum line");
    const path = match[2]!;
    safePath(path);
    if (seen.has(path)) throw new Error(`Duplicate checksum path: ${path}`);
    seen.add(path);
  }
  const expectedChecksums = actual.filter((artifact) => artifact.path !== "checksums.sha256")
    .map((artifact) => `${artifact.sha256}  ${artifact.path}\n`).join("");
  if (checksumText !== expectedChecksums) throw new Error("Checksum file-set or hash mismatch");
  const sourcePaths = new Set<string>();
  for (const source of manifest.sources) {
    safePath(source.path);
    if (!/^[a-f0-9]{64}$/.test(source.sha256) || sourcePaths.has(source.path)) throw new Error("Invalid or duplicate source inventory entry");
    sourcePaths.add(source.path);
  }
  if (manifest.source_tree_sha256 !== sha256(canonicalJson(manifest.sources)) ||
      manifest.build_id !== `bld_${sha256(canonicalJson({ sources: manifest.sources, runtime: manifest.build_runtime })).slice(0, 24)}`) {
    throw new Error("Invalid source/build identity");
  }
  const corpus = JSON.parse(contents.get("corpus.json")!) as KnowledgeStore & { schema_version: string; build_id: string; build_runtime: unknown; latest_known_patch: string | null };
  const validatePublicCorpus = await compileStandaloneValidator(bundleRoot, "pywel.corpus.v1");
  if (!validatePublicCorpus(corpus)) throw new Error(`Public corpus schema is invalid: ${canonicalJson(validatePublicCorpus.errors)}`);
  if (corpus.schema_version !== "pywel.corpus.v1" || corpus.build_id !== manifest.build_id ||
      canonicalJson(corpus.build_runtime) !== canonicalJson(manifest.build_runtime) || corpus.latest_known_patch !== manifest.latest_known_patch) throw new Error("Corpus identity does not match manifest");
  const expectedKeys = ["schema_version", "build_id", "build_runtime", "latest_known_patch", "publication_projection",
    ...Object.values(JSONL_FAMILIES), "predicateRegistry", "entitySubtypeRegistry"].sort();
  if (canonicalJson(Object.keys(corpus).sort()) !== canonicalJson(expectedKeys)) throw new Error("Unexpected corpus field or operational record family");
  const publicStore = publicKnowledgeProjection({
    entities: corpus.entities, claims: corpus.claims, evidence: corpus.evidence, patches: corpus.patches,
    strategies: corpus.strategies, receipts: corpus.receipts,
    predicateRegistry: corpus.predicateRegistry, entitySubtypeRegistry: corpus.entitySubtypeRegistry,
  });
  if (canonicalJson(publicStore.receipts) !== canonicalJson(corpus.receipts)) throw new Error("Public corpus contains unreferenced provenance receipts");
  if ((latestPatch(corpus.patches.map((patch) => patch.version)) ?? null) !== manifest.latest_known_patch) throw new Error("Latest indexed patch does not match the corpus");
  const expectedCounts = Object.fromEntries(Object.values(JSONL_FAMILIES).map((family) => [family, corpus[family].length]));
  if (canonicalJson(manifest.counts) !== canonicalJson(expectedCounts)) throw new Error("Manifest counts do not match the corpus families");
  const errors = validateIntegrity(corpus).filter((issue) => issue.severity === "error");
  if (errors.length > 0) throw new Error(`Public corpus integrity failed: ${canonicalJson(errors)}`);
  for (const [path, family] of Object.entries(JSONL_FAMILIES)) {
    const records = corpus[family];
    if (manifest.counts[family] !== records.length) throw new Error(`Corpus count mismatch: ${family}`);
    const expected = records.map((record) => `${canonicalJson(record)}\n`).join("");
    if (contents.get(path) !== expected) throw new Error(`JSONL does not match corpus: ${path}`);
  }
  if (contents.get("predicate-registry.json") !== canonicalJson(corpus.predicateRegistry, true) ||
      contents.get("entity-subtypes.json") !== canonicalJson(corpus.entitySubtypeRegistry, true)) throw new Error("Vocabulary does not match corpus");
  if (projectRoot !== undefined) {
    const source = await sourceBuild(projectRoot, manifest.build_runtime);
    if (source.buildId !== manifest.build_id) throw new Error("Bundle was built from different source inputs");
    const copiedPaths = copiedArtifactPaths(await loadPublicationContract(projectRoot));
    const expectedPaths = ["corpus.json", "manifest.json", "checksums.sha256", "predicate-registry.json", "entity-subtypes.json",
      ...Object.keys(JSONL_FAMILIES), ...copiedPaths].sort();
    if (canonicalJson(actual.map((artifact) => artifact.path).sort()) !== canonicalJson(expectedPaths)) throw new Error("Bundle file-set differs from the source publication contract");
    const sourceHashes = new Map(source.sources.map((entry) => [entry.path, entry.sha256]));
    const artifactHashes = new Map(actual.map((artifact) => [artifact.path, artifact.sha256]));
    for (const path of copiedPaths) {
      if (sourceHashes.get(path) === undefined || sourceHashes.get(path) !== artifactHashes.get(path)) throw new Error(`Copied artifact differs from source: ${path}`);
    }
    const canonical = await validateCorpus(projectRoot);
    if (!canonical.report.valid || canonical.store === undefined) throw new Error("Bound canonical source is invalid");
    const expected = publicKnowledgeProjection(canonical.store);
    if (canonicalJson(expected) !== canonicalJson(publicStore)) throw new Error("Bundle corpus differs from the canonical public projection");
  }
  return { ok: true, build_id: manifest.build_id, files: actual.length, bytes: actual.reduce((sum, file) => sum + file.bytes, 0), source_bound: projectRoot !== undefined };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = findProjectRoot();
  verifyDistribution(resolve(root, "dist", "data"), root).then((report) => {
    process.stdout.write(`${canonicalJson(report)}\n`);
  }).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
