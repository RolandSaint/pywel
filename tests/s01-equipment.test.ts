import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";
import { KnowledgeIndex } from "../src/core/query.js";
import { stableRecordHash } from "../src/core/canonical-json.js";
import { validStore } from "./helpers.js";

const receipt = "rcp_s01equipment2026091101";
const context = { patch: "2.01.00", platform: "pc-steam" as const, locale: "en-US", spoilerCeiling: "discovery" as const };
const isS01 = (r: { provenance: { source_receipt_id?: string } }) => r.provenance.source_receipt_id === receipt;
const stat = (level: number, field: string, value: number) => `At refinement +${level}, the CrimsonDB row lists ${field} ${value}.`;
// Rendered item-page checks, not values inferred from a default +10 index card.
const examples = [
  ["Double-Headed Axe of Greed", 5, "Attack", 20],
  ["Mechanical Clockwork Blaster", 10, "Attack Speed Level", 2],
  ["Aeserion Dagger", 10, "Critical Rate Level", 10],
  ["Electro-Mecha Spear", 5, "Attack", 34],
  ["Fated Shadow", 10, "Attack", 34],
  ["Skyblazer Cloth Cloak", 10, "Movement Speed Level", 1],
  ["Sunset Reed Cloth Gloves", 5, "Defense", 5],
  ["Frozen Heart Plate Armor", 10, "Defense", 41],
  ["Giant's Boots", 5, "Attack", 20],
  ["Martial Monk's Cloth Gloves", 10, "Attack Speed Level", 4],
  ["Rainstorm Necklace", 10, "Critical Rate Level", 2],
  ["Flower Petal Earring", 10, "Movement Speed Level", 1],
  ["Ogre's Ring", 10, "Attack", 11],
  ["Mark of Darkness", 10, "Attack Speed Level", 4],
  ["White Horn's Ring", 5, "Attack", 3],
  ["Greymane Signet", 5, "Attack", 7],
  ["Saint's Necklace", 10, "Defense", 15],
] as const;

describe("S01 bounded equipment population", () => {
  it("admits the reviewed cohort with resolving evidence and unchanged earlier records", async () => {
    const { root, store } = await validStore();
    const entities = store.entities.filter(isS01), claims = store.claims.filter(isS01), evidence = store.evidence.filter(isS01);
    expect([entities.length, claims.length, evidence.length]).toEqual([200, 1144, 200]);
    expect(["weapon", "armor", "accessory"].map(t => entities.filter(e => e.subtype === t).length)).toEqual([80, 80, 40]);
    expect(stableRecordHash(store.claims.filter(c => !isS01(c)).sort((a,b) => a.claim_id.localeCompare(b.claim_id)))).toBe("26e48aac8591026951d409f36680f03da1f0b3cc1eaad8bfdbd046dea9e24b74");
    expect(stableRecordHash(store.entities.filter(e => !isS01(e)).sort((a,b) => a.entity_id.localeCompare(b.entity_id)))).toBe("ce4b177e7c1388a1f378cbd83368cd4bf3c26243e6f000d29889ff66680cc405");
    expect(claims.filter(c => c.predicate === "item.effect_summary")).toHaveLength(729);
    expect(claims.filter(c => c.predicate === "item.acquisition")).toHaveLength(14);
    expect(claims.filter(c => c.predicate === "relation.obtained_from")).toHaveLength(1);
    const ids = new Set(evidence.map(e => e.evidence_id));
    for (const c of claims) {
      expect(c.evidence_ids).toHaveLength(1);
      expect(ids.has(c.evidence_ids[0]!)).toBe(true);
      expect(c.validity).toEqual({ from_patch: null, through_patch: null, reviewed_through_patch: null, platforms: ["pc-steam"], locales: ["en-US"] });
      expect([c.status,c.behavior_kind]).toEqual(["inferred","historical"]);
      expect(c.supersedes_claim_ids).toBeUndefined();
    }
    for (const e of entities) {
      const facts = claims.filter(c => c.subject_entity_id === e.entity_id);
      expect(facts.filter(c => c.predicate === "item.effect_summary").length).toBeGreaterThanOrEqual(2);
      const source = evidence.find(v => v.evidence_id === facts[0]!.evidence_ids[0])!;
      expect(source.source.url).toMatch(/^https:\/\/crimsondb\.gg\/(weapons|armor|accessories)\/[a-z0-9-]+$/);
      expect(source.reliability.independence_group).toBe("database:crimson-desert:upstream-unverified");
      expect(source.rights).toMatchObject({ retention_mode: "normalized_facts", license_status: "publisher_owned" });
    }
    const ledger = JSON.parse(await readFile(resolve(root,"quality/s01-equipment-review.json"),"utf8"));
    expect(ledger.selection).toHaveLength(200);
    expect(ledger.sample_source_ids).toHaveLength(17);
    expect(ledger.selection.reduce((n: number, r: { field_count: number }) => n+r.field_count,0)).toBe(729);
  });

  it.each(examples)("returns the selected source row for %s", async (name, level, field, value) => {
    const index = new KnowledgeIndex((await validStore()).store);
    const entity = index.store.entities.find(e => e.canonical_name.text === name)!;
    const packet = index.answer(`What are the effects of ${name}?`,context);
    expect(packet.answer_state).toBe("partial");
    expect(packet.claims.length).toBeGreaterThan(0);
    expect(packet.claims.every(c => c.subject_entity_id === entity.entity_id && c.predicate === "item.effect_summary")).toBe(true);
    expect(packet.claims.some(c => c.object.kind === "string" && c.object.value.startsWith(stat(level,field,value)))).toBe(true);
    expect(packet.gaps.map(g => g.code)).toContain("post_patch_review_needed");
  });

  it("does not manufacture zero values, regeneration, socket arithmetic or current confirmation", async () => {
    const { store } = await validStore();
    for (const [name, field] of [["Skyblazer Cloth Cloak","Movement Speed"],["Rainstorm Necklace","Critical Rate"],["Flower Petal Earring","Movement Speed"]]) {
      const e = store.entities.find(e => e.canonical_name.text === name)!;
      const claims = store.claims.filter(c => c.subject_entity_id === e.entity_id && c.predicate === "item.effect_summary");
      expect(claims.some(c => c.object.kind === "string" && c.object.value.startsWith("At refinement +5,") && c.object.value.includes(field!))).toBe(false);
    }
    const text = JSON.stringify(store.claims.filter(isS01));
    expect(text).not.toMatch(/Regen|738201|1879044|939520|every sec|Stamina_Use/);
    const index = new KnowledgeIndex(store);
    const unknown = index.answer("What are the effects of Frozen Heart Plate Armor?",{...context,patch:"9.99.00"});
    expect(unknown.answer_state).toBe("unknown");
    expect(unknown.gaps.map(g=>g.code)).toContain("patch_unknown");
    const otherPlatform = index.answer("What are the effects of Frozen Heart Plate Armor?",{...context,platform:"playstation-5"});
    expect(otherPlatform.claims).toEqual([]);
    expect(index.answer("What are the effects of Zorblax Alloy Cuirass?",context).claims).toEqual([]);
  });

  it("returns qualified acquisition listings without leaking quest context into lower-spoiler effects", async () => {
    const index = new KnowledgeIndex((await validStore()).store);
    const full = index.answer("Where can I get Sunset Reed Cloth Gloves?",{...context,spoilerCeiling:"quest_major"});
    expect(full.answer_state).toBe("partial");
    expect(full.claims.some(c=>c.object.kind==="entity" && c.object.entity_id==="ent_27d2fc67a8c5c1d168093fd2")).toBe(true);
    expect(full.concise_answer).toContain("The Face Behind the Mask");
    const lower = index.answer("What are the effects of Sunset Reed Cloth Gloves?",context);
    expect(JSON.stringify(lower)).not.toContain("The Face Behind the Mask");
    expect(index.answer("Where can I get Sunset Reed Cloth Gloves?",context).claims).toEqual([]);
    const seller = index.answer("Where can I get Fated Shadow?",{...context,spoilerCeiling:"quest_major"});
    expect(seller.concise_answer).toContain("Areciel Crim Witch");
    expect(seller.concise_answer).toContain("not verified");
  });

  it("preserves these states in compact/full REST and actual stdio MCP", async () => {
    const {root,store}=await validStore();
    const client=new Client({name:"s01-equipment-consumer",version:"1.0.0"});
    const transport=new StdioClientTransport({command:process.execPath,args:["--import","tsx",resolve(root,"src/mcp/server.ts")],cwd:root,stderr:"pipe"});
    try {
      await client.connect(transport);
      const resource=(await client.readResource({uri:"pywel://service"})).contents[0]!;
      if (!("text" in resource)) throw new Error("Expected service JSON");
      const app=createApp(store,{buildId:JSON.parse(resource.text).build_id});
      for (const format of ["compact","full"]) for (const q of ["What are the effects of Mechanical Clockwork Blaster?","What are the effects of Frozen Heart Plate Armor?","What are the effects of White Horn's Ring?","Where can I get Sunset Reed Cloth Gloves?"]) {
        const args={q,patch:"2.01.00",platform:"pc-steam",locale:"en-US",spoiler:"quest_major",format};
        const response=await app.request(`/v1/answer?${new URLSearchParams(args)}`);
        const body=await response.json();
        const mcp=await client.callTool({name:"pywel_answer",arguments:args});
        expect(response.status).toBe(200);
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual(body);
        expect(body[format==="compact"?"state":"answer_state"]).toBe("partial");
        expect(body.claims.length).toBeGreaterThan(0);
      }
    } finally { await client.close(); }
  },30000);
});
