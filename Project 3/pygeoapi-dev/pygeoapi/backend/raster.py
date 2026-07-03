import rasterio
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

raster_path = BASE_DIR / "drought_map.tiff"
output_path = BASE_DIR / "static" / "drought_map.png"


def generate_raster_once():

    if output_path.exists():
        return

    with rasterio.open(raster_path) as src:
        band = src.read(1)

    plt.imsave(output_path, band, cmap="viridis")