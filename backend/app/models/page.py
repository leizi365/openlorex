from __future__ import annotations

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class Page(BaseModel):
    __tablename__ = "pages"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    parent_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("pages.id"),
        nullable=True,
        index=True,
    )
    container_page_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("pages.id"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="无标题")
    icon: Mapped[str | None] = mapped_column(String(32), nullable=True)
    cover_color: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[dict | list] = mapped_column(JSON, nullable=False, default=list)
    version: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=1,
        server_default="1",
    )
    is_public: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )

    @classmethod
    def generate_code(cls) -> str:
        return super().generate_code("p_")
