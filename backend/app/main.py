from fastapi import FastAPI
from app.models import user, case, incident, evidence, encryption, evidencetype, auditlog
from app.controllers import auth as auth_controller
from app.controllers import cases as case_controller
from app.controllers import incident as incident_controller
from app.controllers import evidence as evidence_controller

app = FastAPI(
    title="Nura API",
    description="Secure evidence management API for Nura",
    version="0.1.0"
)

app.include_router(auth_controller.router)
app.include_router(case_controller.router)
app.include_router(incident_controller.router)
app.include_router(evidence_controller.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Nura API is running"}