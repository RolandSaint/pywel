import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { stableRecordHash } from "../src/core/canonical-json.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { validateIntegrity } from "../src/core/validate.js";
import { firstExpansionStore, validStore } from "./helpers.js";

const versions = ["1.00.03", "1.00.04", "1.02.00", "1.15.00", "1.16.00", "1.16.01", "1.16.02", "1.16.03", "1.16.04", "1.17.00", "1.18.00", "1.18.01", "1.18.02", "2.00.00", "2.00.01", "2.00.02", "2.01.00"];
const context = { patch: "2.01.00", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "quest_major" as const };

describe("G02 official patch identities, not automatic claim freshness", () => {
  it("adds the finite patch/source set without normalizing gameplay claims", async () => {
    const { store } = await validStore();
    const added = store.patches.filter(p => p.patch_id.startsWith("pat_g02"));
    expect(added.map(p => p.version).sort()).toEqual([...versions].sort());
    expect(new Set(store.patches.map(p => p.version)).size).toBe(44);
    expect(store.evidence.filter(e => e.evidence_id.startsWith("evd_g02"))).toHaveLength(18);
    expect(store.receipts.filter(r => r.receipt_id.startsWith("rcp_g02"))).toHaveLength(1);
    for (const patch of added) {
      expect(patch.content_coverage).toMatchObject({ level: "identity_only", normalized_claim_count: 0 });
      expect(patch.affected_entity_ids).toEqual([]);
      for (const id of patch.source_evidence_ids) {
        const source = store.evidence.find(e => e.evidence_id === id)!;
        expect(source.evidence_type).toBe("official_patch");
        expect(new URL(source.source.url).hostname).toBe("crimsondesert.pearlabyss.com");
      }
    }
    expect(store.claims.some(c => c.evidence_ids.some(id => id.startsWith("evd_g02")))).toBe(false);
  });

  it("preserves every pre-G02 claim and entity, including all review boundaries", async () => {
    const { store } = await validStore();
    expect(stableRecordHash([...store.claims].sort((a, b) => a.claim_id.localeCompare(b.claim_id)))).toBe("26e48aac8591026951d409f36680f03da1f0b3cc1eaad8bfdbd046dea9e24b74");
    expect(stableRecordHash([...store.entities].sort((a, b) => a.entity_id.localeCompare(b.entity_id)))).toBe("ce4b177e7c1388a1f378cbd83368cd4bf3c26243e6f000d29889ff66680cc405");
    const prior = (await firstExpansionStore()).store;
    expect([prior.entities.length, prior.claims.length, prior.evidence.length, prior.patches.length, prior.receipts.length]).toEqual([320, 1447, 88, 27, 5]);
  });

  it("retains two platform-specific 1.00.04 notices and rejects incorrect time anchors", async () => {
    const { store } = await validStore();
    const patch = store.patches.find(p => p.version === "1.00.04")!;
    expect(patch.platforms).toEqual(["mac-steam", "playstation-5"]);
    expect(patch.source_evidence_ids.map(id => store.evidence.find(e => e.evidence_id === id)?.source.published_at)).toEqual(["2026-03-23T07:25:00Z", "2026-03-24T16:51:00Z"]);
    expect(patch.released_at).toBe("2026-03-23T07:25:00Z");
    expect(validateIntegrity(store).filter(i => i.code === "patch_release_time_mismatch")).toEqual([]);
    for (const time of ["2026-03-24T16:51:00Z", "2026-03-22T07:25:00Z"]) {
      const changed = structuredClone(store);
      changed.patches.find(p => p.version === "1.00.04")!.released_at = time;
      expect(validateIntegrity(changed).some(i => i.code === "patch_release_time_mismatch" && i.record_id === patch.patch_id)).toBe(true);
    }
    const single = structuredClone(store);
    single.patches.find(p => p.version === "2.01.00")!.released_at = "2026-09-05T04:20:00Z";
    expect(validateIntegrity(single).some(i => i.code === "patch_release_time_mismatch")).toBe(true);
  });

  it("does not turn pending storefronts into available platforms", async () => {
    const { root, store } = await validStore();
    const patch = store.patches.find(p => p.version === "1.16.02")!;
    expect(patch.platforms).toEqual(["pc-epic", "pc-steam", "playstation-5", "xbox-series"]);
    const ledger = JSON.parse(await readFile(resolve(root, "quality/g02-patch-review.json"), "utf8"));
    expect(ledger.notice_reviews).toHaveLength(18);
    expect(ledger.notice_reviews.filter((row: { version: string }) => row.version === "1.00.04")).toHaveLength(2);
    expect(ledger.notice_reviews.find((row: { version: string }) => row.version === "1.16.02").pending_platforms).toEqual(["mac-steam", "mac-app-store"]);
  });

  it.each(["Can controller inputs be remapped?", "Where is House Roberts?", "What does the Witch's Ring do?"])("keeps claim-specific review gaps after indexing a patch: %s", async query => {
    const index = new KnowledgeIndex((await validStore()).store);
    const packet = index.answer(query, context);
    expect(packet.answer_state).toBe("partial");
    expect(packet.claims.length).toBeGreaterThan(0);
    expect(packet.gaps.map(g => g.code)).toEqual(expect.arrayContaining(["post_patch_review_needed", "patch_content_not_normalized"]));
    expect(packet.gaps.map(g => g.code)).not.toContain("patch_unknown");
    const unknown = index.answer(query, { ...context, patch: "9.99.00" });
    expect(unknown.answer_state).toBe("unknown");
    expect(unknown.gaps.map(g => g.code)).toContain("patch_unknown");
  });

  it("keeps review proposals reference-resolving and separate from accepted facts", async () => {
    const { root, store } = await validStore();
    const ledger = JSON.parse(await readFile(resolve(root, "quality/g02-patch-review.json"), "utf8"));
    expect(ledger.review_queue).toHaveLength(13);
    const claimIds = new Set(store.claims.map(c => c.claim_id));
    const entityIds = new Set(store.entities.map(e => e.entity_id));
    const evidenceIds = new Set(store.evidence.map(e => e.evidence_id));
    const affected = new Set<string>();
    for (const row of ledger.review_queue) {
      expect(row.state).toBe("needs_claim_review");
      expect(row.acceptance.length).toBeGreaterThan(20);
      for (const id of row.claim_ids) { expect(claimIds.has(id), id).toBe(true); affected.add(id); }
      for (const id of row.entity_ids) expect(entityIds.has(id), id).toBe(true);
      for (const id of row.source_evidence_ids) expect(evidenceIds.has(id), id).toBe(true);
    }
    expect(affected.size).toBe(46);
    expect(ledger.publication.new_release_authorized).toBe(false);
  });

  it("returns the same indexed patches and qualified answers through REST and real stdio MCP", async () => {
    const { root, store } = await validStore();
    const client = new Client({ name: "g02-patch-client", version: "1.0.0" });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", resolve(root, "src/mcp/server.ts")], cwd: root, stderr: "pipe" });
    try {
      await client.connect(transport);
      const descriptor = (await client.readResource({ uri: "pywel://service" })).contents[0]!;
      if (!("text" in descriptor)) throw new Error("Expected JSON descriptor");
      const app = createApp(store, { buildId: JSON.parse(descriptor.text).build_id });
      const latest = await (await app.request("/v1/patches/latest")).json();
      expect(latest.patch.version).toBe("2.01.00");
      for (const version of ["1.00.04", "2.01.00"]) {
        const rest = await (await app.request(`/v1/patches/${version}`)).json();
        const mcp = await client.callTool({ name: "pywel_get_patches", arguments: { version } });
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(rest);
        expect(rest.patch.content_coverage.level).toBe("identity_only");
      }
      for (const format of ["compact", "full"]) {
        const args = { q: "Where is House Roberts?", patch: "2.01.00", platform: "pc-steam", spoiler: "quest_major", format };
        const rest = await (await app.request(`/v1/answer?${new URLSearchParams(args)}`)).json();
        const mcp = await client.callTool({ name: "pywel_answer", arguments: args });
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(rest);
        expect(rest[format === "compact" ? "state" : "answer_state"]).toBe("partial");
      }
    } finally { await client.close(); }
  }, 30_000);
});
