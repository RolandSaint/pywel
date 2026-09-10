import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { artifactInventory, buildData, type BuildManifest } from "../src/build/build.js";
import { sourceInventory } from "../src/build/source-build.js";
import { verifyDistribution } from "../src/cli/verify-dist.js";
import { findProjectRoot } from "../src/core/paths.js";
import { canonicalJson } from "../src/core/canonical-json.js";
import { compileStandaloneValidator } from "../src/core/validate.js";

let temporary: string;
let source: string;
let bundle: string;

beforeAll(async () => {
  temporary = await mkdtemp(resolve(tmpdir(), "pywel-bundle-test-"));
  source = resolve(temporary, "source");
  const project = findProjectRoot();
  for (const entry of await sourceInventory(project)) {
    const target = resolve(source, entry.path);
    await mkdir(resolve(target, ".."), { recursive: true });
    await cp(resolve(project, entry.path), target);
  }
  for (const sibling of ["runtime", "public-source"]) {
    await mkdir(resolve(source, "dist", sibling), { recursive: true });
    await writeFile(resolve(source, "dist", sibling, "keep.txt"), "preserve\n");
  }
  await buildData(source);
  bundle = resolve(source, "dist", "data");
}, 30_000);

afterAll(async () => { if (temporary !== undefined) await rm(temporary, { recursive: true, force: true }); });

async function copiedBundle(name: string): Promise<string> {
  const target = resolve(temporary, name);
  await cp(bundle, target, { recursive: true });
  return target;
}

async function refreshChecksums(target: string): Promise<void> {
  const manifest = JSON.parse(await readFile(resolve(target, "manifest.json"), "utf8")) as BuildManifest;
  manifest.artifacts = (await artifactInventory(target)).filter((artifact) => !["manifest.json", "checksums.sha256"].includes(artifact.path));
  await writeFile(resolve(target, "manifest.json"), canonicalJson(manifest, true));
  const checksums = (await artifactInventory(target)).filter((artifact) => artifact.path !== "checksums.sha256")
    .map((artifact) => `${artifact.sha256}  ${artifact.path}\n`).join("");
  await writeFile(resolve(target, "checksums.sha256"), checksums);
}

describe("portable data bundle", () => {
  it("rejects malformed public data even when artifact hashes are internally consistent", async () => {
    const target = await copiedBundle("invalid-corpus-shape");
    const corpus = JSON.parse(await readFile(resolve(target, "corpus.json"), "utf8"));
    corpus.claims[0].object = { kind: "number", value: "not-a-number" };
    await writeFile(resolve(target, "corpus.json"), canonicalJson(corpus, true));
    await refreshChecksums(target);
    await expect(verifyDistribution(target)).rejects.toThrow("Public corpus schema is invalid");
  });

  it("rejects a manifest with untyped counts even after checksums are refreshed", async () => {
    const target = await copiedBundle("invalid-manifest-shape");
    const manifest = JSON.parse(await readFile(resolve(target, "manifest.json"), "utf8"));
    manifest.counts.claims = String(manifest.counts.claims);
    await writeFile(resolve(target, "manifest.json"), canonicalJson(manifest, true));
    await refreshChecksums(target);
    await expect(verifyDistribution(target)).rejects.toThrow("Build manifest schema is invalid");
  });

  it("ships a strict source snapshot manifest schema without requiring a source checkout", async () => {
    const validate = await compileStandaloneValidator(bundle, "pywel.source_snapshot.v1");
    const manifest = {
      schema_version: "pywel.source_snapshot.v1", history: "excluded",
      files: [{ path: "README.md", sha256: "a".repeat(64) }], scope_sha256: "b".repeat(64),
      boundaries: { original_git_history: false, private_release_assets: false, credentials: false, public_visibility_changed: false },
    };
    expect(validate(manifest)).toBe(true);
    for (const path of ["../outside", "/absolute", "a/../outside", "SOURCE_MANIFEST.json"]) {
      expect(validate({ ...manifest, files: [{ path, sha256: "a".repeat(64) }] })).toBe(false);
    }
    expect(validate({ ...manifest, boundaries: { ...manifest.boundaries, original_git_history: true } })).toBe(false);
    expect(validate({ ...manifest, unexpected: "metadata" })).toBe(false);
  });

  it("verifies the exact bundle independently and against its source while preserving output siblings", async () => {
    expect(await verifyDistribution(bundle)).toMatchObject({ ok: true, source_bound: false });
    expect(await verifyDistribution(bundle, source)).toMatchObject({ ok: true, source_bound: true });
    for (const sibling of ["runtime", "public-source"]) {
      expect(await readFile(resolve(source, "dist", sibling, "keep.txt"), "utf8")).toBe("preserve\n");
    }
  });

  it("rejects tampered bytes, extra files, and missing required files", async () => {
    const tampered = await copiedBundle("tampered");
    await writeFile(resolve(tampered, "claims.jsonl"), "{}\n");
    await expect(verifyDistribution(tampered)).rejects.toThrow("mismatch");
    const extra = await copiedBundle("extra");
    await writeFile(resolve(extra, "unexpected.txt"), "extra\n");
    await expect(verifyDistribution(extra)).rejects.toThrow("mismatch");
    const missing = await copiedBundle("missing");
    await rm(resolve(missing, "LICENSE-DATA"));
    await expect(verifyDistribution(missing)).rejects.toThrow("Missing required artifact");
  });

  it.each(["docs/API_V1.md", "schemas/claim.schema.json"])("binds copied %s bytes to source even if artifact checksums are refreshed", async (path) => {
    const target = await copiedBundle(`copied-${path.split("/")[0]}`);
    const original = await readFile(resolve(target, path), "utf8");
    await writeFile(resolve(target, path), `${original}\n`);
    await refreshChecksums(target);
    expect(await verifyDistribution(target)).toMatchObject({ ok: true, source_bound: false });
    await expect(verifyDistribution(target, source)).rejects.toThrow(`Copied artifact differs from source: ${path}`);
  });

  it("rejects an extra artifact against the source contract even after checksums are refreshed", async () => {
    const target = await copiedBundle("contract-extra");
    await writeFile(resolve(target, "extra.txt"), "Unrequested output\n");
    await refreshChecksums(target);
    expect(await verifyDistribution(target)).toMatchObject({ ok: true, source_bound: false });
    await expect(verifyDistribution(target, source)).rejects.toThrow("Bundle file-set differs from the source publication contract");
  });

  it("rejects traversal and duplicate entries in a checksum index", async () => {
    const traversal = await copiedBundle("traversal");
    await writeFile(resolve(traversal, "checksums.sha256"), `${"a".repeat(64)}  ../outside.json\n`);
    await expect(verifyDistribution(traversal)).rejects.toThrow("Unsafe artifact path");
    const duplicate = await copiedBundle("duplicate");
    const checksums = await readFile(resolve(duplicate, "checksums.sha256"), "utf8");
    await writeFile(resolve(duplicate, "checksums.sha256"), `${checksums}${checksums.split("\n")[0]}\n`);
    await expect(verifyDistribution(duplicate)).rejects.toThrow("Duplicate checksum path");
  });

  it("rejects a symlink as the bundle root", async () => {
    const link = resolve(temporary, "link");
    await symlink(bundle, link, "dir");
    await expect(verifyDistribution(link)).rejects.toThrow("real directory");
  });
});
