import { serve } from "@hono/node-server";
import { createApp } from "../api/app.js";
import { sourceBuild } from "../build/source-build.js";
import { findProjectRoot } from "../core/paths.js";
import { validateCorpus } from "../core/validate.js";
import { publicKnowledgeProjection } from "../quality/publication.js";

export interface LocalServiceOptions { projectRoot?: string; port?: number; }

export async function startLocalService(options: LocalServiceOptions = {}): Promise<{
  server: ReturnType<typeof serve>;
  port: number;
}> {
  const projectRoot = options.projectRoot ?? findProjectRoot();
  const { report, store } = await validateCorpus(projectRoot);
  if (!report.valid || store === undefined) throw new Error("Refusing to start with an invalid canonical corpus");
  const publicStore = publicKnowledgeProjection(store);
  const { buildId } = await sourceBuild(projectRoot);
  const port = options.port ?? Number(process.env.PORT ?? "8787");
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be an integer from 0 to 65535");
  const app = createApp(publicStore, { buildId });
  return new Promise((resolve, reject) => {
    const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port }, (address) => {
      server.removeListener("error", reject);
      process.stderr.write(`Pywel read-only service listening on http://127.0.0.1:${address.port}\n`);
      resolve({ server, port: address.port });
    });
    server.once("error", reject);
  });
}
