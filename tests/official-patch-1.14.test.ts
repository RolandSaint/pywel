import { describe, expect, it } from "vitest";
import { KnowledgeIndex } from "../src/core/query.js";
import { validStore } from "./helpers.js";

const VERSION = "1.14.00";
const EVIDENCE_ID = "evd_cdpatch11400official0001";

describe("bounded patch identity and claim review boundary", () => {
  it("retains the official locator and explicitly incomplete note coverage", async () => {
    const { store } = await validStore();
    const evidence = store.evidence.find((record) => record.evidence_id === EVIDENCE_ID)!;
    expect(evidence).toMatchObject({
      evidence_type: "official_patch",
      rights: { license_status: "publisher_owned", retention_mode: "normalized_facts" },
      source: { publisher: "Pearl Abyss", url: "https://crimsondesert.pearlabyss.com/en-US/News/Notice/Detail?_boardNo=108" },
    });
    expect(Object.keys(evidence.source)).not.toEqual(expect.arrayContaining(["body", "content", "excerpt", "html", "image", "media"]));
    const patch = store.patches.find((record) => record.version === VERSION)!;
    expect(patch.content_coverage.level).not.toBe("exhaustive");
    const entity = store.entities.find((record) => record.slug === "system.controller-remapping")!;
    const bundle = new KnowledgeIndex(store).entityBundle(entity.entity_id, { patch: VERSION })!;
    expect(bundle.freshness.review_gap_record_ids).toContain(
      store.claims.find((record) => record.predicate === "controls.remapping_available")!.claim_id,
    );
    expect(bundle.warnings.join(" ")).toContain("not been reviewed");
  });
});
