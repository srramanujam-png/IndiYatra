#!/usr/bin/env node
// Builds the map sprite atlas (public/map/v1/sprites.webp + sprites.json).
//
// ROUTE A (default): stylised vector sprites drawn in code below — no external art, ~15 KB atlas.
// ROUTE B (later): drop a transparent PNG named <key>.png (e.g. tulsi.png, banyan.png, dhruva_grass_1.png)
//   into tools/map/sprites/custom/ and re-run `npm run map:sprites`. Any key with a custom PNG replaces the
//   vector version; everything else keeps the vector sprite. Recommended: 256x256 PNG, transparent
//   background, subject centred with its base ~12% above the bottom edge. They are downsampled to CELL px.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CELL = 96;                       // each sprite is drawn on a CELL x CELL cell (2x for retina at ~40px)
const outDir = "public/map/v1";
const customDir = "tools/map/sprites/custom";

// deterministic random so the atlas is reproducible
let s = 1234567;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const R = (a, b) => a + (b - a) * rnd();
const f = (n) => n.toFixed(1);

const shadow = (rx = 26, ry = 6, cy = 86) => `<ellipse cx="48" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2b3a1e" opacity=".22"/>`;
const leaf = (x, y, len, wid, ang, fill = "url(#lf)", rib = "#1f4d1a") =>
  `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})"><path d="M0 0 C${f(wid * .7)} ${f(-len * .25)} ${f(wid * .6)} ${f(-len * .8)} 0 ${f(-len)} C${f(-wid * .6)} ${f(-len * .8)} ${f(-wid * .7)} ${f(-len * .25)} 0 0Z" fill="${fill}"/><path d="M0 -1 L0 ${f(-len * .9)}" stroke="${rib}" stroke-width=".6" opacity=".45" fill="none"/></g>`;
const circle = (x, y, r, fill, o = 1) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" opacity="${o}"/>`;

const defs = `<defs>
 <linearGradient id="lf" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2f6b23"/><stop offset="1" stop-color="#7fc04a"/></linearGradient>
 <linearGradient id="lfp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3c5a2a"/><stop offset="1" stop-color="#8a6fa8"/></linearGradient>
 <linearGradient id="lfd" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1f5a26"/><stop offset="1" stop-color="#4f9a3a"/></linearGradient>
 <radialGradient id="cn" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#7cc24f"/><stop offset=".55" stop-color="#3f8a2c"/><stop offset="1" stop-color="#1f5a1e"/></radialGradient>
 <radialGradient id="cb" cx=".4" cy=".28" r=".85"><stop offset="0" stop-color="#5faa3c"/><stop offset=".6" stop-color="#2f7326"/><stop offset="1" stop-color="#174a17"/></radialGradient>
 <linearGradient id="tr" x1="0" x2="1"><stop offset="0" stop-color="#6b4a2b"/><stop offset=".5" stop-color="#8d6a45"/><stop offset="1" stop-color="#553920"/></linearGradient>
 <linearGradient id="pk" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e2669a"/><stop offset="1" stop-color="#fbd0e1"/></linearGradient>
 <linearGradient id="sd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset=".55" stop-color="#f29a1a"/><stop offset="1" stop-color="#b8620b"/></linearGradient>
 <radialGradient id="wt" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#bfe3f2"/><stop offset="1" stop-color="#8fc6de"/></radialGradient>
</defs>`;

// ---- sprites -------------------------------------------------------------------------------------------------
const seed = () => `${shadow(9, 2.5, 60)}
  <g transform="translate(48 42) rotate(-24)"><ellipse rx="10.5" ry="15" fill="url(#sd)"/><ellipse cx="-3.5" cy="-5" rx="3" ry="6" fill="#fff" opacity=".45"/><path d="M0 -14 Q3 -10 0 -3" stroke="#8a4a08" stroke-width=".8" fill="none" opacity=".5"/></g>
  <path d="M60 38 q4 -8 10 -6 q-3 6 -10 6Z" fill="#6fbf3f"/>`;

const grass = (variant) => {
  s = 900 + variant * 77;
  const blades = [];
  const n = 11 + variant * 2;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = (t - 0.5) * 78 + R(-5, 5), h = R(34, 60) * (1 - Math.abs(t - .5) * .55), w = R(2.4, 4);
    const bend = R(-14, 14);
    const x0 = 48 + (t - .5) * 22;
    const tipx = x0 + Math.sin(a * Math.PI / 180) * h + bend * .4, tipy = 84 - Math.cos(a * Math.PI / 180) * h;
    const cx = x0 + Math.sin(a * Math.PI / 180) * h * .45 + bend, cy = 84 - h * .55;
    blades.push(`<path d="M${f(x0 - w)} 84 Q${f(cx - w * .5)} ${f(cy)} ${f(tipx)} ${f(tipy)} Q${f(cx + w * .6)} ${f(cy + 3)} ${f(x0 + w)} 84Z" fill="${i % 3 === 0 ? "url(#lfd)" : "url(#lf)"}"/>`);
  }
  // dhruva (durva) grass carries slender 3-fingered spikes
  const spikes = [-10, 6, 14].slice(0, variant + 1).map((dx, k) => {
    const x = 48 + dx, y = 40 + k * 4;
    return `<g stroke="#a9c25a" stroke-width="1.1" stroke-linecap="round" fill="none"><path d="M${x} ${y + 14} L${x} ${y}"/><path d="M${x} ${y + 2} L${x - 4} ${y - 5}"/><path d="M${x} ${y + 2} L${x} ${y - 7}"/><path d="M${x} ${y + 2} L${x + 4} ${y - 5}"/></g>`;
  }).join("");
  return `${shadow(24, 5, 86)}${blades.join("")}${spikes}`;
};

const tulsi = () => {
  s = 555;
  const leaves = [];
  for (let tier = 0; tier < 4; tier++) for (let k = 0; k < 6 - tier; k++) {
    const ang = (k / (6 - tier) - .5) * (150 - tier * 22) + R(-8, 8), y = 80 - tier * 13;
    leaves.push(leaf(48 + R(-2, 2), y, 22 - tier * 2, 11 - tier, ang, tier % 2 ? "url(#lfp)" : "url(#lf)"));
  }
  const spike = Array.from({ length: 7 }, (_, i) => `<ellipse cx="${f(48 + (i % 2 ? 2.2 : -2.2))}" cy="${f(30 - i * 3.6)}" rx="3" ry="1.8" fill="#b79ad6"/>`).join("");
  return `${shadow(22, 5, 86)}<path d="M48 84 L48 26" stroke="#4a5a2a" stroke-width="2.2" fill="none"/>${leaves.join("")}${spike}${circle(48, 6, 2.2, "#b79ad6")}`;
};

const jasmine = () => {
  s = 777;
  const leaves = Array.from({ length: 16 }, (_, i) => leaf(48 + R(-14, 14), 70 - R(0, 30), R(13, 18), R(6, 9), R(-75, 75), "url(#lfd)")).join("");
  const flowers = Array.from({ length: 11 }, () => {
    const x = 48 + R(-25, 25), y = 40 + R(-4, 34), r = R(4.2, 5.8);
    const petals = Array.from({ length: 5 }, (_, k) => `<ellipse cx="0" cy="${f(-r * .9)}" rx="${f(r * .45)}" ry="${f(r * .95)}" fill="#fff" stroke="#e6e2d6" stroke-width=".4" transform="rotate(${k * 72})"/>`).join("");
    return `<g transform="translate(${f(x)} ${f(y)})">${petals}<circle r="1.3" fill="#f2c94c"/></g>`;
  }).join("");
  return `${shadow(26, 5.5, 86)}<path d="M48 86 L48 60 M48 74 L30 56 M48 72 L66 54" stroke="#4a5a2a" stroke-width="2" fill="none"/>${leaves}${flowers}`;
};

const lotus = () => {
  s = 321;
  const pads = [[26, 70, 15], [70, 66, 13], [56, 82, 11]].map(([x, y, r]) => `<g transform="translate(${x} ${y})"><ellipse rx="${r}" ry="${f(r * .42)}" fill="#3f8a3a"/><path d="M0 0 L${r} ${f(-r * .1)} L${r * .95} ${f(r * .1)}Z" fill="#8fc6de"/><ellipse rx="${f(r * .8)}" ry="${f(r * .3)}" fill="#5aa44a" opacity=".55"/></g>`).join("");
  const petal = (a, len, w, fill) => `<path d="M0 0 C${w} ${-len * .35} ${w * .7} ${-len * .85} 0 ${-len} C${-w * .7} ${-len * .85} ${-w} ${-len * .35} 0 0Z" fill="${fill}" stroke="#c94f82" stroke-width=".4" stroke-opacity=".5" transform="rotate(${a})"/>`;
  const back = [-62, -36, 36, 62].map((a) => petal(a, 26, 9, "url(#pk)")).join("");
  const mid = [-24, 0, 24].map((a) => petal(a, 30, 9.5, "url(#pk)")).join("");
  const front = [-40, 40].map((a) => petal(a, 22, 8, "#f6a9c6")).join("");
  return `<ellipse cx="48" cy="66" rx="42" ry="20" fill="url(#wt)"/><ellipse cx="48" cy="66" rx="32" ry="13" fill="none" stroke="#fff" stroke-width="1" opacity=".6"/>${pads}
  <g transform="translate(46 62)">${back}${mid}${front}<ellipse cy="-4" rx="6" ry="3" fill="#f2c94c"/><circle cy="-4" r="2" fill="#e9a71a"/></g>`;
};

const canopyTree = (o) => {
  s = o.seed;
  const blobs = Array.from({ length: o.n }, () => [48 + R(-o.spread, o.spread), o.top + R(0, o.depth), R(o.r0, o.r1)]);
  blobs.sort((a, b) => a[1] - b[1]);
  const body = blobs.map(([x, y, r]) => circle(x, y, r, `url(#${o.grad})`)).join("");
  const hi = blobs.slice(0, Math.ceil(o.n / 2)).map(([x, y, r]) => circle(x - r * .3, y - r * .3, r * .45, "#a3d86a", .35)).join("");
  return { body, hi };
};

const ashoka = () => {
  const c = canopyTree({ seed: 42, n: 9, spread: 20, top: 30, depth: 22, r0: 12, r1: 17, grad: "cn" });
  s = 99;
  const flowers = Array.from({ length: 26 }, () => {
    const x = 48 + R(-27, 27), y = 28 + R(0, 36), col = rnd() > .5 ? "#f26a1b" : "#e8452b";
    return `<g transform="translate(${f(x)} ${f(y)})">${circle(0, 0, 2.6, col)}${circle(2.6, 1.4, 2.2, "#ff9a3c")}${circle(-2.4, 1.6, 2, col)}</g>`;
  }).join("");
  return `${shadow(30, 6, 88)}<path d="M44 88 Q46 66 46 52 L52 52 Q52 66 55 88Z" fill="url(#tr)"/>${c.body}${c.hi}${flowers}`;
};

const banyan = () => {
  const c = canopyTree({ seed: 7, n: 16, spread: 27, top: 22, depth: 22, r0: 12, r1: 17, grad: "cb" });
  s = 61;
  const roots = [16, 26, 38, 60, 72, 82].map((x) => `<path d="M${x} ${f(R(48, 54))} Q${f(x + R(-3, 3))} ${f(R(66, 74))} ${f(x + R(-2, 2))} 86" stroke="#8d6a45" stroke-width="${f(R(1.6, 2.6))}" fill="none" stroke-linecap="round"/>`).join("");
  return `${shadow(40, 6.5, 89)}${roots}<path d="M40 89 Q42 62 44 50 L54 50 Q56 62 60 89Z" fill="url(#tr)"/>${c.body}${c.hi}`;
};

const SPRITES = {
  seed, dhruva_grass_1: () => grass(0), dhruva_grass_2: () => grass(1), dhruva_grass_3: () => grass(2),
  tulsi, jasmine, lotus, ashoka, banyan,
};
const KEYS = Object.keys(SPRITES);
const COLS = 5, ROWS = Math.ceil(KEYS.length / COLS);
const svgOf = (k) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}" viewBox="0 0 96 96">${defs}${SPRITES[k]()}</svg>`);

const layers = [], keys = {};
let custom = 0;
for (let i = 0; i < KEYS.length; i++) {
  const k = KEYS[i], left = (i % COLS) * CELL, top = Math.floor(i / COLS) * CELL;
  const customFile = path.join(customDir, `${k}.png`);
  let input;
  if (fs.existsSync(customFile)) { input = await sharp(customFile).resize(CELL, CELL, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(); custom++; }
  else input = await sharp(svgOf(k)).png().toBuffer();
  layers.push({ input, left, top });
  keys[k] = [left, top];
}
fs.mkdirSync(outDir, { recursive: true });
await sharp({ create: { width: COLS * CELL, height: ROWS * CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(layers).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(path.join(outDir, "sprites.webp"));
fs.writeFileSync(path.join(outDir, "sprites.json"), JSON.stringify({ cell: CELL, keys, route: custom ? `mixed (${custom} custom)` : "A (vector)" }));
// a preview sheet for eyeballing at larger scale
if (process.argv.includes("--preview")) {
  await sharp({ create: { width: COLS * CELL * 2, height: ROWS * CELL * 2, channels: 4, background: "#F8F7F2" } })
    .composite(await Promise.all(layers.map(async (l) => ({ input: await sharp(l.input).resize(CELL * 2).png().toBuffer(), left: l.left * 2, top: l.top * 2 })))).png().toFile("/tmp/claude-0/sprites_preview.png");
}
console.log(`sprites.webp ${(fs.statSync(path.join(outDir, "sprites.webp")).size / 1024).toFixed(1)} KB · ${KEYS.length} sprites · route ${custom ? "mixed" : "A"}`);
