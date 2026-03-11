from datetime import datetime, timezone
from sqlalchemy import Integer, String, Boolean, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Battery(Base):
    __tablename__ = "batteries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # e.g. "BAT-01"
    nfc_uid: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    purchased: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    manufacturer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    capacity_ah: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    retired: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    events: Mapped[list["Event"]] = relationship("Event", back_populates="battery", order_by="Event.created_at")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    battery_id: Mapped[int] = mapped_column(Integer, ForeignKey("batteries.id"), nullable=False)

    # charge | match | practice | beak_check | incident | retired
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)

    voltage: Mapped[float | None] = mapped_column(Numeric(5, 3), nullable=True)          # volts
    internal_resistance: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)  # mΩ
    match_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    logged_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    battery: Mapped["Battery"] = relationship("Battery", back_populates="events")
