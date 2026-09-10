import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkM1 } from "../src/cli/m1-check.js";
import { canonicalJson, sha256 } from "../src/core/canonical-json.js";
import { findProjectRoot } from "../src/core/paths.js";
import { compileStandaloneValidator } from "../src/core/validate.js";

interface SnapshotManifest {
  schema_version: string;
  history: string;
  files: Array<{ path: string; sha256: string }>;
  scope_sha256: string;
  boundaries: Record<string, boolean>;
}

async function filePaths(root: string, prefix = ""): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await filePaths(root, path));
    else result.push(path);
  }
  return result.sort();
}

async function writeManifest(root: string): Promise<SnapshotManifest> {
  const files = await Promise.all((await filePaths(root)).filter(path => path !== "SOURCE_MANIFEST.json")
    .map(async path => ({ path, sha256: sha256(await readFile(resolve(root, path))) })));
  const manifest: SnapshotManifest = {
    schema_version: "pywel.source_snapshot.v1", history: "excluded", files,
    scope_sha256: sha256(await readFile(resolve(root, "quality/public-release-scope.json"))),
    boundaries: { original_git_history: false, private_release_assets: false, credentials: false, public_visibility_changed: false },
  };
  await writeFile(resolve(root, "SOURCE_MANIFEST.json"), canonicalJson(manifest, true));
  return manifest;
}

describe("fixed M1 source boundary", () => {
  let base: string;
  let root: string;
  beforeAll(async () => {
    const project = findProjectRoot();
    base = await mkdtemp(resolve(tmpdir(), "pywel-m1-base-"));
    for (const path of ["data", "schemas", "quality", "LICENSES"]) {
      await cp(resolve(project, path), resolve(base, path), { recursive: true });
    }
    for (const path of [
      "LICENSE", "LICENSE-DATA", "DATA_RIGHTS.md", "CONTRIBUTING.md", "README.md",
      "docs/SOURCE_POLICY.md", "docs/RELEASE_SCOPE.md", "docs/ROADMAP_TO_1_0.md",
    ]) {
      await mkdir(dirname(resolve(base, path)), { recursive: true });
      await cp(resolve(project, path), resolve(base, path));
    }
    await writeManifest(base);
  });
  beforeEach(async () => {
    root = await mkdtemp(resolve(tmpdir(), "pywel-m1-snapshot-"));
    await cp(base, root, { recursive: true });
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });
  afterAll(async () => { await rm(base, { recursive: true, force: true }); });

  it("verifies frozen canonical inputs and provenance without Git or installed dependencies", async () => {
    expect(await checkM1(root)).toMatchObject({
      result: "pass", clean_snapshot_verified: true, public_provenance_valid: true,
      original_history: "excluded_not_declared_clean", release_ready: false,
    });
  });

  it("versions milestone metadata without weakening the publication boundary", async () => {
    const validate = await compileStandaloneValidator(root, "pywel.public_release_scope.v2");
    const scope = JSON.parse(await readFile(resolve(root, "quality/public-release-scope.json"), "utf8"));
    expect(validate(scope), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...scope, schema_version: "pywel.public_release_scope.v1" })).toBe(false);
    for (const M4 of ["pending", "verified_reproducible_candidate"]) {
      for (const M5 of ["pending", "public_release_ready"]) {
        expect(validate({ ...scope, milestones: { ...scope.milestones, M4, M5 } })).toBe(true);
      }
    }
    expect(validate({ ...scope, milestones: { ...scope.milestones, M4: "published" } })).toBe(false);
    expect(validate({ ...scope, publication_boundary: { ...scope.publication_boundary, public_visibility_authorized: true } })).toBe(false);
    expect(validate({ ...scope, publication_boundary: { ...scope.publication_boundary, original_history: "clean" } })).toBe(false);
  });

  it("rejects a missing listed file", async () => {
    await rm(resolve(root, "README.md"));
    await expect(checkM1(root)).rejects.toThrow("file set differs");
  });

  it("rejects a missing data license even when the inventory was regenerated", async () => {
    await rm(resolve(root, "LICENSE-DATA"));
    await writeManifest(root);
    await expect(checkM1(root)).rejects.toThrow("Required public source file is missing: LICENSE-DATA");
  });

  it("rejects changed file bytes and an unlisted file", async () => {
    await writeFile(resolve(root, "README.md"), "Changed after review.\n");
    await expect(checkM1(root)).rejects.toThrow("Source snapshot changed: README.md");
    await cp(resolve(base, "README.md"), resolve(root, "README.md"));
    await writeFile(resolve(root, "unreviewed.txt"), "Unreviewed addition.\n");
    await expect(checkM1(root)).rejects.toThrow("file set differs");
  });

  it("rejects extra manifest metadata, false boundary claims, and a mismatched scope binding", async () => {
    const manifest = JSON.parse(await readFile(resolve(root, "SOURCE_MANIFEST.json"), "utf8")) as SnapshotManifest;
    for (const mutated of [
      { ...manifest, unreviewed_note: "This field must not bypass source inspection." },
      { ...manifest, boundaries: { ...manifest.boundaries, original_git_history: true } },
      { ...manifest, scope_sha256: "0".repeat(64) },
    ]) {
      await writeFile(resolve(root, "SOURCE_MANIFEST.json"), canonicalJson(mutated, true));
      await expect(checkM1(root)).rejects.toThrow(/manifest metadata|manifest scope hash/);
    }
  });

  it("rejects malformed scope metadata even when source inventory hashes are regenerated", async () => {
    const path = resolve(root, "quality/public-release-scope.json");
    const scope = JSON.parse(await readFile(path, "utf8"));
    scope.publication_boundary.public_visibility_authorized = true;
    await writeFile(path, canonicalJson(scope, true));
    await writeManifest(root);
    await expect(checkM1(root)).rejects.toThrow("Invalid release scope");
  });

  it("rejects false snapshot metadata even when the snapshot weakens its own schema", async () => {
    const path = resolve(root, "schemas/source-snapshot.schema.json");
    const schema = JSON.parse(await readFile(path, "utf8")) as { $schema: string; $id: string };
    await writeFile(path, canonicalJson({ $schema: schema.$schema, $id: schema.$id, type: "object" }, true));
    const manifest = await writeManifest(root);
    for (const mutated of [
      { ...manifest, history: "retained" },
      { ...manifest, boundaries: { ...manifest.boundaries, private_release_assets: true } },
      { ...manifest, unreviewed_note: "A snapshot cannot authorize its own extra metadata." },
    ]) {
      await writeFile(resolve(root, "SOURCE_MANIFEST.json"), canonicalJson(mutated, true));
      await expect(checkM1(root)).rejects.toThrow("Source manifest metadata is invalid");
    }
  });

  it("rejects a retired operational event directory even in a checksummed source snapshot", async () => {
    await mkdir(resolve(root, "events"));
    await writeFile(resolve(root, "events/operational.json"), "{}\n");
    await writeManifest(root);
    await expect(checkM1(root)).rejects.toThrow("Excluded source directory: events/operational.json");
  });

  it("rejects a retired policy file ignored by the reduced canonical loader", async () => {
    await mkdir(resolve(root, "data/policies"), { recursive: true });
    await writeFile(resolve(root, "data/policies/retired.json"), "{}\n");
    await writeManifest(root);
    await expect(checkM1(root)).rejects.toThrow("Removed operational record family: data/policies/retired.json");
  });

  it("scans valid manifest fields for secret material", async () => {
    const syntheticName = `${"ghp_" + "A".repeat(40)}.md`;
    await writeFile(resolve(root, syntheticName), "Synthetic filename fixture.\n");
    await writeManifest(root);
    await expect(checkM1(root)).rejects.toThrow("SOURCE_MANIFEST.json: GitHub token pattern detected");
  });

  it("rejects even an empty Git metadata directory", async () => {
    await mkdir(resolve(root, ".git"));
    await expect(checkM1(root)).rejects.toThrow("Git metadata");
  });

  it.skipIf(process.platform === "win32")("rejects special filesystem entries absent from the manifest", async () => {
    execFileSync("mkfifo", [resolve(root, "unlisted-pipe")]);
    await expect(checkM1(root)).rejects.toThrow("non-regular entry");
  });

  it.skipIf(process.platform === "win32")("rejects a tracked path whose parent is replaced with a symlink", async () => {
    const checkout = resolve(root, "checkout");
    const outside = resolve(root, "outside");
    await mkdir(resolve(checkout, "src"), { recursive: true });
    await mkdir(outside);
    await writeFile(resolve(checkout, "src/probe.ts"), "export const probe = true;\n");
    await writeFile(resolve(outside, "probe.ts"), "This external file must not be copied.\n");
    execFileSync("git", ["init", "-q", checkout]);
    execFileSync("git", ["-C", checkout, "add", "src/probe.ts"]);
    await rm(resolve(checkout, "src"), { recursive: true });
    await symlink(outside, resolve(checkout, "src"), "dir");
    await expect(checkM1(checkout)).rejects.toThrow("Source path contains symlink");
  });
});
