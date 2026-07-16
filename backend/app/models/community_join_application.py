from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class CommunityJoinApplication(BaseModel):
    __tablename__ = "community_join_applications"

    community_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("communities.id"),
        nullable=False,
        index=True,
    )
    applicant_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    @classmethod
    def generate_code(cls) -> str:
        return super().generate_code("cja_")
