import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { startLocalService } from "../src/server/runtime.js";
import { validStore } from "./helpers.js";

describe("local read service lifecycle", () => {
  it("starts on loopback, serves canonical public reads, ignores retired write toggles, and shuts down", async () => {
    const { root } = await validStore();
    const scratch = await mkdtemp(resolve(tmpdir(), "pywel-local-read-"));
    vi.stubEnv("PYWEL_CONTRIBUTION_DIR", resolve(scratch, "contributions"));
    vi.stubEnv("PYWEL_ATTESTATION_DIR", resolve(scratch, "attestations"));
    vi.stubEnv("PYWEL_ATTESTATION_SECRET", "obsolete-test-toggle");
    try {
      const { server, port } = await startLocalService({ projectRoot: root, port: 0 });
      try {
        expect(server.address()).toMatchObject({ address: "127.0.0.1", port });
        const origin = `http://127.0.0.1:${port}`;
        const health = await fetch(`${origin}/health`);
        expect(health.status).toBe(200);
        expect(await health.json()).toMatchObject({ status: "ok", writes_enabled: false });
        const answer = await fetch(`${origin}/v1/answer?q=Can%20controller%20inputs%20be%20remapped%3F&patch=1.09.00`);
        expect(await answer.json()).toMatchObject({ state: "supported" });
        for (const path of ["/v1/contributions", "/v1/attestations", "/manager/captures", "/mcp"]) expect((await fetch(`${origin}${path}`, { method: "POST", body: "{}" })).status).toBe(404);
        for (const path of ["/package.json", "/data/canonical/receipts/public-selection-m1.json", "/.git/config", "/%2e%2e/package.json"]) expect((await fetch(`${origin}${path}`)).status).toBe(404);
        expect(await readdir(scratch)).toEqual([]);
      } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
      expect(server.listening).toBe(false);
    } finally {
      vi.unstubAllEnvs();
      await rm(scratch, { recursive: true, force: true });
    }
  }, 30_000);
});
