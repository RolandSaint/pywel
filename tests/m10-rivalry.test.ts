import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { compactEvidencePacket } from "../src/api/compact.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { TEST_BUILD_ID, validStore } from "./helpers.js";

const context = { patch: "1.14.00", platform: "all" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };
const questions = [
  "Which factions are rivals of House Roberts?",
  "Who are the rivals of House Roberts?",
  "What is the rivalry between House Roberts and House Zorblax?",
];
const mixed = "Which quests belong to House Roberts and which factions are its rivals?";

describe("M10 requested rivalry is not faction description", () => {
  it.each(questions)("withholds unrelated facts: %s", async query => {
    const index = new KnowledgeIndex((await validStore()).store);
    for (const spoilerCeiling of ["none", "discovery", "quest_minor", "quest_major", "ending"] as const) {
      const packet = index.answer(query, { ...context, spoilerCeiling });
      expect(packet.answer_state).toBe("unknown");
      expect(packet.claims).toEqual([]);
      expect(packet.evidence).toEqual([]);
      expect(packet.concise_answer).toContain("no supported organization rivalry");
      expect(packet.gaps.some(gap => gap.code === "requested_fact_not_supported")).toBe(true);
      const compact = compactEvidencePacket(packet);
      expect(compact.state).toBe("unknown");
      expect(compact).not.toHaveProperty("claims");
      expect(compact).not.toHaveProperty("catalog");
    }
  });

  it("retains supported quest associations alongside the explicit rivalry gap", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    const packet = index.answer(mixed, context);
    expect(packet.answer_state).toBe("partial");
    expect(packet.claims).toHaveLength(4);
    expect(packet.claims.every(claim => claim.predicate === "quest.organization")).toBe(true);
    expect(packet.concise_answer).toContain("Unknown: no supported organization rivalry");
    expect(index.answer("What is House Roberts?", context).claims[0]?.predicate).toBe("organization.role");
    expect(index.search("House Roberts", context, 10).hits.length).toBeGreaterThan(0);
  });

  it("preserves the fix in full/compact REST and an actual stdio MCP process", async () => {
    const { root, store } = await validStore();
    const client = new Client({ name: "m10-rivalry-test", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", resolve(root, "src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const descriptor = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in descriptor)) throw new Error("Missing MCP descriptor");
      const build = (JSON.parse(descriptor.text) as { build_id?: string }).build_id ?? TEST_BUILD_ID;
      const app = createApp(store, { buildId: build });
      for (const q of [...questions, mixed]) {
        for (const format of ["compact", "full"]) {
          const args = { q, format, patch: context.patch, platform: context.platform, locale: context.locale, spoiler: context.spoilerCeiling };
          const response = await app.request(`/v1/answer?${new URLSearchParams(args)}`);
          expect(response.status).toBe(200);
          const body = await response.json();
          const isMixed = q === mixed;
          expect(body[format === "full" ? "answer_state" : "state"]).toBe(isMixed ? "partial" : "unknown");
          if (format === "full") expect(body.claims).toHaveLength(isMixed ? 4 : 0);
          const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
          expect(mcp.isError).not.toBe(true);
          expect(mcp.structuredContent).toEqual(body);
        }
      }
    } finally { await client.close(); }
  }, 30000);
});
