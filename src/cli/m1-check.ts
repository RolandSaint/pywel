import { execFileSync } from "node:child_process";
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, sha256 } from "../core/canonical-json.js";
import { findProjectRoot } from "../core/paths.js";
import type { CanonicalRecord } from "../core/types.js";
import { compileStandaloneValidator, validateCorpus, validateIntegrity } from "../core/validate.js";
import { buildPublicationRecordAudit, loadPublicationContract, publicKnowledgeProjection } from "../quality/publication.js";
import { inspectTrackedFile } from "./repository-policy.js";

interface FileDigest { path: string; sha256: string }
interface Scope {
  scope_id: string;
  historical_patch_ceiling: string;
  record_ids: Record<string, string[]>;
  counts: Record<string, number>;
  canonical_files: FileDigest[];
  excluded_records: Array<{ record_id: string; reason: string }>;
}

function recordId(record: CanonicalRecord): string {
  if ("entity_id" in record) return record.entity_id;
  if ("claim_id" in record) return record.claim_id;
  if ("evidence_id" in record) return record.evidence_id;
  if ("patch_id" in record) return record.patch_id;
  if ("strategy_id" in record) return record.strategy_id;
  if ("receipt_id" in record) return record.receipt_id;
  throw new Error("Record is outside the public source model");
}

async function walk(root: string, prefix = ""): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name === ".git") throw new Error(`Source snapshot contains Git metadata: ${path}`);
    if (entry.isSymbolicLink()) throw new Error(`Source snapshot contains symlink: ${path}`);
    if (entry.isDirectory()) paths.push(...await walk(root, path));
    else if (entry.isFile()) paths.push(path);
    else throw new Error(`Source snapshot contains non-regular entry: ${path}`);
  }
  return paths.sort();
}

async function sourceFiles(root: string): Promise<{ paths: string[]; snapshot: boolean }> {
  const manifestPath = resolve(root, "SOURCE_MANIFEST.json");
  let manifestText: string | undefined;
  try {
    const stat = await lstat(manifestPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Source manifest is not a regular file");
    manifestText = await readFile(manifestPath, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (manifestText !== undefined) {
    const manifest = JSON.parse(manifestText) as Record<string, unknown>;
    // Keep these invariants independent of schemas supplied by the inspected snapshot.
    const exactKeys = (value: unknown, keys: string[]): value is Record<string, unknown> =>
      value !== null && typeof value === "object" && !Array.isArray(value) &&
      canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
    if (
      !exactKeys(manifest, ["schema_version", "history", "files", "scope_sha256", "boundaries"]) ||
      manifest.schema_version !== "pywel.source_snapshot.v1" || manifest.history !== "excluded" ||
      typeof manifest.scope_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(manifest.scope_sha256) ||
      !exactKeys(manifest.boundaries, ["original_git_history", "private_release_assets", "credentials", "public_visibility_changed"]) ||
      Object.values(manifest.boundaries).some(value => value !== false) ||
      !Array.isArray(manifest.files) || manifest.files.length === 0 ||
      manifest.files.some(file => !exactKeys(file, ["path", "sha256"]) ||
        typeof file.path !== "string" || !/^[a-zA-Z0-9._/-]+$/.test(file.path) ||
        file.path.split("/").some(segment => segment === "" || segment === "." || segment === "..") ||
        file.path === "SOURCE_MANIFEST.json" ||
        typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(file.sha256))
    ) throw new Error("Source manifest metadata is invalid");
    const files = manifest.files as FileDigest[];
    const paths = await walk(root);
    if (manifest.scope_sha256 !== sha256(await readFile(resolve(root, "quality/public-release-scope.json")))) {
      throw new Error("Source manifest scope hash does not match the release scope");
    }
    const actual = paths.filter(path => path !== "SOURCE_MANIFEST.json");
    const expected = files.map(file => file.path).sort();
    if (canonicalJson(actual) !== canonicalJson(expected)) throw new Error("Source snapshot file set differs from manifest");
    for (const file of files) {
      if (sha256(await readFile(resolve(root, file.path))) !== file.sha256) throw new Error(`Source snapshot changed: ${file.path}`);
    }
    return { paths, snapshot: true };
  }
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const paths: string[] = [];
  const canonicalRoot = await realpath(root);
  for (const path of [...new Set(listed)].sort()) {
    try {
      if (path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) throw new Error(`Source path escapes checkout: ${path}`);
      const absolute = resolve(canonicalRoot, path);
      if (await realpath(absolute) !== absolute) throw new Error(`Source path contains symlink: ${path}`);
      const stat = await lstat(absolute);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Source entry is not a regular file: ${path}`);
      paths.push(path);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return { paths, snapshot: false };
}

export async function checkM1(root: string) {
  const source = await sourceFiles(root);
  for (const path of [
    "LICENSE", "LICENSE-DATA", "DATA_RIGHTS.md", "LICENSES/THIRD-PARTY-DATA.md",
    "CONTRIBUTING.md", "docs/SOURCE_POLICY.md", "docs/RELEASE_SCOPE.md",
    "docs/ROADMAP_TO_1_0.md", "quality/public-release-scope.json", "README.md",
  ]) {
    if (!source.paths.includes(path)) throw new Error(`Required public source file is missing: ${path}`);
  }
  const scopeBytes = await readFile(resolve(root, "quality/public-release-scope.json"));
  const scope = JSON.parse(scopeBytes.toString("utf8")) as Scope;
  const validateScope = await compileStandaloneValidator(root, "pywel.public_release_scope.v2");
  if (!validateScope(scope)) throw new Error(`Invalid release scope: ${canonicalJson(validateScope.errors)}`);
  const { report, store } = await validateCorpus(root);
  if (!report.valid || !store) throw new Error(`Canonical validation failed: ${canonicalJson(report.errors)}`);
  const collections: Record<string, CanonicalRecord[]> = {
    entities: store.entities, claims: store.claims, evidence: store.evidence, patches: store.patches,
    patchChanges: [], patchReviews: [], strategies: store.strategies, receipts: store.receipts,
  };
  const excluded = new Set(scope.excluded_records.map(record => record.record_id));
  for (const [family, records] of Object.entries(collections)) {
    const ids = records.map(recordId).sort();
    if (canonicalJson(ids) !== canonicalJson(scope.record_ids[family]) || ids.length !== scope.counts[family]) {
      throw new Error(`Canonical ${family} no longer matches the fixed release scope`);
    }
    if (ids.some(id => excluded.has(id))) throw new Error(`Excluded record reintroduced in ${family}`);
  }
  for (const file of scope.canonical_files) {
    if (file.path.includes("..") || sha256(await readFile(resolve(root, file.path))) !== file.sha256) throw new Error(`Frozen canonical input changed: ${file.path}`);
  }
  const canonicalPaths = [
    ...(await walk(resolve(root, "data/canonical"))).map(path => `data/canonical/${path}`),
    ...(await walk(resolve(root, "data/vocabulary"))).map(path => `data/vocabulary/${path}`),
  ].filter(path => path.endsWith(".json")).sort();
  if (canonicalJson(canonicalPaths) !== canonicalJson(scope.canonical_files.map(file => file.path).sort())) throw new Error("Canonical input file set differs from fixed scope");
  for (const evidence of store.evidence) {
    const source = new URL(evidence.source.url);
    const wiki = source.protocol === "https:" && source.hostname === "crimsonwiki.org" && evidence.rights.license_status === "compatible_license";
    const official = source.protocol === "https:" && source.hostname === "crimsondesert.pearlabyss.com" && evidence.rights.license_status === "publisher_owned";
    if ((!wiki && !official) || evidence.rights.retention_mode !== "normalized_facts") throw new Error(`Evidence lacks the selected M1 publication basis: ${evidence.evidence_id}`);
  }
  const personalPredicate = /owner_|^appearance\.current_state$/i;
  if (store.claims.some(claim => personalPredicate.test(claim.predicate)) || store.entities.some(entity => entity.slug.startsWith("build.") || entity.tags.includes("owner-selected"))) throw new Error("Personal preference or state record reintroduced");
  const projection = publicKnowledgeProjection(store);
  const publicErrors = validateIntegrity(projection).filter(issue => issue.severity === "error");
  if (publicErrors.length) throw new Error(`Public provenance does not validate: ${canonicalJson(publicErrors)}`);
  const audit = buildPublicationRecordAudit(store, await loadPublicationContract(root));
  if (audit.automated_violations.length || audit.record_specific_rights_holds.length) throw new Error("Publication audit has unresolved violations or rights holds");
  const attribution = await readFile(resolve(root, "LICENSES/THIRD-PARTY-DATA.md"), "utf8");
  const attributed = [...attribution.matchAll(/evd_[a-z0-9]{12,64}/g)].map(match => match[0]).sort();
  if (canonicalJson(attributed) !== canonicalJson(store.evidence.map(evidence => evidence.evidence_id).sort())) throw new Error("Attribution must cover each retained evidence record exactly once");
  const issues: string[] = [];
  for (const path of source.paths) {
    if (path.split("/").some(segment => [".git", "node_modules", "dist"].includes(segment)) || ["imports", "status", "events", "captures"].includes(path.split("/")[0]!)) issues.push(`Excluded source directory: ${path}`);
    if (["data/policies/", "data/canonical/policies/"].some(prefix => path.startsWith(prefix)) && !path.endsWith("/.gitkeep")) issues.push(`Removed operational record family: ${path}`);
    if (path.startsWith("scripts/seed-") || path.startsWith("scripts/profiles/")) issues.push(`Retired importer: ${path}`);
    const bytes = await readFile(resolve(root, path));
    issues.push(...inspectTrackedFile(path, bytes).map(issue => `${path}: ${issue}`));
    if (path.startsWith("data/") && /urn:pywel:artifact:|source_root_label|owner_selected|private_capture/i.test(bytes.toString("utf8"))) issues.push(`Private data marker: ${path}`);
  }
  if (issues.length) throw new Error(issues.join("\n"));
  return {
    milestone: "M1", result: "pass", scope_id: scope.scope_id, scope_sha256: sha256(scopeBytes),
    counts: scope.counts, canonical_valid: true, public_provenance_valid: true,
    rights_holds: 0, source_policy_violations: 0, source_files_checked: source.paths.length,
    original_history: "excluded_not_declared_clean", clean_snapshot_verified: source.snapshot,
    warnings: report.warnings.length, warning_disposition: "Retained source-supported strategies have no recorded gameplay attempts; no observation credit claimed.",
    release_ready: false, public_visibility_changed: false,
  };
}

export async function exportPublicSource(root: string): Promise<string> {
  await checkM1(root);
  const { paths, snapshot } = await sourceFiles(root);
  if (snapshot) throw new Error("Export the public source only from its GitHub working source, not another projection");
  const target = resolve(root, "dist/public-source");
  await mkdir(dirname(target), { recursive: true });
  const outputParent = await lstat(dirname(target));
  if (!outputParent.isDirectory() || outputParent.isSymbolicLink()) throw new Error("Public source output directory is not a regular directory");
  // Never overwrite an existing candidate: its inspected bytes stay reviewable.
  await mkdir(target);
  const files: FileDigest[] = [];
  for (const path of paths) {
    const bytes = await readFile(resolve(root, path));
    await mkdir(dirname(resolve(target, path)), { recursive: true });
    await writeFile(resolve(target, path), bytes);
    files.push({ path, sha256: sha256(bytes) });
  }
  await writeFile(resolve(target, "SOURCE_MANIFEST.json"), canonicalJson({
    schema_version: "pywel.source_snapshot.v1", history: "excluded", files,
    scope_sha256: sha256(await readFile(resolve(root, "quality/public-release-scope.json"))),
    boundaries: { original_git_history: false, private_release_assets: false, credentials: false, public_visibility_changed: false },
  }, true));
  await checkM1(target);
  return target;
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  const root = findProjectRoot();
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--export-source")) throw new Error("Usage: m1-check [--export-source]");
  const snapshot = args.includes("--export-source") ? await exportPublicSource(root) : undefined;
  const result = snapshot === undefined
    ? await checkM1(root)
    : { ...await checkM1(snapshot), source_snapshot: snapshot };
  process.stdout.write(canonicalJson(result, true));
}
