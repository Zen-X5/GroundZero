import ee
import logging
from typing import Dict, Any

logger = logging.getLogger("GroundZeroAI.SatelliteMapper")

# Try to initialize Earth Engine. 
# This requires the user to have run `ee.Authenticate()` previously.
try:
    # Explicitly using the project ID you selected in Google Cloud
    ee.Initialize(project='disaster-relief-app-453908')
    logger.info("Earth Engine successfully initialized.")
except Exception as e:
    logger.warning(f"Earth Engine initialization failed (Authentication required): {e}")

def get_flood_mask_geojson(
    bbox: list = [90.5, 25.5, 95.5, 27.5],  # Full Assam flood region - multiple districts
    start_date: str = '2026-07-01',
    end_date: str = '2026-08-30'
) -> Dict[str, Any]:
    """
    Queries Sentinel-2 imagery, applies NDWI, classifies flood severity (DEEP/SHALLOW),
    and returns smoothed GeoJSON polygons + a live RGB tile URL.
    """
    try:
        roi = ee.Geometry.BBox(*bbox)

        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(roi)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80)))

        if collection.size().getInfo() == 0:
            logger.warning("No Sentinel-2 images found for this region/date range.")
            return {"type": "FeatureCollection", "features": []}

        image = collection.median().clip(roi)

        # Get the most recent imagery date for the UI stats panel
        latest_date = (collection.sort('system:time_start', False)
                       .first().date().format('YYYY-MM-dd').getInfo())

        # NDWI: (Green - NIR) / (Green + NIR)
        ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI')

        # Vectorize all water pixels (NDWI > 0.1)
        water_mask = ndwi.gt(0.1).selfMask()
        vectors = water_mask.reduceToVectors(
            geometry=roi,
            crs=image.projection(),
            scale=500,        # 500m scale for regional big-picture view
            geometryType='polygon',
            eightConnected=True,
            labelProperty='zone',
            bestEffort=True,
            maxPixels=1e9
        )

        # Classify each polygon as DEEP_FLOOD (NDWI > 0.3) or SHALLOW_FLOOD
        def classify_polygon(feature):
            ndwi_val = ndwi.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=feature.geometry(),
                scale=150
            ).get('NDWI')
            severity = ee.Algorithms.If(
                ee.Number(ndwi_val).gt(0.3), 'DEEP_FLOOD', 'SHALLOW_FLOOD'
            )
            return feature.set('severity', severity).set('ndwi_mean', ndwi_val)

        classified = vectors.map(classify_polygon)
        geojson_data = classified.getInfo()

        # Generate a live True Color (RGB) tile layer URL
        map_id_dict = image.getMapId({'min': 0, 'max': 3000, 'bands': ['B4', 'B3', 'B2']})
        geojson_data['tile_url'] = map_id_dict['tile_fetcher'].url_format
        geojson_data['imagery_date'] = latest_date
        geojson_data['polygon_count'] = len(geojson_data.get('features', []))

        logger.info(f"Flood mask ready: {geojson_data['polygon_count']} polygons, date: {latest_date}")
        return geojson_data

    except Exception as e:
        logger.error(f"Failed to generate satellite flood mask: {e}")
        return {"type": "FeatureCollection", "features": [], "error": str(e)}
