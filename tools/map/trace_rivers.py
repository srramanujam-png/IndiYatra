import geopandas as gpd, numpy as np, json, pickle
from shapely.geometry import Point
from shapely.ops import linemerge, unary_union
BBOX=(58,3,106,42)
riv=gpd.read_file('riv/HydroRIVERS_v10_as_shp/HydroRIVERS_v10_as.shp',bbox=BBOX).set_index('HYRIV_ID')
seeds,=pickle.load(open('out/seeds.pkl','rb'))
anchor={ # well-known mid-course points used ONLY to pick the right HydroRIVERS reach
'river-01':(87.9,24.8),'river-02':(90.0,26.1),'river-03':(75.93,10.78),'river-04':(81.78,17.0),
'river-05':(80.6,16.5),'river-06':(73.0,21.7),'river-07':(78.0,27.18),'river-08':(78.7,10.85),
'river-09':(85.9,20.5),'river-10':(78.0,15.8),'river-11':(76.53,30.97),'river-12':(74.7,32.9),
'river-13':(82.2,26.8),'river-14':(75.28,31.52),'river-15':(75.6,32.35)}
children={}
for hid,nd in riv.NEXT_DOWN.items(): children.setdefault(nd,[]).append(hid)
up=riv.UPLAND_SKM.to_dict(); nxt=riv.NEXT_DOWN.to_dict()
sidx=riv.sindex
chosen={}
for rid,(name,_,keep) in seeds.items():
    lon,lat=anchor[rid]; p=Point(lon,lat).buffer(0.25)
    c=riv.iloc[sidx.query(p,predicate='intersects')]
    c=c[c.index.isin(keep)]
    seed=c.UPLAND_SKM.idxmax(); chosen[rid]=seed
    print(rid,name,seed,round(up[seed]))
# trace: larger basins first so tributaries stop at confluence
owner={}; paths={}
MAXUP={'river-11':340000}
for rid in sorted(chosen,key=lambda r:-up[chosen[r]]):
    seed=chosen[rid]; path=[seed]; cur=seed; keepset=set(seeds[rid][2])
    while True:
        n=nxt.get(cur,0)
        if n==0 or n not in riv.index: break
        if n in owner: path.append(n); break   # confluence with larger named river
        if rid in MAXUP and up[n]>MAXUP[rid]: break
        path.append(n); cur=n
    # upstream: follow largest-upland child
    cur=seed
    while True:
        ch=[c for c in children.get(cur,[]) if c in riv.index]
        if not ch: break
        kp=[c for c in ch if c in keepset]
        cur=max(kp or ch,key=lambda c:up[c]); path.insert(0,cur)
    for h in path:
        if h not in owner: owner[h]=rid
    paths[rid]=path
    print(rid,seeds[rid][0],len(path))
pickle.dump((paths,),open('out/paths.pkl','wb'))

import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
fig,ax=plt.subplots(figsize=(14,14))
cm=plt.get_cmap('tab20')
for k,(rid,path) in enumerate(paths.items()):
    for g in riv.loc[path].geometry: ax.plot(*g.xy,lw=1.4,color=cm(k))
    g=riv.loc[chosen[rid]].geometry; ax.annotate(seeds[rid][0],(g.centroid.x,g.centroid.y),fontsize=9,color=cm(k))
ax.set_xlim(66,98);ax.set_ylim(8,36);ax.set_aspect(1.1);plt.savefig('out/rivers_check.png',dpi=70)
