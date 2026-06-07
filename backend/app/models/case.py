from datetime import date
from sqlalchemy import String, Date, Integer, ForeignKey, Text, text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Case(Base):
    __tablename__ = "cases"

    case_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("app_user.user_id"), unique=True, nullable=False)
    case_title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    creation_date: Mapped[date] = mapped_column(Date, server_default=text("CURRENT_DATE"))
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
