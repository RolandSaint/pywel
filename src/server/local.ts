import { startLocalService } from "./runtime.js";

async function main(): Promise<void> {
  const { server } = await startLocalService();
  server.on("error", (error) => {
    process.stderr.write(`Pywel local service failed: ${error.message}\n`);
    process.exitCode = 1;
  });
  const shutdown = (): void => {
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
