#!/usr/bin/env python3
"""
Lawn growth order: ONE connected front that starts at the southern tip and spreads north.

The old order sorted points by (latitude + a strong noise field), which left detached islands
(Gujarat / Rajasthan) while central India was still bare. Here the order is a *front-growing* walk:
the next point is always the cheapest point that touches the already-grown lawn, where
cost = latitude (south first) + a small, smooth, low-frequency wobble so the front is gently
organic rather than a ruler-straight line. Because a point can only be added next to the lawn,
the grown area is connected by construction — no islands at any progress value.

CLI (re-orders public/map/v1/candidates.json in place, no GIS inputs needed):
    python3 tools/map/growth_order.py [public/map/v1/candidates.json]
"""
import heapq, json, math, sys
import numpy as np
from scipy.spatial import cKDTree

def order_growth(G, link=None, wobble=0.06):
    """G: (n,2) array of points in map units (y grows downward). Returns G re-ordered south -> north."""
    G = np.asarray(G, float)
    n = len(G)
    ymin, ymax = G[:, 1].min(), G[:, 1].max()
    south = (ymax - G[:, 1]) / (ymax - ymin)                       # 0 = southern tip, 1 = northern edge
    field = (np.sin(G[:, 0] * 0.008 + 1.3) * np.cos(G[:, 1] * 0.006 + 0.4) + 0.5 * np.sin(G[:, 0] * 0.013 + G[:, 1] * 0.009 + 2.1)) / 1.5
    cost = south + wobble * field
    tree = cKDTree(G)
    if link is None:                                              # link radius ~1.6 x the typical nearest-neighbour gap
        link = 1.6 * float(np.median(tree.query(G, 2)[0][:, 1]))
    nbrs = tree.query_ball_point(G, link)
    start = int(np.argmin(cost)); seen = np.zeros(n, bool); seen[start] = True
    heap = [(cost[start], start)]; out = []
    while heap:
        _, i = heapq.heappop(heap); out.append(i)
        for j in nbrs[i]:
            if not seen[j]: seen[j] = True; heapq.heappush(heap, (cost[j], j))
    if len(out) < n:                                              # disconnected leftovers (tiny islands): append by cost
        rest = np.flatnonzero(~seen); out += list(rest[np.argsort(cost[rest])])
    return G[np.array(out)]

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'public/map/v1/candidates.json'
    c = json.load(open(path)); u = c.get('unit', 0.1)
    G = np.array(c['growth'], float).reshape(-1, 2) * u
    G2 = order_growth(G)
    c['growth'] = [int(round(v / u)) for p in G2 for v in p]
    json.dump(c, open(path, 'w'), separators=(',', ':'))
    print('reordered', len(G2), 'growth points')
