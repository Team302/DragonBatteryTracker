from datetime import datetime, timezone
from typing import Optional
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
    battery_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    capacity_ah: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    retired: Mapped[bool] = mapped_column(Boolean, default=False)
    rotation_status: Mapped[str] = mapped_column(String(50), default="ready")  # ready | charging | in_use | cool_down
    rotation_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    events: Mapped[list["Event"]] = relationship("Event", back_populates="battery", order_by="Event.created_at")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    battery_id: Mapped[int] = mapped_column(Integer, ForeignKey("batteries.id"), nullable=False)

    # charge | match | practice | beak_check | incident | retired
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)

    voltage: Mapped[float | None] = mapped_column(Numeric(5, 3), nullable=True)          # volts
    voltage_0a: Mapped[float | None] = mapped_column(Numeric(5, 3), nullable=True)
    voltage_1a: Mapped[float | None] = mapped_column(Numeric(5, 3), nullable=True)
    voltage_18a: Mapped[float | None] = mapped_column(Numeric(5, 3), nullable=True)
    internal_resistance: Mapped[float | None] = mapped_column(Numeric(7, 3), nullable=True)  # Ω
    beak_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # bad | fair | good
    charge_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)  # 0-100%
    match_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    logged_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    robot_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("robots.id"), nullable=True)
    competition_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("competitions.id"), nullable=True)

    battery: Mapped["Battery"] = relationship("Battery", back_populates="events")
    robot: Mapped[Optional["Robot"]] = relationship("Robot", back_populates="events")
    competition: Mapped[Optional["Competition"]] = relationship("Competition", back_populates="events")


class Robot(Base):
    __tablename__ = "robots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    robot_type: Mapped[str] = mapped_column(String(50), nullable=False)  # alpha | beta | sled
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    events: Mapped[list["Event"]] = relationship("Event", back_populates="robot")


class Competition(Base):
    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    events: Mapped[list["Event"]] = relationship("Event", back_populates="competition")
