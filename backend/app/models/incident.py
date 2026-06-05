import enum
from datetime import date, time
from sqlalchemy import String, Date, Integer, ForeignKey, Time, Boolean, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class IncidentType(str, enum.Enum):
    verbal        = "verbal"
    physical      = "physical"
    psychological = "psychological"
    financial     = "financial"
    sexual        = "sexual"
    stalking      = "stalking"
    other         = "other"

class Incident(Base):
    __tablename__ = "incident"

    incident_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("cases.case_id"), nullable=False)
    incident_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    incident_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    incident_type: Mapped[IncidentType | None] = mapped_column(Enum(IncidentType, native_enum=False), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    creation_date: Mapped[date] = mapped_column(Date, server_default="CURRENT_DATE")