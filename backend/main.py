"""
Main API Server.
Responsible for:
1. Receiving and validating image uploads from the frontend.
2. Passing the image to the CNN model (model_utils.py) for disease classification.
3. Querying the LLM (llm_utils.py) for disease details and treatment recommendations.
4. Returning the aggregated response to the frontend.

Run locally:
    uvicorn main:app --reload --port 8001
"""

import io
import logging
from typing import Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

import model_utils
import llm_utils
import stats_utils

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PlantDiseaseAPI")

app = FastAPI(
    title="Plant Disease Diagnosis API",
    description="API for plant disease detection using deep learning (CNN) and LLM recommendations.",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024 


@app.get("/", status_code=status.HTTP_200_OK)
def health_check() -> Dict[str, str]:
    """Health check endpoint to verify server status."""
    return {"status": "ok", "message": "Plant Disease API is running cleanly"}


@app.get("/model-stats")
def get_model_stats() -> Dict[str, Any]:
    """Returns model evaluation metrics for the frontend dashboard."""
    try:
        return stats_utils.load_stats()
    except FileNotFoundError as e:
        logger.error(f"Stats file not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Model evaluation metrics file is currently unavailable."
        )
    except Exception as e:
        logger.error(f"Unexpected error loading stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"An unexpected error occurred: {str(e)}"
        )


@app.post("/predict")
async def predict_disease(file: UploadFile = File(...)) -> Dict[str, Any]:
    # 1. Validate file MIME type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Uploaded file is not a valid image."
        )

    # 2. Read file bytes and check size
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 10 MB limit."
        )

    # 3. Verify image file integrity safely
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is corrupt or an unsupported image format."
        )

    # 4. Predict using the CNN model
    try:
        prediction = model_utils.predict(image_bytes)
    except FileNotFoundError as e:
        logger.error(f"Model file missing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Model file is missing on the server."
        )
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error analyzing image: {str(e)}"
        )

    top_3_response = [
        {"class_name": item["class_name"], "confidence": round(item["confidence"] * 100, 2)}
        for item in prediction.get("top_3", [])
    ]

    # 5. Low-confidence fallback handling
    if not prediction.get("is_confident", False):
        return {
            "predicted_class": None,
            "confidence": round(prediction["confidence"] * 100, 2),
            "is_confident": False,
            "top_3": top_3_response,
            "disease_info": {
                "disease_summary": (
                    "The model is not confident enough in this diagnosis. "
                    "Please upload a clearer, close-up image of the affected leaf "
                    "in good lighting with minimal background clutter."
                ),
                "symptoms": [],
                "treatment_steps": [],
                "prevention_tips": [],
            },
        }

    # 6. Fetch treatment details from LLM
    try:
        if hasattr(llm_utils, 'call_llm_async'):
            disease_info = await llm_utils.call_llm_async(prediction["predicted_class"])
        else:
            disease_info = llm_utils.call_llm(prediction["predicted_class"])
    except Exception as e:
        logger.error(f"LLM request failed: {str(e)}")
        disease_info = {
            "disease_summary": "Disease identified successfully, but guidance details are currently unavailable.",
            "symptoms": [],
            "treatment_steps": [],
            "prevention_tips": []
        }

    return {
        "predicted_class": prediction["predicted_class"],
        "confidence": round(prediction["confidence"] * 100, 2),
        "is_confident": True,
        "top_3": top_3_response,
        "disease_info": disease_info,
    }
