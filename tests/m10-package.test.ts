import { execFile, execFileSync } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { buildData } from "../src/build/build.js";
import { verifyDistribution } from "../src/cli/verify-dist.js";
import { findProjectRoot } from "../src/core/paths.js";

const execute = promisify(execFile);

it("refuses to package data whose ignored build input is missing from the source export", async () => {
  const root = findProjectRoot();
  const working = await mkdtemp(resolve(tmpdir(), "pywel-m10-ignored-input-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: working, encoding: "utf8" }).trim();
  try {
    const paths = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
    for (const path of paths) {
      const target = resolve(working, path);
      await mkdir(dirname(target), { recursive: true });
      await cp(resolve(root, path), target);
    }
    git("init", "-q");
    git("add", ".");
    git("-c", "user.name=Pywel Test", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "Disposable source-binding fixture");
    // Harmless synthetic content, never personal configuration or a credential.
    await writeFile(resolve(working, "docs/debug.log"), "Ignored packaging regression fixture\n");
    expect(git("status", "--porcelain")).toBe("");
    expect(git("check-ignore", "docs/debug.log")).toBe("docs/debug.log");
    await buildData(working);
    const data = resolve(working, "dist/data");
    expect(await verifyDistribution(data, working)).toMatchObject({ ok: true, source_bound: true });
    // Minimal fixture to reach the packaging guard; not a real acceptance report.
    await writeFile(resolve(working, "dist/m10-acceptance.json"), JSON.stringify({
      source_commit: git("rev-parse", "HEAD"), release_label: "expansion-2026.09.10.1",
      checks_passed: true, results: Array(20).fill(null),
    }));
    await expect(execute(process.execPath, [
      "--import", import.meta.resolve("tsx"), resolve(root, "scripts/prepare-release.mjs"), "expansion-2026.09.10.1",
    ], { cwd: working, timeout: 30000, maxBuffer: 1024 * 1024 })).rejects.toThrow("Bundle was built from different source inputs");
    // A mismatched source/data pair must fail before producing publishable archives.
    await expect(access(resolve(working, "dist/release-candidate"))).rejects.toThrow();
    const manifest = JSON.parse(await readFile(resolve(working, "dist/public-source/SOURCE_MANIFEST.json"), "utf8")) as { files: Array<{ path: string }> };
    expect(manifest.files.some(file => file.path === "docs/debug.log")).toBe(false);
  } finally { await rm(working, { recursive: true, force: true }); }
}, 45000);
