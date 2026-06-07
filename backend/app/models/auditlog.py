from datetime import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey, Text, text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "auditlog"

    audit_log_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("app_user.user_id"), nullable=False)
    case_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cases.case_id"), nullable=True)
    incident_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("incident.incident_id"), nullable=True)
    evidence_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("evidence.evidence_id"), nullable=True)
    export_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    action_timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
