import os
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import PlanRequest, PlanResponse
from planner import plan_workflow

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("flow.main")

app = FastAPI(
    title="Flow API",
    description="Agentic creative workflow graph planner for HexCoded",
    version="1.0.0",
)

# CORS configuration: allow local dev frontend ports, Vercel deployments, and custom env origins
origins_env = os.getenv("CORS_ORIGINS", "")
parsed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]

default_origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

allowed_origins = list(set(default_origins + parsed_origins))
is_wildcard = "*" in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if is_wildcard else allowed_origins,
    allow_origin_regex=None if is_wildcard else r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$|^https?://.*\.vercel\.app$",
    allow_credentials=False if is_wildcard else True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/health")
def health_check():
    has_groq = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "healthy",
        "service": "flow-backend",
        "groq_configured": has_groq,
    }


@app.post("/plan", response_model=PlanResponse)
def create_plan(req: PlanRequest):
    brief = req.brief.strip()
    if not brief:
        raise HTTPException(status_code=400, detail="Brief cannot be empty.")
    
    logger.info(f"Received creative brief: {brief} (mode: {req.mode})")
    try:
        response = plan_workflow(brief, mode=req.mode)
        return response
    except Exception as e:
        logger.error(f"Failed to generate workflow plan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate workflow plan.")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
