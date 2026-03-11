from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


EventType = Literal["charge", "match", "practice", "beak_check", "incident", "retired"]


# ── Battery schemas ──────────────────────────────────────────────

class BatteryCreate(BaseModel):
    label: str = Field(..., max_length=50, examples=["BAT-01"])
    nfc_uid: Optional[str] = None
    purchased: Optional[datetime] = None
    manufacturer: Optional[str] = None
    capacity_ah: Optional[float] = None
    notes: Optional[str] = None


class BatteryUpdate(BaseModel):
    label: Optional[str] = None
    nfc_uid: Optional[str] = None
    purchased: Optional[datetime] = None
    manufacturer: Optional[str] = None
    capacity_ah: Optional[float] = None
    notes: Optional[str] = None
    retired: Optional[bool] = None


class BatteryResponse(BaseModel):
    id: int
    label: str
    nfc_uid: Optional[str]
    purchased: Optional[datetime]
    manufacturer: Optional[str]
    capacity_ah: Optional[float]
    notes: Optional[str]
    retired: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Robot schemas ─────────────────────────────────────────────────

RobotType = Literal["alpha", "beta", "sled"]


class RobotCreate(BaseModel):
    number: int
    name: str
    robot_type: RobotType
    active: bool = True
    notes: Optional[str] = None


class RobotUpdate(BaseModel):
    number: Optional[int] = None
    name: Optional[str] = None
    robot_type: Optional[RobotType] = None
    active: Optional[bool] = None
    notes: Optional[str] = None


class RobotResponse(BaseModel):
    id: int
    number: int
    name: str
    robot_type: str
    active: bool
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Event schemas ─────────────────────────────────────────────────

class EventCreate(BaseModel):
    event_type: EventType
    voltage: Optional[float] = Field(None, ge=0, le=20)
    internal_resistance: Optional[float] = Field(None, ge=0, le=1000)
    match_number: Optional[int] = Field(None, ge=1)
    logged_by: Optional[str] = None
    notes: Optional[str] = None
    robot_id: Optional[int] = None


class EventResponse(BaseModel):
    id: int
    battery_id: int
    event_type: str
    voltage: Optional[float]
    internal_resistance: Optional[float]
    match_number: Optional[int]
    logged_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    robot_id: Optional[int]
    robot: Optional[RobotResponse] = None

    model_config = {"from_attributes": True}


# ── Dashboard schemas ─────────────────────────────────────────────

class BatteryStatus(BaseModel):
    """Computed health status string."""
    label: str  # good | warn | retire | unknown


class BatterySummary(BaseModel):
    battery: BatteryResponse
    latest_voltage: Optional[float]
    latest_ir: Optional[float]
    charge_cycles: int
    match_uses: int
    practice_uses: int
    status: str  # good | warn | retire | unknown
    last_checked: Optional[datetime]


class IRDataPoint(BaseModel):
    ir: float
    recorded_at: datetime
