# import os
# import matplotlib.pyplot as plt
# from utils.raster_utils import load_planet_image
# from utils.detection_utils import (
#     enhance_image, detect_vessels, draw_detections, contours_to_geojson, fetch_latest_planet_scene, download_planet_image 
# )

# # --- File Paths ---
# # image_path = "data/planetscope_image.tif"

# geometry = [[
#     [103.54896588,1.2119135],[103.58151577,1.2119135],[103.58151577,1.25106345],[103.54896588,1.25106345],[103.54896588,1.2119135]
# ]]

# start_date = "2025-07-20"
# end_date = "2025-07-20"
# api_key = "PLAK523d3adce4c140489a3047ebc8cc7564"
# scene_id, item_type = fetch_latest_planet_scene(api_key, start_date, end_date, geometry, cloud_cover_threshold=0.3)

# image_path = "data/planetscope_image2.tif"
# output_image = "output/preview2.png"
# output_geojson = "output/detected_vessels2.geojson"

# # 👇 Use your existing function to download the image
# download_planet_image(api_key, scene_id, item_type=item_type, asset_type="ortho_visual", output_path=image_path)

# rgb, transform, crs = load_planet_image(image_path)
# enhanced = enhance_image(rgb)
# contours = detect_vessels(enhanced)

# print(f"✅ Vessels detected: {len(contours)}")

# draw_detections(enhanced, contours, output_path=output_image)
# contours_to_geojson(contours, transform, crs, output_geojson,mongo_uri="mongodb+srv://Krishna:Rajput9739@cluster0.9ojo45s.mongodb.net/",mongo_db="React_Native",mongo_collection="detected_vessels")

# print(f"📦 Results saved to: {output_image} and {output_geojson}")

import os
from typing import Any, List

# main.py (FastAPI app)
from fastapi import FastAPI, HTTPException
from pydantic import Field, BaseModel, ConfigDict
import asyncio
from detection_runner import run_detection
from typing import Literal, Any, List
from datetime import date, datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId  # To convert IDs
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_core import core_schema
# --- Custom ObjectId validator for Pydantic v2 ---

from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi import Body, status

# Admin: transform ObjectId to str for JSON
def oid_to_str(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, source, handler):
        def validate(value):
            if isinstance(value, ObjectId):
                return value
            if isinstance(value, str) and ObjectId.is_valid(value):
                return ObjectId(value)
            raise ValueError("Invalid ObjectId")
        return core_schema.no_info_plain_validator_function(
            function=validate,
            serialization=core_schema.to_string_ser_schema()
        )
    
# -------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------

class Settings(BaseSettings):
    mongo_uri: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()

# -------------------------------------------------------------------
# FastAPI app & lifecycles
# -------------------------------------------------------------------

app = FastAPI(title="Maritime AOI & Detection API")

@app.on_event("startup")
async def startup_db():
    try:
        app.state.mongodb_client = AsyncIOMotorClient(settings.mongo_uri)
        # If your URI includes a database name path (mongodb://.../mydb),
        # you can get it like this; otherwise set manually:
        db_name = app.state.mongodb_client.get_default_database().name  # noqa
        app.state.mongodb = app.state.mongodb_client[db_name]
    except Exception as e:
        raise RuntimeError(f"Failed to connect to MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db():
    app.state.mongodb_client.close()


# Optional: enable CORS if frontend runs on a different origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Pydantic models & utility
# -------------------------------------------------------------------

class AOIPolygon(BaseModel):
    id: PyObjectId = Field(alias="_id")
    type: Literal["FeatureCollection"]
    features: list[Any]
    date: datetime
    place: str

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )

# Request model for vessel detection
class DetectionRequest(BaseModel):
    file_name: str
    date: date
    geometry: list[Any]

# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------
@app.post("/api/detect-vessels", summary="Run detection and return vessel data")
async def detect_vessels(
    req: DetectionRequest,
    fastdb = Depends(lambda: app.state.mongodb)
):
    # Set start_date and end_date to the same value from the request
    start_date = end_date = req.date

    # Preserve both file name formats
    base_file_name = req.file_name  # without .tif
    tif_file_name = f"{base_file_name}.tif"

    try:
        await asyncio.to_thread(
            run_detection,
            file_name=tif_file_name,
            start_date=start_date,
            end_date=end_date,
            geometry=req.geometry,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {e}")

    # Fetch data from the database
    det_col = fastdb.get_collection("detected_vessels")
    pts_col = fastdb.get_collection("AOIvessels")
    raw_polys = await det_col.find({}).to_list(length=None)
    raw_pts = await pts_col.find({"place": base_file_name}).to_list(length=None)

    polys = [oid_to_str(doc) for doc in raw_polys]
    points = [oid_to_str(doc) for doc in raw_pts]

    return {
        "polygons": polys,
        "points": points,
        "metadata": {
            "date": req.date.isoformat(),
            "file_name": req.file_name,
            "polygon_count": len(polys),
            "point_count": len(points),
        }
    }

@app.get("/api/planets/get-AOI-polygons", response_model=List[AOIPolygon])
async def get_aoi_polygons():
    collection = app.state.mongodb["AOIpolygon"]
    docs = await collection.find({}, {"_id": 1, "type": 1, "features": 1, "date": 1, "place": 1}).to_list(length=None)
    return docs

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/api/login")
async def login_user(user: UserLogin, fastdb=Depends(lambda: app.state.mongodb)):
    users_col = fastdb.get_collection("accounts")
    user_doc = await users_col.find_one({"email": user.email})

    if not user_doc:
        raise HTTPException(status_code=400, detail="Email not found")

    if not verify_password(user.password, user_doc["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    # Login successful
    return {
        "message": "Login successful",
        "user_id": str(user_doc["_id"]),
        "email": user_doc["email"]
    }

@app.post("/api/reset-password")
async def reset_password(email: str, new_password: str, fastdb=Depends(lambda: app.state.mongodb)):
    users_col = fastdb.get_collection("accounts")
    user_doc = await users_col.find_one({"email": email})

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    hashed_pw = pwd_context.hash(new_password)

    await users_col.update_one({"email": email}, {"$set": {"password": hashed_pw}})
    return {"message": f"Password updated for {email}"}



class APIKeyModel(BaseModel):
    source: str
    key: str

@app.get("/api/maritime-api-key/planet", response_model=APIKeyModel)
async def get_maritime_api_key(
    fastdb=Depends(lambda: app.state.mongodb)
):
    coll = fastdb.get_collection("maritimeapikey")
    doc = await coll.find_one({})
    if not doc:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"source": doc["source"], "key": doc["key"]}

@app.post("/api/update-maritime-api-key")
async def update_maritime_api_key(
    data: dict = Body(...),
    fastdb=Depends(lambda: app.state.mongodb)
):
    api_key = data.get("key")
    source = data.get("source")

  

    config_col = fastdb.get_collection("maritimeapikey")
    result = await config_col.update_one(
        {"source": source},
        {"$set": {"key": api_key}},
        upsert=True
    )

    if result.acknowledged:
        return {"message": "API Key updated successfully"}
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Failed to update API key"}
        )

