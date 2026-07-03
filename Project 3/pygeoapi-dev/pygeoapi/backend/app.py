from flask import Flask, send_from_directory, jsonify, request
from raster import generate_raster_once
import requests
from shapely.geometry import shape
from shapely.ops import transform
from pyproj import Transformer
from flask_cors import CORS

app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    allow_headers=["Content-Type"],
    methods=["GET", "POST", "OPTIONS"]
)

generate_raster_once()

@app.route("/raster-image")
def raster_image():
    return send_from_directory("static", "drought_map.png")



# @app.route("/raster-bounds")
# def raster_bounds():

#     raster_path = BASE_DIR / "drought_map.tiff"

#     with rasterio.open(raster_path) as src:
#         return {
#             "bounds": list(src.bounds),
#             "crs": str(src.crs)
#         }


transformer = Transformer.from_crs(
    "EPSG:4326",
    "EPSG:28992",
    always_xy=True
)

def to_rd(geom):
    return transform(transformer.transform, geom)


@app.route("/schools-near-waterways")
def schools_near_waterways():

    distance = float(
        request.args.get("distance", 100)
    )

    schools = requests.get(
        "http://localhost:5000/collections/schools/items?limit=10000"
    ).json()

    waterways = requests.get(
        "http://localhost:5000/collections/waterways/items?limit=10000"
    ).json()

    waterway_geometries = []

    for feature in waterways["features"]:

        geom = shape(feature["geometry"])
        geom = to_rd(geom)

        waterway_geometries.append(geom)

    result_features = []

    for school in schools["features"]:

        school_geom = shape(
            school["geometry"]
        )

        school_geom = to_rd(
            school_geom
        )

        for waterway in waterway_geometries:

            if school_geom.distance(waterway) <= distance:

                result_features.append(
                    school
                )

                break

    return jsonify({
        "type": "FeatureCollection",
        "features": result_features
    })

@app.route("/roads-maxspeed")
def roads_maxspeed():

    min_speed = int(request.args.get("min_speed", 50))

    roads = requests.get(
        "http://localhost:5000/collections/roads/items?limit=10000"
    ).json()

    result_features = []

    for road in roads["features"]:

        props = road.get("properties", {})
        maxspeed = props.get("max_speed")

        #dodato za svaki slučaj da ne dođe do greške ako maxspeed nema podatke
        if maxspeed is None:
            continue

        try:
            #ovo je za hendlovanje stringova u koloni u slučaju da nije samo zapisan broj, nego i npr. "50 km/h"
            if isinstance(maxspeed, str):
                maxspeed = maxspeed.lower().replace("km/h", "").strip()

            speed_value = int(float(maxspeed))

        except:
            continue

        if speed_value >= min_speed:
            result_features.append(road)

    return jsonify({
        "type": "FeatureCollection",
        "features": result_features
    })



if __name__ == "__main__":
    app.run(debug=True, port=5001)

