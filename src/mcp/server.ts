import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { sourceBuild } from "../build/source-build.js";
import { findProjectRoot } from "../core/paths.js";
import { validateCorpus } from "../core/validate.js";
import { publicKnowledgeProjection } from "../quality/publication.js";
import { createPywelMcpServer } from "./create-server.js";

async function main(): Promise<void> {
  const projectRoot = findProjectRoot();
  const { report, store } = await validateCorpus(projectRoot);
  if (!report.valid || store === undefined) throw new Error("Canonical corpus is invalid");
  const { buildId } = await sourceBuild(projectRoot);
  const server = createPywelMcpServer({ store: publicKnowledgeProjection(store), buildId });
  await server.connect(new StdioServerTransport());
  const shutdown = (): void => { void server.close().finally(() => process.exit(0)); };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.stdin.once("end", shutdown);
  process.stderr.write("Pywel read-only MCP ready on stdio.\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`Pywel MCP failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
