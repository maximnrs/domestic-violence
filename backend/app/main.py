from fastapi import FastAPI
from app.models import user
from app.controllers import auth as auth_controller

app = FastAPI(
    title="EviSafe API",
    description="Secure evidence management API for EviSafe",
    version="0.1.0"
)

app.include_router(auth_controller.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "EviSafe API is running"}