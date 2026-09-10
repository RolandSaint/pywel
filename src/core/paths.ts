import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function findProjectRoot(start = process.cwd()): string {
  let current = resolve(start);
  while (true) {
    if (
      existsSync(resolve(current, "package.json")) &&
      existsSync(resolve(current, "schemas")) &&
      existsSync(resolve(current, "data", "canonical"))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
      if (existsSync(resolve(sourceRoot, "package.json"))) return sourceRoot;
      throw new Error(`Unable to find Pywel project root from ${start}`);
    }
    current = parent;
  }
}
