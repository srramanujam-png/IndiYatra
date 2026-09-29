import geopandas as gpd, numpy as np, json, pickle
from shapely.geometry import shape, box
from shapely.ops import linemerge, unary_union
BBOX=(58,3,106,42)
riv=gpd.read_file('riv/HydroRIVERS_v10_as_shp/HydroRIVERS_v10_as.shp',bbox=BBOX)
print(len(riv))
riv=riv.set_index('HYRIV_ID')
cwc=json.load(open('/tmp/claude-0/zip/india_15_rivers_dashboard.geojson'))
order=['Ganga','Brahmaputra','Bharathapuzha','Godavari','Krishna','Narmada','Yamuna','Cauvery (Kaveri)','Mahanadi','Tungabhadra','Sutlej (Satluj)','Chenab','Ghaghara','Beas','Ravi']
children={}
for hid,row in riv[['NEXT_DOWN']].itertuples():
    children.setdefault(row,[]).append(hid)
sidx=riv.sindex
seeds={}
for i,ft in enumerate(cwc['features']):
    line=shape(ft['geometry']); buf=line.buffer(0.03)
    cand=riv.iloc[sidx.query(buf,predicate='intersects')]
    keep=[]
    for hid,r in cand.iterrows():
        inter=r.geometry.intersection(buf).length
        if inter>=0.5*r.geometry.length: keep.append(hid)
    sub=riv.loc[keep]
    seed=sub.UPLAND_SKM.idxmax()
    seeds[f'river-{i+1:02d}']=(ft['properties']['name'],seed,keep)
    print(f'river-{i+1:02d}',ft['properties']['name'],len(keep),seed,riv.loc[seed,'UPLAND_SKM'])
pickle.dump((seeds,),open('out/seeds.pkl','wb'))
