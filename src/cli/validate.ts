import { canonicalJson } from "../core/canonical-json.js";
import { findProjectRoot } from "../core/paths.js";
import { validateCorpus } from "../core/validate.js";

async function main(): Promise<void> {
  const projectRoot = findProjectRoot();
  const { report } = await validateCorpus(projectRoot);
  process.stdout.write(canonicalJson(report, true));
  if (!report.valid) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ valid: false, fatal: message })}\n`);
  process.exitCode = 1;
});
