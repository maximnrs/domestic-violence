import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import user, case, incident, evidence, encryption, evidencetype, auditlog
from app.controllers import auth as auth_controller
from app.controllers import cases as case_controller
from app.controllers import incident as incident_controller
from app.controllers import evidence as evidence_controller
from app.controllers import evidencetype as evidencetype_controller
from app.controllers import transcription as transcription_controller

app = FastAPI(
    title="Nura API",
    description="Secure evidence management API for Nura",
    version="0.1.0"
)

default_cors_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "https://evisafe.thijsvdweijer.nl",
    "https://legal-dashboard-evisafe.thijsvdweijer.nl",
]

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", ",".join(default_cors_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_controller.router)
app.include_router(case_controller.router)
app.include_router(incident_controller.router)
app.include_router(evidence_controller.router)
app.include_router(evidencetype_controller.router)
app.include_router(transcription_controller.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Nura API is running"}
