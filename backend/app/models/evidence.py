from datetime import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Evidence(Base):
    __tablename__ = "evidence"

    evidence_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[int] = mapped_column(Integer, ForeignKey("incident.incident_id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("app_user.user_id"), nullable=False)
    evidence_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("evidencetype.evidence_type_id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    evidence_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    evidence_imei: Mapped[str | None] = mapped_column(String(50), nullable=True)
    evidence_device: Mapped[str | None] = mapped_column(String(100), nullable=True)
    evidence_activation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)  # path in MinIO
    file_hash: Mapped[str] = mapped_column(String(500), nullable=False)  # HMAC-SHA-256
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default="CURRENT_TIMESTAMP")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

# encryption: Mapped["Encryption"] = relationship("Encryption", uselist=False, back_populates="evidence")