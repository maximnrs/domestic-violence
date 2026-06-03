from datetime import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Encryption(Base):
    __tablename__ = "encryption"

    crypto_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    evidence_id: Mapped[int] = mapped_column(Integer, ForeignKey("evidence.evidence_id"), nullable=False)
    aes_key_reference: Mapped[str] = mapped_column(String(500), nullable=False)  # path to key in OpenBao
    iv_nonce: Mapped[str] = mapped_column(String(255), nullable=False)  # base64 encoded IV
    hmac_hash: Mapped[str] = mapped_column(String(500), nullable=False)  # SHA-256 hash
    hmac_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    integrity_status: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 'verified' or 'tampered'
    downloaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

#    evidence: Mapped["Evidence"] = relationship("Evidence", back_populates="encryption")