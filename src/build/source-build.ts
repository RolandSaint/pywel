import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { canonicalJson, sha256 } from "../core/canonical-json.js";
import { currentBuildRuntime, type BuildRuntimeFingerprint } from "./runtime.js";

const SOURCE_ROOTS = [".github", "data", "docs", "openapi", "quality", "schemas", "src", "tests", "LICENSES"];
const SOURCE_ROOT_FILES = [
  ".editorconfig", ".gitattributes", ".gitignore", ".node-version", ".nvmrc",
  "000_LOAD_FIRST_PYWEL.yaml", "AGENTS.md", "CONTRIBUTING.md", "DATA_RIGHTS.md", "LICENSE",
  "LICENSE-DATA", "README.md", "SECURITY.md", "package-lock.json", "package.json",
  "tsconfig.emit.json", "tsconfig.json",
];

export interface SourceEntry { path: string; sha256: string }

async function filesUnder(directory: string): Promise<string[]> {
  if (!(await lstat(directory)).isDirectory()) throw new Error(`Unsupported build input directory: ${directory}`);
  const files: string[] = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported build input: ${path}`);
  }
  return files;
}

export async function sourceInventory(projectRoot: string): Promise<SourceEntry[]> {
  if (!(await lstat(projectRoot)).isDirectory()) throw new Error("Build source root must be a real directory");
  const inventory: SourceEntry[] = [];
  for (const root of SOURCE_ROOTS) {
    const directory = resolve(projectRoot, root);
    try {
      if (!(await lstat(directory)).isDirectory()) throw new Error(`Unsupported build input directory: ${directory}`);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    // Only an absent root is optional; a missing child or read failure must propagate.
    for (const path of await filesUnder(directory)) {
      inventory.push({ path: relative(projectRoot, path).replaceAll("\\", "/"), sha256: sha256(await readFile(path)) });
    }
  }
  for (const path of SOURCE_ROOT_FILES) {
    const absolute = resolve(projectRoot, path);
    try {
      if (!(await lstat(absolute)).isFile()) throw new Error(`Unsupported build input: ${path}`);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    inventory.push({ path, sha256: sha256(await readFile(absolute)) });
  }
  return inventory.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

export async function sourceBuild(projectRoot: string, runtime = currentBuildRuntime()): Promise<{
  buildId: string; sources: SourceEntry[]; runtime: BuildRuntimeFingerprint;
}> {
  const sources = await sourceInventory(projectRoot);
  return { buildId: `bld_${sha256(canonicalJson({ sources, runtime })).slice(0, 24)}`, sources, runtime };
}
