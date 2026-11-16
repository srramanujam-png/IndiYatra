#!/usr/bin/env python3
"""
IndiYatra map — regional geography + placement bundle builder.

Inputs (download once into tools/map/data/src, never committed):
  GMBA_Inventory_v2.0_standard.shp     https://www.earthenv.org/mountains   (CC BY 4.0)
  HydroRIVERS_v10_as.shp               https://www.hydrosheds.org/products/hydrorivers
  ne_10m_land.shp                      https://www.naturalearthdata.com/    (public domain)
  india_outline.geojson                Survey of India outline (see README) — until supplied,
                                       the DataMeet prototype outline is used and the bundle is
                                       flagged "provisional".
Outputs (committed): public/map/v1/geo.json  public/map/v1/candidates.json
"""
import json, math, pickle, sys, os
import numpy as np
import geopandas as gpd
from shapely.geometry import shape, box, Point, MultiPolygon, Polygon, LineString, MultiLineString
from shapely.ops import unary_union, linemerge
from shapely import contains_xy, distance
from scipy.spatial import cKDTree

SRC = sys.argv[1] if len(sys.argv) > 1 else 'src'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'out'
OUTLINE = sys.argv[3] if len(sys.argv) > 3 else None          # geojson; None = provisional prototype
PROVISIONAL = OUTLINE is None or 'datameet' in OUTLINE.lower() or 'prototype' in OUTLINE.lower()
os.makedirs(OUT, exist_ok=True)

LON0, LON1, LAT0, LAT1 = 62.0, 101.0, 4.5, 39.5
K = math.cos(math.radians(21.0))
U = 1000.0 / ((LON1 - LON0) * K)
W = 1000.0
H = round((LAT1 - LAT0) * U, 1)
FRAME = box(LON0, LAT0, LON1, LAT1)

def px(lon, lat): return ((lon - LON0) * K * U, (LAT1 - lat) * U)

def ring_d(coords):
    pts = [px(x, y) for x, y in coords]
    return 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)

def geom_d(g):
    if g.is_empty: return ''
    parts = []
    if isinstance(g, (Polygon,)):
        parts.append(g)
    elif hasattr(g, 'geoms'):
        for s in g.geoms:
            if isinstance(s, Polygon): parts.append(s)
            elif hasattr(s, 'geoms'): parts += [t for t in s.geoms if isinstance(t, Polygon)]
    d = ''
    for p in parts:
        d += ring_d(p.exterior.coords) + 'Z'
        for i in p.interiors: d += ring_d(i.coords) + 'Z'
    return d

def line_d(g):
    lines = [g] if isinstance(g, LineString) else [l for l in getattr(g, 'geoms', []) if isinstance(l, LineString)]
    return ''.join('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in (px(a, b) for a, b in l.coords)) for l in lines if len(l.coords) > 1)

def project_geom(g):
    from shapely.ops import transform
    return transform(lambda x, y, z=None: (np.asarray(x - LON0) * K * U, np.asarray(LAT1 - y) * U), g)

# ---------- land ----------
land = gpd.read_file(f'{SRC}/ne_10m_land.shp', bbox=(LON0 - 1, LAT0 - 1, LON1 + 1, LAT1 + 1))
land_g = unary_union(land.geometry).intersection(FRAME).simplify(0.03)
# ---------- India outline ----------
oj = json.load(open(OUTLINE or f'{SRC}/india_prototype_outline.geojson'))
og = shape(oj['features'][0]['geometry'] if oj.get('features') else oj.get('geometry', oj))
india = og.simplify(0.02)
# ---------- GMBA ----------
gm = gpd.read_file(f'{SRC}/GMBA_Inventory_v2.0_standard.shp', bbox=(LON0, LAT0, LON1, LAT1))
MOUNT_IDS = {  # feature id -> (GMBA_V2_ID, style)
 'mountain-01': (11400, 'snow'), 'mountain-02': (11464, 'snow'), 'mountain-03': (12052, 'grassy'),
 'mountain-04': (11312, 'grassy'), 'mountain-05': (19284, 'dry'), 'mountain-06': (14364, 'dry'),
 'mountain-07': (11817, 'mixed'), 'mountain-08': (11568, 'dry'), 'mountain-09': (11673, 'grassy'),
 'mountain-10': (12847, 'grassy'), 'mountain-11': (14366, 'grassy'), 'mountain-12': (14365, 'grassy'),
 'mountain-13': (11659, 'grassy'), 'mountain-14': (14361, 'grassy'), 'mountain-15': (19269, 'grassy')}
features = {}
for fid, (gid, style) in MOUNT_IDS.items():
    row = gm[gm.GMBA_V2_ID == gid].iloc[0]
    g = row.geometry.intersection(FRAME).simplify(0.03)
    if g.area < 0.02: g = row.geometry.buffer(0.08).intersection(FRAME)  # tiny range: keep visible
    features[fid] = dict(type='mountain', style=style, src=f'GMBA v2.0 Standard id {gid} ({row.MapName})',
                         d=geom_d(g), g=g)
# faint unnamed relief: broad mountain systems (hierarchy level <=4), unioned
rel = gm[gm.Hier_Lvl <= 4]
relief_g = unary_union([r.intersection(FRAME) for r in rel.geometry]).simplify(0.05)
# ---------- rivers ----------
riv = gpd.read_file(f'{SRC}/HydroRIVERS_v10_as.shp', bbox=(LON0 - 1, LAT0 - 1, LON1 + 1, LAT1 + 1)).set_index('HYRIV_ID')
paths, = pickle.load(open(f'{OUT}/paths.pkl', 'rb'))
try: yex = pickle.load(open(f'{OUT}/yamuna_extra.pkl', 'rb'))
except Exception: yex = []
paths['river-07'] = list(dict.fromkeys(yex + paths['river-07']))
seeds, = pickle.load(open(f'{OUT}/seeds.pkl', 'rb'))
river_geoms = {}
for i in range(1, 16):
    fid = f'river-{i:02d}'
    lines = unary_union(list(riv.loc[paths[fid]].geometry))
    lg = lines.intersection(FRAME).simplify(0.012)
    river_geoms[fid] = lg
    features[fid] = dict(type='river', style='river', src='HydroRIVERS v1.0 (main-stem trace; name matched to CWC river network)',
                         d=line_d(lg), g=lg)
# ---------- projected shapes for placement ----------
india_p = project_geom(india)
mainland = max(india_p.geoms, key=lambda p: p.area) if hasattr(india_p, 'geoms') else india_p
inner = mainland.buffer(-3.5)
rng = np.random.default_rng(20260929)
minx, miny, maxx, maxy = inner.bounds

def pool(n):
    pts = np.column_stack([rng.uniform(minx, maxx, n), rng.uniform(miny, maxy, n)])
    return pts[contains_xy(inner, pts[:, 0], pts[:, 1])]

POOL = pool(400000)
river_p = unary_union([project_geom(g) for g in river_geoms.values()]).intersection(inner.buffer(4))
rd = river_p.buffer(13).intersection(inner)
water_pool = POOL[contains_xy(rd, POOL[:, 0], POOL[:, 1])] if not rd.is_empty else POOL

def best_candidate(n, cand_pool, k, taken, min_gap):
    """Mitchell best-candidate: every prefix of the sequence is well spread."""
    pts = []
    tree_taken = cKDTree(np.array(taken)) if taken else None
    for _ in range(n):
        idx = rng.integers(0, len(cand_pool), k)
        c = cand_pool[idx]
        if pts:
            d = cKDTree(np.array(pts)).query(c)[0]
        else:
            d = np.full(len(c), 1e9)
        if tree_taken is not None:
            d = np.minimum(d, tree_taken.query(c)[0] * 1.6)
        j = int(np.argmax(d))
        if d[j] < min_gap and len(pts) > 0: break
        pts.append(c[j])
    return np.array(pts)

# species: name -> (count, pool, k, min_gap)
SPECS = [('banyan', 70, POOL, 60, 20), ('ashoka', 130, POOL, 50, 15), ('lotus', 240, water_pool, 40, 9),
         ('jasmine', 380, POOL, 30, 9), ('tulsi', 760, POOL, 25, 7)]
taken = []
plants = {}
for name, n, pl, k, gap in SPECS:
    pts = best_candidate(n, pl, k, taken, gap)
    plants[name] = pts
    taken += [tuple(p) for p in pts]
    print(name, len(pts))
# growth candidates (dharma seeds -> dhruva grass): dense blue-noise, ordered south -> north with ragged fronts
def poisson(pool_pts, r):
    order = rng.permutation(len(pool_pts)); kept = []; grid = {}
    cs = r / math.sqrt(2)
    for i in order:
        x, y = pool_pts[i]; gx, gy = int(x // cs), int(y // cs); ok = True
        for a in range(gx - 2, gx + 3):
            for b in range(gy - 2, gy + 3):
                q = grid.get((a, b))
                if q is not None and (q[0] - x) ** 2 + (q[1] - y) ** 2 < r * r: ok = False; break
            if not ok: break
        if ok: grid[(gx, gy)] = (x, y); kept.append((x, y))
    return np.array(kept)
G = poisson(POOL, 7.4)      # dense Dhruva-grass field (r=7.4 map units ≈ 2.4× the first version)
# ONE connected southern front (no islands): see tools/map/growth_order.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from growth_order import order_growth
G = order_growth(G)                                             # south first, north last
print('growth candidates', len(G))

# ---------- rudraksha mala: 108 beads equally spaced along the mainland boundary, starting at the southern tip ----------
# TIGHT boundary: starts at the northernmost point (Kashmir), runs CLOCKWISE (east first) and returns to Kashmir.
# Beads are placed every MALA_SPACING map units along the real boundary, so their number follows its length
# (a different, more detailed outline simply gets more beads). Do NOT smooth this ring: it must hug the border.
MALA_SPACING = 7.0
ring = np.array(mainland.simplify(1.2).exterior.coords)
i0 = int(np.argmin(ring[:, 1]))
ring = np.vstack([ring[i0:-1], ring[:i0], ring[i0:i0 + 1]])
sa = 0.5 * np.sum(ring[:-1, 0] * ring[1:, 1] - ring[1:, 0] * ring[:-1, 1])      # y is DOWN: sa > 0 == clockwise on screen
if sa < 0: ring = np.vstack([ring[0:1], ring[:0:-1]])
seg = np.hypot(*np.diff(ring, axis=0).T); cum = np.concatenate([[0], np.cumsum(seg)]); LEN = cum[-1]
MALA_BEADS = int(round(LEN / MALA_SPACING))
def at(dist):
    j = min(int(np.searchsorted(cum, dist, side='right')) - 1, len(seg) - 1); t = (dist - cum[j]) / max(seg[j], 1e-9)
    a, b = ring[j], ring[j + 1]; tang = (b - a) / max(np.hypot(*(b - a)), 1e-9)
    return a + (b - a) * t, tang
beads = []
for k in range(MALA_BEADS):
    pos, tang = at((k + 0.5) / MALA_BEADS * LEN)
    # smooth the tangent over +-1.5 bead spacings so the partial-bead fill edge is not jagged
    a, _ = at(max(0, (k + 0.5) / MALA_BEADS * LEN - LEN / MALA_BEADS * 1.5)); b, _ = at(min(LEN, (k + 0.5) / MALA_BEADS * LEN + LEN / MALA_BEADS * 1.5))
    tg = (b - a) / max(np.hypot(*(b - a)), 1e-9)
    beads += [pos[0], pos[1], tg[0], tg[1]]
string = LineString(ring).simplify(0.5)
print('mala perimeter', round(LEN), 'units; bead spacing', round(LEN / MALA_BEADS, 1), '; string pts', len(string.coords))

# ---------- 3-D mountain peaks: shaded triangular peaks scattered inside every range polygon ----------
def peaks_for(fid, f):
    g = project_geom(f['g']); polys = list(g.geoms) if hasattr(g, 'geoms') else [g]
    style = f['style']; r = 8.0 if style == 'snow' else 6.8
    out = []
    for q in polys:
        if q.area < 40: continue
        mnx, mny, mxx, mxy = q.bounds
        pts = np.column_stack([rng.uniform(mnx, mxx, 40000), rng.uniform(mny, mxy, 40000)])
        pts = pts[contains_xy(q.buffer(-2), pts[:, 0], pts[:, 1])]
        out += [tuple(p) for p in poisson(pts, r)] if len(pts) else []
    out.sort(key=lambda p: p[1])                                    # back (north) to front (south)
    if len(out) > 700: out = [out[i] for i in np.linspace(0, len(out) - 1, 700).astype(int)]
    return [v for p in out for v in (int(round(p[0] * 10)), int(round(p[1] * 10)), int(round((0.75 + 0.5 * rng.random()) * 100)))]   # x*10, y*10, size%
peak_data = {fid: peaks_for(fid, f) for fid, f in features.items() if f['type'] == 'mountain'}
print('peaks', sum(len(v) // 3 for v in peak_data.values()))

def flat(a): return [int(round(v * 10)) for p in a for v in p]
cand = dict(version='v1', frame=dict(W=W, H=H), unit=0.1,
            growth=flat(G), plants={k: flat(v) for k, v in plants.items()},
            mala=dict(beads=MALA_BEADS, pos=[round(v, 2) for v in beads], string=flat(np.array(string.coords))))
json.dump(cand, open(f'{OUT}/candidates.json', 'w'), separators=(',', ':'))

# ---------- feature anchors / hit shapes ----------
def flat1(coords, nd=1): return [round(v, nd) for xy in coords for v in xy]

def hit_shape(fid, f):
    """Hit / overlay geometry in map units. Rivers: every branch simplified to ~1 unit. Ranges: outline rings of
    the significant polygons (~1.5 units). Flat [x0,y0,x1,y1,…] arrays keep the manifest small."""
    g = project_geom(f['g'])
    if f['type'] == 'river':
        m = linemerge(g) if not isinstance(g, LineString) else g          # HydroRIVERS reaches arrive as many tiny pieces: join them
        parts = [m] if isinstance(m, LineString) else [l for l in m.geoms if isinstance(l, LineString)]
        keep = [l.simplify(1.0) for l in parts if l.length > 4]
        parts = keep or [max(parts, key=lambda l: l.length).simplify(0.5)]
        longest = max(parts, key=lambda l: l.length)
        mid = longest.interpolate(0.5, normalized=True)
        return dict(kind='line', parts=[flat1(l.coords) for l in parts], anchor=[round(mid.x, 1), round(mid.y, 1)])
    p = g.simplify(1.5)
    polys = [q for q in (p.geoms if hasattr(p, 'geoms') else [p]) if q.area > 30]
    if not polys: polys = [max((p.geoms if hasattr(p, 'geoms') else [p]), key=lambda q: q.area)]
    big = max(polys, key=lambda q: q.area); c = big.representative_point()
    return dict(kind='poly', parts=[flat1(q.exterior.coords) for q in polys], anchor=[round(c.x, 1), round(c.y, 1)])
hit = {fid: hit_shape(fid, f) for fid, f in features.items()}

geo = dict(
    version='v1', provisional=PROVISIONAL,
    frame=dict(lon0=LON0, lon1=LON1, lat0=LAT0, lat1=LAT1, cosLat=K, W=W, H=H),
    outline=dict(d=geom_d(india), source=('PROVISIONAL: DataMeet composite outline prototype — NOT the Survey of India official outline'
                 if PROVISIONAL else 'Survey of India international boundary (1:16M vector)')),
    land=geom_d(land_g), relief=geom_d(relief_g),
    features={fid: dict(type=f['type'], style=f['style'], src=f['src'], d=f['d'], **({'peaks': peak_data[fid]} if fid in peak_data else {})) for fid, f in features.items()},
    attribution=['GMBA Mountain Inventory v2 — Snethlage et al. 2022, CC BY 4.0, doi:10.48601/earthenv-t9k2-1407',
                 'HydroRIVERS v1.0 — Lehner & Grill 2013, doi:10.1002/hyp.9740',
                 'Natural Earth — public domain', 'CWC River Network (national water data portal) for river naming'])
json.dump(geo, open(f'{OUT}/geo.json', 'w'), separators=(',', ':'))
# tiny file for the quick view (lawn clip): India outline only, so the 470 KB geo.json stays lazy
json.dump(dict(version='v1', frame=geo['frame'], outline=geo['outline']), open(f'{OUT}/india.json', 'w'), separators=(',', ':'))
json.dump({fid: dict(type=features[fid]['type'], style=features[fid]['style'], **hit[fid]) for fid in features},
          open(f'{OUT}/hit.json', 'w'), separators=(',', ':'))
for f in ['geo.json', 'candidates.json', 'hit.json', 'india.json']:
    print(f, os.path.getsize(f'{OUT}/{f}') // 1024, 'KB')
