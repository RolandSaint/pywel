import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findProjectRoot } from "../src/core/paths.js";

async function jsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return jsonFiles(path);
      return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
    }),
  );
  return nested.flat();
}

describe("portable public-record boundary", () => {
  it("does not retain private machine paths or extracted package locators", async () => {
    const root = findProjectRoot();
    const files = [
      ...(await jsonFiles(resolve(root, "data"))),
      ...(await jsonFiles(resolve(root, "quality"))),
    ];
    const content = (await Promise.all(files.map((path) => readFile(path, "utf8")))).join("\n");
    expect(content).not.toMatch(/[A-Z]:\\/);
    expect(content).not.toMatch(/steamapps|(?:^|[\\/])0\.(?:paz|pamt)(?:$|[\\/])/i);
    expect(content).not.toMatch(/C:\\Users\\/i);
  });
});
