import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { validStore } from "./helpers.js";

describe("MCP stdio contract", () => {
  it("advertises nine typed reads and returns exact REST payloads, resources, and errors", async () => {
    const { root, store } = await validStore();
    const scratch = await mkdtemp(resolve(tmpdir(), "pywel-readonly-"));
    const transport = new StdioClientTransport({
      command: process.execPath, args: ["--import", "tsx", resolve(root, "src", "mcp", "server.ts")], cwd: root,
      env: { ...process.env, PYWEL_CONTRIBUTION_DIR: resolve(scratch, "contributions"), PYWEL_ATTESTATION_DIR: resolve(scratch, "attestations"), PYWEL_ATTESTATION_SECRET: "obsolete-test-toggle" } as Record<string, string>, stderr: "pipe",
    });
    const client = new Client({ name: "pywel-test-client", version: "1.0.0" });
    try {
      await client.connect(transport);
      const software = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as { version: string };
      expect(client.getServerVersion()?.version).toBe(software.version);
      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name).sort()).toEqual(["pywel_answer", "pywel_search", "pywel_search_entities", "pywel_get_entity", "pywel_get_relationships", "pywel_get_claims", "pywel_get_strategy", "pywel_get_evidence", "pywel_get_patches"].sort());
      expect(listed.tools.every((tool) => tool.annotations?.readOnlyHint === true && tool.inputSchema.additionalProperties === false && tool.outputSchema?.type === "object")).toBe(true);
      const resources = await client.listResources();
      expect(resources.resources.map((resource) => resource.uri).sort()).toEqual(["pywel://codebook", "pywel://service"]);
      const descriptor = await client.readResource({ uri: "pywel://service" });
      const first = descriptor.contents[0]!;
      if (!("text" in first)) throw new Error("Service descriptor must be JSON text");
      const service = JSON.parse(first.text) as { build_id: string };
      const app = createApp(store, { buildId: service.build_id });
      expect(service).toEqual(await (await app.request("/v1")).json());
      const codebook = (await client.readResource({ uri: "pywel://codebook" })).contents[0]!;
      if (!("text" in codebook)) throw new Error("Codebook must be JSON text");
      expect(JSON.parse(codebook.text)).toEqual(await (await app.request("/v1/codebook")).json());
      const entity = store.entities[0]!;
      const strategy = store.strategies[0]!;
      const evidence = store.evidence[0]!;
      const groundingCases = [
        ["Where is House Roberts based?", "partial"],
        ["Where is House Zorblax based?", "unknown"],
        ["What is Creamy Meat Soup?", "partial"],
        ["What ingredients are needed to make Creamy Meat Soup?", "partial"],
        ["Where is St. Halssius's House of Healing?", "supported"],
        ["What is House Roberts?", "partial"],
        ["Where is House Roberts?", "partial"],
        ["Where is Count Roberts?", "partial"],
        ["Which quests belong to House Roberts?", "partial"],
        ["What are the prerequisites for The Count's Honor?", "partial"],
        ["Where is Stolen Quarry?", "partial"],
        ["What are the objectives of Stolen Quarry?", "partial"],
        ["Who leads House Roberts?", "unknown"],
      ] as const;
      const cases: Array<{ name: string; args: Record<string, unknown>; path: string; expectedState?: string }> = [
        ...["compact", "full"].flatMap((format) => groundingCases.map(([q, expectedState]) => {
          const args = { q, patch: "1.14.00", platform: "all", locale: "en-US", spoiler: "quest_major", format };
          return { name: "pywel_answer", args, path: `/v1/answer?${new URLSearchParams(args)}`, expectedState };
        })),
        ...["compact", "full"].flatMap((format) => [["Can controller inputs be remapped?", "1.09.00"], ["Is controller remapping available?", "1.14.00"], ["Is controller remapping available?", "9.99.00"], ["Is Axiom Bracelet an item?", "1.14.00"]].map(([q, patch]) => ({ name: "pywel_answer", args: { q, patch, format }, path: `/v1/answer?${new URLSearchParams({ q: q!, patch: patch!, format })}` }))),
        { name: "pywel_search", args: { q: "controller", patch: "1.09.00", limit: 1, offset: 1 }, path: "/v1/search?q=controller&patch=1.09.00&limit=1&offset=1" },
        { name: "pywel_search_entities", args: { limit: 2, offset: 2 }, path: "/v1/entities?limit=2&offset=2" },
        { name: "pywel_get_entity", args: { id: entity.entity_id, spoiler: "discovery" }, path: `/v1/entities/${entity.entity_id}?spoiler=discovery` },
        { name: "pywel_get_relationships", args: { id: entity.entity_id, depth: 2, limit: 1 }, path: `/v1/entities/${entity.entity_id}/relationships?depth=2&limit=1` },
        { name: "pywel_get_claims", args: { subject: entity.entity_id, limit: 2, offset: 2 }, path: `/v1/claims?subject=${entity.entity_id}&limit=2&offset=2` },
        { name: "pywel_get_strategy", args: { id: strategy.strategy_id, platform: "pc-steam" }, path: `/v1/strategies/${strategy.strategy_id}?platform=pc-steam` },
        { name: "pywel_get_evidence", args: { id: evidence.evidence_id }, path: `/v1/evidence/${evidence.evidence_id}` },
        { name: "pywel_get_patches", args: {}, path: "/v1/patches" },
        { name: "pywel_get_patches", args: { version: "1.09.00" }, path: "/v1/patches/1.09.00" },
        { name: "pywel_get_entity", args: { id: "not-real" }, path: "/v1/entities/not-real" },
        { name: "pywel_get_evidence", args: { id: "evd_000000000000" }, path: "/v1/evidence/evd_000000000000" },
        { name: "pywel_get_patches", args: { version: "9.99.00" }, path: "/v1/patches/9.99.00" },
        { name: "pywel_answer", args: { q: "test", locale: "fr-FR" }, path: "/v1/answer?q=test&locale=fr-FR" },
        { name: "pywel_search", args: { q: "test", limit: 0 }, path: "/v1/search?q=test&limit=0" },
        { name: "pywel_answer", args: { q: "test", compact: false }, path: "/v1/answer?q=test&compact=false" },
      ];
      for (const { name, args, path, expectedState } of cases) {
        const mcp = await client.callTool({ name, arguments: args });
        const rest = await app.request(path);
        const body = await rest.json();
        expect(mcp.structuredContent, path).toEqual(body);
        if (expectedState !== undefined) {
          expect(rest.status, path).toBe(200);
          expect(body[args.format === "compact" ? "state" : "answer_state"], path).toBe(expectedState);
          if (expectedState === "unknown") {
            for (const key of ["claims", "evidence", "strategies"]) expect(body[key] ?? [], path).toEqual([]);
            expect(body).not.toHaveProperty("catalog");
          }
        }
        expect(mcp.isError === true, path).toBe(!rest.ok);
        const text = (mcp.content as Array<{ type: string; text?: string }>)[0]!;
        expect(text.type).toBe("text");
        expect(JSON.parse(text.text!)).toEqual(mcp.structuredContent);
        expect(mcp.structuredContent).not.toHaveProperty("result");
      }
      const wrongType = await client.callTool({ name: "pywel_search", arguments: { q: "test", limit: "2" } });
      expect(wrongType.isError).toBe(true);
      const removed = await client.callTool({ name: "pywel_submit_contribution", arguments: { packet: {} } });
      expect(removed.isError).toBe(true);
      expect(await readdir(scratch)).toEqual([]);
    } finally {
      await client.close();
      await rm(scratch, { recursive: true, force: true });
    }
  }, 30_000);
});
