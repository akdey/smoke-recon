import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.features.early_smoke.init_db import init_db
from app.features.early_smoke.dictionary import corporate_dict
from app.features.early_smoke.scheduler import start_scheduler, shutdown_scheduler
from app.features.early_smoke.router import router as early_smoke_router

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

app = FastAPI(
    title="Early Smoke Reconnaissance Engine API",
    description="Operational pipeline serverless engine for Indian SME/Mainboard IPO tracking.",
    version="1.0.0",
)

# Enable CORS for frontend dashboard local/production connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production security, allow all for Spaces
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    logger.info("Starting up FastAPI application...")

    # 1. Initialize SQLite Database & Tables
    init_db()

    # 2. Cache NSE/BSE corporate names in memory
    corporate_dict.load()

    # 3. Spin up background cron scheduler
    start_scheduler()

    logger.info("Application startup sequence completed successfully.")


@app.on_event("shutdown")
def shutdown_event():
    logger.info("Shutting down FastAPI application...")
    shutdown_scheduler()
    logger.info("Application shutdown sequence completed.")


from app.features.early_smoke.router import get_health
from app.db import get_db
from fastapi import Depends
from sqlalchemy.orm import Session

# Register routes
app.include_router(early_smoke_router)


# Register alias health endpoint at root level
@app.get("/api/health")
def api_health_alias(db: Session = Depends(get_db)):
    return get_health(db)
