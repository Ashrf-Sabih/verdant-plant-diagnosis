import json
import os
import logging
import requests
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(), override=True)
logger = logging.getLogger("PlantDiseaseAPI")

API_KEY = os.getenv("LLM_API_KEY")

def call_llm(disease_name: str) -> dict:
    if not API_KEY:
        raise ValueError("LLM_API_KEY is missing in your .env file!")

    readable_name = disease_name.replace("___", " - ").replace("_", " ")
    
    prompt = f"""You are an expert plant pathologist. Analyze the disease: "{readable_name}".
Return ONLY a valid JSON object with exactly these keys, and nothing else:
- "disease_summary": a 2-sentence description of the disease.
- "symptoms": an array of 2 bullet point strings.
- "treatment_steps": an array of 2 actionable treatment steps.
- "prevention_tips": an array of 2 prevention tips."""

    # تم التعديل لاستهداف أحدث موديل طلبته جوجل في الرسالة
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        if response.status_code != 200:
            logger.error(f"Google API Error [{response.status_code}]: {response.text}")
            raise Exception(f"API Error {response.status_code}: {response.text}")

        data = response.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        return json.loads(raw_text.strip())
        
    except Exception as err:
        logger.error(f"Failed to fetch from Gemini API: {str(err)}")
        return {
            "disease_summary": f"API Error: {str(err)}",
            "symptoms": ["Check API response logs."],
            "treatment_steps": ["Ensure model name matches active key permissions."],
            "prevention_tips": ["Verify internet connectivity."]
        }

async def call_llm_async(disease_name: str) -> dict:
    return call_llm(disease_name)