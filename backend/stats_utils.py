"""
Stats Utility Module

Reads and parses 'model_stats.json' to serve performance metrics to the frontend Dashboard.

TODO: After completing model training, execute the evaluation script outlined in the 
README.md (Dashboard section) inside your notebook to generate the production stats file.
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
STATS_PATH = BASE_DIR / "model_stats.json"


def load_stats() -> dict:
    """
    Loads and returns model evaluation statistics from model_stats.json.
    
    Raises:
        FileNotFoundError: If model_stats.json does not exist at the designated path.
    """
    if not STATS_PATH.exists():
        raise FileNotFoundError(
            f"Stats file not found at path: {STATS_PATH}"
        )
    with open(STATS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)