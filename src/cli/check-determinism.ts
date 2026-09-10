import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { artifactInventory } from "../build/build.js";
import { assertCanonicalReleaseRuntime } from "../build/runtime.js";
import { canonicalJson } from "../core/canonical-json.js";
import { findProjectRoot } from "../core/paths.js";
import { verifyDistribution } from "./verify-dist.js";

function build(projectRoot: string): void {
  const npmCli = process.env.npm_execpath;
  if (npmCli === undefined) throw new Error("Run determinism verification through npm run test:determinism");
  const result = spawnSync(process.execPath, [npmCli, "run", "build"], { cwd: projectRoot, encoding: "utf8", windowsHide: true });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) throw new Error(`Build failed:\n${result.stdout}\n${result.stderr}`);
}

async function main(): Promise<void> {
  assertCanonicalReleaseRuntime();
  const root = findProjectRoot();
  const data = resolve(root, "dist", "data");
  build(root);
  await verifyDistribution(data, root);
  const first = await artifactInventory(data);
  build(root);
  await verifyDistribution(data, root);
  const second = await artifactInventory(data);
  if (canonicalJson(first) !== canonicalJson(second)) throw new Error("Two clean data builds produced different inventories or bytes");
  process.stdout.write(`${canonicalJson({ ok: true, files: second.length, bytes: second.reduce((sum, artifact) => sum + artifact.bytes, 0) })}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
