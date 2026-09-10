import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const execute = promisify(execFile);
const fixtureSha = "0".repeat(40); // Offline fixture identity only; never presented as a remote revision.
async function probe(snapshot: string, localRoot?: string) {
  const scratch = await mkdtemp(resolve(tmpdir(), "pywel-public-reader-"));
  try {
    const script = await readFile(resolve(root, "tests/support/public-read-smoke.mjs"), "utf8");
    await writeFile(resolve(scratch, "probe.mjs"), script);
    const { stdout } = await execute(process.execPath, ["probe.mjs", snapshot, ...(localRoot ? [localRoot] : [])], {
      cwd: scratch, env: { PATH: process.env.PATH ?? "", HOME: scratch, TMPDIR: scratch },
      timeout: 90000, maxBuffer: 1024 * 1024,
    });
    expect(await readdir(scratch)).toEqual(["probe.mjs"]); // No checkout, packages, cached corpus or generated output.
    return JSON.parse(stdout);
  } finally { await rm(scratch, { recursive: true, force: true }); }
}

describe("M9 public-file consumption", () => {
  it("keeps online entry links and machine-readable bootstrap discoverable", async () => {
    const readme = await readFile(resolve(root, "README.md"), "utf8");
    const section = readme.split("## Read without installing Pywel\n")[1]?.split("\n## ")[0];
    expect(section).toBeDefined();
    for (const path of ["AGENT_START.md", "examples/public-read.json", "docs/M9_NO_INSTALL.md", "docs/DATABASE_SOURCES.md"]) {
      expect(section).toContain(`(https://github.com/RolandSaint/pywel/blob/main/${path})`);
      expect(section).not.toContain(`](${path})`);
    }
    expect(section).toContain("pin one commit");
    const bootstrap = await readFile(resolve(root, "000_LOAD_FIRST_PYWEL.yaml"), "utf8");
    const readFirst = bootstrap.split("read_first:\n")[1]?.split("run_first:\n")[0];
    for (const path of ["AGENT_START.md", "docs/M9_NO_INSTALL.md", "docs/DATABASE_SOURCES.md"]) {
      expect(readFirst).toContain(`  - ${path}\n`);
    }
  });

  it("keeps sample routes bound to canonical data and preserves unknown/review metadata", async () => {
    const result = await probe(fixtureSha, root);
    expect(result.ok).toBe(true);
    expect(result.transport).toBe("local_fixture");
    expect(result.requests).toBe(9);
    expect(result.bytes).toBeLessThanOrEqual(512 * 1024);
    expect(result.results).toHaveLength(6);
    expect(result.results.map((item: { record_ids: string[] }) => item.record_ids.length)).toEqual([1, 3, 1, 2, 1, 0]);
    expect(result.results[4].unknown_records).toBe(1);
    expect(result.results[5].selection).toBe("absent_from_example_slice_only");
    expect(result).not.toHaveProperty("answer_state");
    expect(result).not.toHaveProperty("build_id");
    expect(result.raw_source_is_unfiltered).toBe(true);
    expect(result.current_game_verification).toBe(false);
  });

  it("rejects changed source bytes instead of accepting an internally mismatched slice", async () => {
    const scratch = await mkdtemp(resolve(tmpdir(), "pywel-public-tamper-"));
    try {
      const routes = JSON.parse(await readFile(resolve(root, "examples/public-read.json"), "utf8")) as { files: Record<string, string[]> };
      const files = ["AGENT_START.md", "examples/public-read.json", "quality/corpus-additions.json", ...Object.values(routes.files).flat()];
      for (const path of files) {
        await mkdir(dirname(resolve(scratch, path)), { recursive: true });
        await writeFile(resolve(scratch, path), await readFile(resolve(root, path)));
      }
      const changed = "data/canonical/claims/m8b-equipment.json";
      await writeFile(resolve(scratch, changed), `${await readFile(resolve(root, changed), "utf8")} `);
      await expect(probe(fixtureSha, scratch)).rejects.toThrow(/digest mismatch/);
    } finally { await rm(scratch, { recursive: true, force: true }); }
  });

  it.skipIf(process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REPOSITORY !== "RolandSaint/pywel")(
    "reads the public revision anonymously from a fresh process without Pywel installed",
    async () => {
      const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH!, "utf8")) as { pull_request?: { head: { sha: string } } };
      const snapshot = event.pull_request?.head.sha ?? process.env.GITHUB_SHA!;
      const result = await probe(snapshot);
      expect(result.transport).toBe("anonymous_https");
      expect(result.snapshot).toBe(snapshot);
      expect(result.results).toHaveLength(6);
      expect(result.requests).toBe(9);
      expect(result.files.every((file: { path: string }) => !file.path.startsWith("src/") && !file.path.startsWith("dist/"))).toBe(true);
      console.log(`M9_LIVE_PUBLIC_READ ${JSON.stringify(result)}`);
    }, 100000,
  );
});
