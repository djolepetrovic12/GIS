import pandas as pd
import xml.etree.ElementTree as ET
from sqlalchemy import create_engine
import geopandas as gpd

DB_NAME = "sumo_db"
DB_USER = "postgres" 
DB_PASS = "Petsre971$$$"
DB_HOST = "localhost" 
DB_PORT = "5432" 

engine = create_engine(
     f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}" 
)

print("Parsing FCD XML...")

tree = ET.parse("fcd.xml")
root = tree.getroot()

rows = []

for timestep in root.findall("timestep"):
    time = float(timestep.attrib["time"])

    for v in timestep.findall("vehicle"):
        rows.append({
            "vehicle_id": v.attrib.get("id"),
            "time": time,
            "x": float(v.attrib.get("x")),
            "y": float(v.attrib.get("y")),
            "angle": float(v.attrib.get("angle", 0)),
            "type": v.attrib.get("type"),
            "speed": float(v.attrib.get("speed", 0)),
            "pos": float(v.attrib.get("pos", 0)),
            "lane": v.attrib.get("lane"),
            "slope": float(v.attrib.get("slope", 0))
        })

df_fcd = pd.DataFrame(rows)

print(f"FCD rows: {len(df_fcd)}")

gdf_fcd = gpd.GeoDataFrame(
    df_fcd,
    geometry=gpd.points_from_xy(df_fcd.x, df_fcd.y),
    crs="EPSG:3857"
)

gdf_fcd = gdf_fcd.rename_geometry("geom")

print("Writing FCD to PostGIS...")

gdf_fcd.to_postgis(
    "fcd_tracks",
    engine,
    if_exists="replace",
    index=False
)

print("Parsing Emissions XML...")

tree = ET.parse("emissions.xml")
root = tree.getroot()

rows = []

for timestep in root.findall("timestep"):
    time = float(timestep.attrib["time"])

    for v in timestep.findall("vehicle"):
        rows.append({
            "vehicle_id": v.attrib.get("id"),
            "time": time,
            "type": v.attrib.get("type"),
            "lane": v.attrib.get("lane"),
            "route": v.attrib.get("route"),
            "x": float(v.attrib.get("x", 0)),
            "y": float(v.attrib.get("y", 0)),
            "speed": float(v.attrib.get("speed", 0)),
            "pos": float(v.attrib.get("pos", 0)),
            "angle": float(v.attrib.get("angle", 0)),
            "waiting": float(v.attrib.get("waiting", 0)),
            "CO2": float(v.attrib.get("CO2", 0)),
            "CO": float(v.attrib.get("CO", 0)),
            "HC": float(v.attrib.get("HC", 0)),
            "NOx": float(v.attrib.get("NOx", 0)),
            "PMx": float(v.attrib.get("PMx", 0)),
            "fuel": float(v.attrib.get("fuel", 0)),
            "electricity": float(v.attrib.get("electricity", 0)),
            "noise": float(v.attrib.get("noise", 0)),
            "eclass": v.attrib.get("eclass")
        })

df_em = pd.DataFrame(rows)

print(f"Emission rows: {len(df_em)}")

print("Writing emissions to PostGIS...")

df_em.to_sql(
    "vehicle_emissions",
    engine,
    if_exists="replace",
    index=False
)

print("Full datasets loaded into PostGIS")