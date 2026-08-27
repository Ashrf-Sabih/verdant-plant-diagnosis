"""
Model Utility Module

Responsibilities:
1. Load the trained CNN model into memory once during application startup (Singleton Pattern).
2. Preprocess user-uploaded image bytes into the expected model tensor shape (224x224x3).
3. Execute disease classification inference and format results (Confidence level & Top-3 predictions).

Setup Requirements:
    - Place the trained Keras model at: backend/model/plant_disease_model.keras
    - Update backend/class_names.json with ordered class labels from notebook training.
"""

import io
import json
from pathlib import Path

import numpy as np
from PIL import Image
import tensorflow as tf

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "plant_disease_model.keras"
CLASS_NAMES_PATH = BASE_DIR / "class_names.json"

IMG_SIZE = (224, 224)
CONFIDENCE_THRESHOLD = 0.60

_model = None
_class_names = None


def load_model():
    """Loads and caches the Keras model instance using Singleton Pattern."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model file missing at: {MODEL_PATH}\n"
                "Please place your trained model (.keras) inside backend/model/ "
                "and rename it to plant_disease_model.keras"
            )
        _model = tf.keras.models.load_model(MODEL_PATH)
    return _model


def load_class_names():
    """Loads and caches class labels from JSON configuration."""
    global _class_names
    if _class_names is None:
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
            _class_names = json.load(f)
        if "__PLACEHOLDER_CLASS_0__" in _class_names:
            raise ValueError(
                "Default placeholder detected in class_names.json. "
                "Please update backend/class_names.json with actual target class labels."
            )
    return _class_names


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Converts raw image bytes into preprocessed NumPy array formatted for EfficientNetB0 input."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize(IMG_SIZE)
    array = np.array(image, dtype=np.float32)
    array = np.expand_dims(array, axis=0)  # Shape: (1, 224, 224, 3)
    return array


def predict(image_bytes: bytes) -> dict:
    """Executes prediction workflow and returns result dict."""
    model = load_model()
    class_names = load_class_names()

    input_array = preprocess_image(image_bytes)
    predictions = model.predict(input_array, verbose=0)[0]

    top_index = int(np.argmax(predictions))
    top_confidence = float(predictions[top_index])

    top_3_indices = np.argsort(predictions)[-3:][::-1]
    top_3 = [
        {
            "class_name": class_names[i] if i < len(class_names) else f"Unknown_Class_{i}",
            "confidence": float(predictions[i])
        }
        for i in top_3_indices
    ]

    predicted_label = class_names[top_index] if top_index < len(class_names) else "Unknown"

    return {
        "predicted_class": predicted_label,
        "confidence": top_confidence,
        "is_confident": top_confidence >= CONFIDENCE_THRESHOLD,
        "top_3": top_3,
    }