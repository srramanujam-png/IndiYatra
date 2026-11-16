#!/usr/bin/env python3
"""
Swap in a new India outline (e.g. the Survey of India 1:16M outline) WITHOUT re-running the whole GIS build.

    python3 tools/map/apply_outline.py path/to/india_outline.geojson [public/map/v1]

Reads the GeoJSON outline (lon/lat, WGS84-like), then rewrites in <dir>:
  geo.json        outline.d, provisional flag, source note, attribution
  india.json      the tiny outline-only file used by the quick view (lawn clip)
  candidates.json growth (lawn) points, plant slots and the rudraksha mala, all re-fitted to the new border
Everything else (mountain ranges, rivers, land, hit shapes) is kept as is, so the plates must be re-rendered afterwards:
    npm run map:plates
The placement code mirrors tools/map/build_geo.py (same species, spacing and seed) so results are comparable.
Needs: numpy, scipy, shapely.
"""
import json, math, os, re, sys
import numpy as np
from scipy.spatial import cKDTree
from shapely.geometry import shape, Polygon, MultiPolygon, LineString, MultiLineString
from shapely.ops import unary_union, transform
from shapely import contains_xy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from growth_order import order_growth

SRC = sys.argv[1]
DIR = sys.argv[2] if len(sys.argv) > 2 else 'public/map/v1'
geo = json.load(open(f'{DIR}/geo.json'))
fr = geo['frame']
LON0, LON1, LAT0, LAT1, K, W, H = fr['lon0'], fr['lon1'], fr['lat0'], fr['lat1'], fr['cosLat'], fr['W'], fr['H']
U = W / ((LON1 - LON0) * K)

def px(lon, lat): return ((lon - LON0) * K * U, (LAT1 - lat) * U)
def ring_d(coords): return 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in (px(a, b) for a, b in coords))

# ---------- outline: keep every island, drop tiny slivers and interior rings, simplify ~2 km ----------
oj = json.load(open(SRC))
og = shape(oj['features'][0]['geometry'] if oj.get('features') else oj.get('geometry', oj))
parts = [p for p in (og.geoms if hasattr(og, 'geoms') else [og]) if isinstance(p, Polygon)]
parts = [Polygon(p.exterior).buffer(0) for p in parts if p.area > 1e-5]
india = unary_union(parts).simplify(0.02)
if isinstance(india, Polygon): india = MultiPolygon([india])
d = ''.join(ring_d(p.exterior.coords) + 'Z' for p in india.geoms if p.area > 1e-5)
name = os.path.basename(SRC)
note = 'Survey of India outline map of India, 1:16M (vector, generalised); georeferenced from its published graticule'
geo['outline'] = dict(d=d, source=note)
geo['provisional'] = False
att = [a for a in geo.get('attribution', []) if 'Survey of India' not in a]
att.insert(0, 'India outline: Survey of India, Outline Map of India 1:16M (surveyofindia.gov.in) - confirm licence terms before public release')
geo['attribution'] = att
json.dump(geo, open(f'{DIR}/geo.json', 'w'), separators=(',', ':'))
json.dump(dict(version=geo['version'], frame=fr, outline=geo['outline']), open(f'{DIR}/india.json', 'w'), separators=(',', ':'))
print('outline: parts', len(india.geoms), 'path chars', len(d))

# ---------- placement (mirrors build_geo.py) ----------
def project_geom(g): return transform(lambda x, y, z=None: (np.asarray(x - LON0) * K * U, np.asarray(LAT1 - y) * U), g)
india_p = project_geom(india)
mainland = max(india_p.geoms, key=lambda p: p.area)
inner = mainland.buffer(-3.5)
rng = np.random.default_rng(20260929)
minx, miny, maxx, maxy = inner.bounds

def pool(n):
    pts = np.column_stack([rng.uniform(minx, maxx, n), rng.uniform(miny, maxy, n)])
    return pts[contains_xy(inner, pts[:, 0], pts[:, 1])]
POOL = pool(400000)

def lines_of(dstr):
    out = []
    for seg in dstr.split('M')[1:]:
        n = [float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', seg)]
        if len(n) >= 4: out.append(LineString(np.array(n).reshape(-1, 2)))
    return out
riv = [l for f in geo['features'].values() if f['type'] == 'river' for l in lines_of(f['d'])]
river_p = unary_union(riv).intersection(inner.buffer(4))
rd = river_p.buffer(13).intersection(inner)
water_pool = POOL[contains_xy(rd, POOL[:, 0], POOL[:, 1])] if not rd.is_empty else POOL

def best_candidate(n, cand_pool, k, taken, min_gap):
    pts = []
    tree_taken = cKDTree(np.array(taken)) if taken else None
    for _ in range(n):
        c = cand_pool[rng.integers(0, len(cand_pool), k)]
        d = cKDTree(np.array(pts)).query(c)[0] if pts else np.full(len(c), 1e9)
        if tree_taken is not None: d = np.minimum(d, tree_taken.query(c)[0] * 1.6)
        j = int(np.argmax(d))
        if d[j] < min_gap and len(pts) > 0: break
        pts.append(c[j])
    return np.array(pts)

SPECS = [('banyan', 70, POOL, 60, 20), ('ashoka', 130, POOL, 50, 15), ('lotus', 240, water_pool, 40, 9), ('jasmine', 380, POOL, 30, 9), ('tulsi', 760, POOL, 25, 7)]
taken, plants = [], {}
for nm, n, pl, k, gap in SPECS:
    plants[nm] = best_candidate(n, pl, k, taken, gap); taken += [tuple(p) for p in plants[nm]]; print(nm, len(plants[nm]))

def poisson(pool_pts, r):
    order = rng.permutation(len(pool_pts)); kept = []; grid = {}; cs = r / math.sqrt(2)
    for i in order:
        x, y = pool_pts[i]; gx, gy = int(x // cs), int(y // cs); ok = True
        for a in range(gx - 2, gx + 3):
            for b in range(gy - 2, gy + 3):
                q = grid.get((a, b))
                if q is not None and (q[0] - x) ** 2 + (q[1] - y) ** 2 < r * r: ok = False; break
            if not ok: break
        if ok: grid[(gx, gy)] = (x, y); kept.append((x, y))
    return np.array(kept)
G = order_growth(poisson(POOL, 7.4))
print('growth candidates', len(G))

# rudraksha mala: beads every MALA_SPACING along the mainland boundary, from the northernmost point (Kashmir), clockwise
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
    a, b = ring[j], ring[j + 1]; return a + (b - a) * t
beads = []
for k in range(MALA_BEADS):
    c = (k + 0.5) / MALA_BEADS * LEN; pos = at(c)
    a = at(max(0, c - LEN / MALA_BEADS * 1.5)); b = at(min(LEN, c + LEN / MALA_BEADS * 1.5))
    tg = (b - a) / max(np.hypot(*(b - a)), 1e-9); beads += [pos[0], pos[1], tg[0], tg[1]]
string = LineString(ring).simplify(0.5)
print('mala perimeter', round(LEN), 'units; beads', MALA_BEADS)

def flat(a): return [int(round(v * 10)) for p in a for v in p]
cand = dict(version='v1', frame=dict(W=W, H=H), unit=0.1, growth=flat(G), plants={k: flat(v) for k, v in plants.items()},
            mala=dict(beads=MALA_BEADS, pos=[round(v, 2) for v in beads], string=flat(np.array(string.coords))))
json.dump(cand, open(f'{DIR}/candidates.json', 'w'), separators=(',', ':'))
print('done - now run: npm run map:plates')
