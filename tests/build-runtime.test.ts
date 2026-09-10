import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CANONICAL_RELEASE_NODE_VERSION, currentBuildRuntime, isCanonicalReleaseRuntime } from "../src/build/runtime.js";
import { sourceBuild, sourceInventory } from "../src/build/source-build.js";
import { findProjectRoot } from "../src/core/paths.js";

async function copySource(root: string): Promise<void> {
  const project = findProjectRoot();
  for (const entry of await sourceInventory(project)) {
    const target = resolve(root, entry.path);
    await mkdir(resolve(target, ".."), { recursive: true });
    await cp(resolve(project, entry.path), target);
  }
}

describe("build source and runtime identity", () => {
  it("pins Node without architecture or SQLite requirements", () => {
    expect(currentBuildRuntime()).toEqual({ node: process.versions.node });
    expect(CANONICAL_RELEASE_NODE_VERSION).toBe("24.18.0");
    expect(isCanonicalReleaseRuntime({ node: "24.18.0" })).toBe(true);
    expect(isCanonicalReleaseRuntime({ node: "24.19.0" })).toBe(false);
  });

  it("binds source and runtime changes while excluding disposable outputs", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "pywel-source-build-"));
    try {
      await copySource(root);
      await writeFile(resolve(root, "src", "example.ts"), "export const value = 1;\n");
      const first = await sourceBuild(root, { node: "24.18.0" });
      const changedRuntime = await sourceBuild(root, { node: "24.19.0" });
      expect(first.buildId).not.toBe(changedRuntime.buildId);
      await mkdir(resolve(root, "dist"));
      await writeFile(resolve(root, "dist", "previous.json"), "{}\n");
      expect(await sourceBuild(root, { node: "24.18.0" })).toEqual(first);
      await writeFile(resolve(root, "src", "example.ts"), "export const value = 2;\n");
      expect((await sourceBuild(root, { node: "24.18.0" })).buildId).not.toBe(first.buildId);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it.each(["data", "docs", "schemas"])("rejects a symlink as the %s source directory", async (directory) => {
    const temporary = await mkdtemp(resolve(tmpdir(), "pywel-source-symlink-"));
    const root = resolve(temporary, "source");
    const outside = resolve(temporary, "outside");
    try {
      await copySource(root);
      await mkdir(outside);
      await writeFile(resolve(outside, "external.json"), "{}\n");
      await rm(resolve(root, directory), { recursive: true });
      await symlink(outside, resolve(root, directory), "dir");
      await expect(sourceInventory(root)).rejects.toThrow("Unsupported build input directory");
    } finally { await rm(temporary, { recursive: true, force: true }); }
  });

  it("can identify a minimal source fixture with absent unused roots", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "pywel-source-minimal-"));
    try {
      await mkdir(resolve(root, "src"));
      await writeFile(resolve(root, "src", "example.ts"), "export const example = true;\n");
      expect(await sourceInventory(root)).toEqual([{ path: "src/example.ts", sha256: expect.any(String) }]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
