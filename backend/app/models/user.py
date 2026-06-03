from datetime import date
from sqlalchemy import String, Date, Integer, Boolean, text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class User(Base):
    __tablename__ = "app_user"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[date] = mapped_column(Date, server_default=text("CURRENT_DATE"))
    account_status: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))