import { describe, it, expect } from "vitest";
import {
  normaliseProgress, progressFromDharma, milestoneIndex, crossedMilestones, newlyCrossed, plateFile,
  unlockedIds, growthCount, growthStates, plantPosition, buildPlantList, hitTest, badgeLayout, toMapUnits,
  summaryText, hash01,
} from "./mapMath";

describe("thresholds and plate index", () => {
  it.each([[0, 0], [4.99, 0], [4.9999999, 0], [5, 1], [9.99, 1], [10, 2], [99.99, 19], [100, 20]])(
    "progress %s%% → milestone %s", (p, idx) => expect(milestoneIndex(p)).toBe(idx));
  it("is exact at every 5% boundary despite float noise", () => {
    for (let i = 1; i <= 20; i++) {
      expect(milestoneIndex(i * 5)).toBe(i);
      expect(milestoneIndex(i * 5 - 1e-6)).toBe(i - 1);
      expect(milestoneIndex((0.05 * i) * 100)).toBe(i);        // 0.15000000000000002*100 style noise
      expect(milestoneIndex(0.3 * 100)).toBe(6);                // 29.999999999999996
    }
  });
  it("clamps out-of-range values", () => {
    expect(milestoneIndex(-5)).toBe(0);
    expect(milestoneIndex(250)).toBe(20);
  });
  it("a jump from 4% to 16% crosses 5, 10 and 15 exactly once each", () => {
    expect(crossedMilestones(16)).toEqual([1, 2, 3]);
    expect(newlyCrossed(4, 16)).toEqual([1, 2, 3]);
    expect(newlyCrossed(16, 16)).toEqual([]);
    expect(newlyCrossed(16, 4)).toEqual([]);
  });
  it("names 21 plates: 00 … 20", () => {
    expect(plateFile(0)).toBe("00.webp");
    expect(plateFile(20)).toBe("20.webp");
    expect(plateFile(99)).toBe("20.webp");
  });
});

describe("zero / missing denominator", () => {
  it("never reports a false 0%", () => {
    expect(progressFromDharma(50, 0)).toBeNull();
    expect(progressFromDharma(50, undefined)).toBeNull();
    expect(progressFromDharma(50, NaN)).toBeNull();
    expect(normaliseProgress(null)).toBeNull();
    expect(milestoneIndex(null)).toBe(0);          // plate 00 is shown, but the UI reads status/no_content
  });
  it("clamps awarded to possible (content removed after learning)", () => {
    expect(progressFromDharma(300, 200)).toBe(100);
    expect(progressFromDharma(-4, 200)).toBe(0);
    expect(progressFromDharma(30, 200)).toBeCloseTo(15, 10);
  });
  it("summary explains the no-content state", () => {
    expect(summaryText({ status: "no_content" }, {}, [])).toMatch(/once courses have lessons/);
  });
});

describe("growth: seeds → dhruva grass, south → north", () => {
  it("reveals a prefix proportional to progress", () => {
    expect(growthCount(0, 1000)).toBe(0);
    expect(growthCount(25, 1000)).toBe(250);
    expect(growthCount(100, 1884)).toBe(1884);
    expect(growthCount(null, 1000)).toBe(0);
  });
  it("new candidates are seeds, older ones have matured to grass, all grass at 100%", () => {
    const s = growthStates(40, 100);
    expect(s.seeds.length + s.grass.length).toBe(40);
    expect(s.grass.every((i) => i < 40 - 6 + 1)).toBe(true);
    expect(s.seeds.every((i) => i >= 34)).toBe(true);
    const full = growthStates(100, 100);
    expect(full.seeds.length).toBe(0); expect(full.grass.length).toBe(100);
  });
  it("earlier progress is always a subset of later progress (no candidate un-grows or moves)", () => {
    const a = growthStates(30, 500), b = growthStates(60, 500);
    const later = new Set([...b.seeds, ...b.grass]);
    [...a.seeds, ...a.grass].forEach((i) => expect(later.has(i)).toBe(true));
  });
});

describe("plants: exact counts, stable slots", () => {
  const slots = Array.from({ length: 300 }, (_, i) => (i % 2 ? 1000 + i : 2000 + i));   // ×10 units
  const cands = { plants: { tulsi: slots, banyan: slots.slice(0, 20) } };
  const rules = [{ tokenType: "tulsi", assetKey: "tulsi", scale: 0.65, order: 1 }, { tokenType: "banyan", assetKey: "banyan", scale: 1.8, order: 5 }];

  it("500 Tulsi produce 500 draw entries (data only — no DOM nodes involved)", () => {
    const list = buildPlantList({ tulsi: 500 }, cands, rules);
    expect(list).toHaveLength(500);
  });
  it("the nth plant never moves when another is earned", () => {
    const a = buildPlantList({ tulsi: 10 }, cands, rules), b = buildPlantList({ tulsi: 11 }, cands, rules);
    const pos = (l) => Object.fromEntries(l.map((p) => [p.n, [p.x, p.y]]));
    const pa = pos(a), pb = pos(b);
    for (let n = 0; n < 10; n++) expect(pb[n]).toEqual(pa[n]);
  });
  it("wrapped positions (more tokens than slots) are deterministic and distinct from the base slot", () => {
    const p0 = plantPosition(slots, 3), p150 = plantPosition(slots, 3 + 150), again = plantPosition(slots, 3 + 150);
    expect(p150).toEqual(again);
    expect(p150).not.toEqual(p0);
  });
  it("bigger species paint after smaller ones", () => {
    const list = buildPlantList({ tulsi: 3, banyan: 2 }, cands, rules);
    const firstBanyan = list.findIndex((p) => p.key === "banyan");
    expect(list.slice(0, firstBanyan).every((p) => p.key === "tulsi")).toBe(true);
  });
  it("ignores unknown token types and zero counts", () => {
    expect(buildPlantList({ peepal: 9, tulsi: 0 }, cands, rules)).toHaveLength(0);
  });
  it("hash01 is stable and within [0,1)", () => {
    expect(hash01(42, 1)).toBe(hash01(42, 1));
    for (let i = 0; i < 200; i++) { const v = hash01(i); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
});

describe("hover / tap hit testing", () => {
  const hotspots = {
    "river-01": { type: "river", kind: "line", pts: [[100, 100], [200, 100]], anchor: [150, 100] },
    "mountain-01": { type: "mountain", kind: "poly", pts: [[300, 300], [400, 300], [400, 400], [300, 400]], anchor: [350, 350] },
    "temple-01": { type: "temple", kind: "point", pts: [], anchor: [500, 500] },
  };
  const all = Object.keys(hotspots);
  it("hits revealed features only", () => {
    expect(hitTest(hotspots, all, 150, 103)).toBe("river-01");
    expect(hitTest(hotspots, all, 350, 350)).toBe("mountain-01");
    expect(hitTest(hotspots, all, 502, 500)).toBe("temple-01");
    expect(hitTest(hotspots, [], 150, 100)).toBeNull();                 // hidden = no hit target
    expect(hitTest(hotspots, ["mountain-01"], 150, 100)).toBeNull();
  });
  it("misses outside tolerance", () => expect(hitTest(hotspots, all, 150, 140)).toBeNull());
  it("a river crossing a range wins over the range", () => {
    const h = { ...hotspots, "river-02": { type: "river", kind: "line", pts: [[300, 350], [400, 350]], anchor: [350, 350] } };
    expect(hitTest(h, Object.keys(h), 350, 351)).toBe("river-02");
  });
});

describe("responsive layout", () => {
  it("uses compact strips on phones and side columns on desktop", () => {
    expect(badgeLayout(12, 360)).toMatchObject({ mode: "strips", top: 6, bottom: 6, size: 34 });
    expect(badgeLayout(12, 414)).toMatchObject({ mode: "strips", size: 40 });
    expect(badgeLayout(12, 1280)).toMatchObject({ mode: "columns", left: 6, right: 6 });
  });
  it("copes with fewer than 12 badges and caps at 12", () => {
    expect(badgeLayout(5, 1280)).toMatchObject({ left: 3, right: 2 });
    expect(badgeLayout(0, 1280)).toMatchObject({ left: 0, right: 0 });
    const b = badgeLayout(30, 360); expect(b.top + b.bottom).toBe(12);
  });
  it("maps a tap to map units on any rendered size (phone and desktop) and under zoom", () => {
    const frame = { W: 1000, H: 961 };
    expect(toMapUnits(180, 90, { left: 0, top: 0, width: 360, height: 346 }, frame)[0]).toBeCloseTo(500, 5);
    expect(toMapUnits(400, 200, { left: 0, top: 0, width: 800, height: 769 }, frame)[0]).toBeCloseTo(500, 5);
    expect(toMapUnits(100, 100, { left: 0, top: 0, width: 1000, height: 961 }, frame, { k: 2, tx: 50, ty: 0 })[0]).toBeCloseTo(25, 5);
  });
});

describe("manifest helpers and text summary", () => {
  const manifest = {
    milestones: [{ unlockedFeatureIds: ["river-01"] }, { unlockedFeatureIds: ["river-01", "mountain-01"] }],
    hotspots: { "river-01": { name: "Ganga" }, "mountain-01": { name: "Himalayas" } },
    plantRules: [{ tokenType: "tulsi", species: "Tulsi", order: 1 }, { tokenType: "banyan", species: "Banyan", order: 5 }],
  };
  it("reads cumulative unlocks from the manifest", () => {
    expect(unlockedIds(manifest, 0)).toEqual([]);
    expect(unlockedIds(manifest, 2)).toEqual(["river-01", "mountain-01"]);
  });
  it("text summary states percentage, plant counts, unlocked names and badges", () => {
    const t = summaryText({ status: "ok", progressPercent: 35, dharma: { awarded: 70, possible: 200 }, plantCounts: { tulsi: 12, banyan: 0 }, badges: [{ earned: true }, { earned: false }] }, manifest, ["river-01", "mountain-01"]);
    expect(t).toMatch(/35%/); expect(t).toMatch(/12 Tulsi, 0 Banyan/); expect(t).toMatch(/Ganga, Himalayas/); expect(t).toMatch(/1 of 2 badges/);
  });
});

describe("hitTest with multi-part geometry", () => {
  const hs = {
    "river-x": { type: "river", kind: "line", parts: [[0, 0, 100, 0], [100, 0, 100, 100]], anchor: [50, 0] },
    "mountain-x": { type: "mountain", kind: "poly", parts: [[300, 300, 400, 300, 400, 400, 300, 400]], anchor: [350, 350] },
  };
  it("matches any river branch and any range ring", () => {
    expect(hitTest(hs, ["river-x"], 100, 60, 5)).toBe("river-x");
    expect(hitTest(hs, ["river-x"], 50, 40, 5)).toBe(null);
    expect(hitTest(hs, ["mountain-x"], 350, 350, 5)).toBe("mountain-x");
    expect(hitTest(hs, ["mountain-x"], 500, 350, 5)).toBe(null);
  });
});

import { malaEarned } from "./mapMath";
describe("malaEarned", () => {
  it("is exact and clamped", () => {
    expect(malaEarned(0)).toBe(0);
    expect(malaEarned(100)).toBe(108);
    expect(malaEarned(50)).toBe(54);
    expect(malaEarned(25)).toBeCloseTo(27, 9);
    expect(malaEarned(0.5)).toBeCloseTo(0.54, 9);      // half a percent = just over half a bead
    expect(malaEarned(-3)).toBe(0); expect(malaEarned(140)).toBe(108); expect(malaEarned(NaN)).toBe(0);
  });
});
