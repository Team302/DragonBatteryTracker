from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


EventType = Literal["charge", "match", "practice", "beak_check", "incident", "retired"]
RotationStatus = Literal["ready", "charging", "in_use", "cool_down"]


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
    rotation_status: str
    rotation_updated_at: Optional[datetime]
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


# ── Competition schemas ───────────────────────────────────────────

class CompetitionCreate(BaseModel):
    name: str
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None


class CompetitionUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    active: Optional[bool] = None
    notes: Optional[str] = None


class CompetitionResponse(BaseModel):
    id: int
    name: str
    location: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    active: bool
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class BatteryRotationUpdate(BaseModel):
    rotation_status: RotationStatus


# ── Event schemas ─────────────────────────────────────────────────

class EventCreate(BaseModel):
    event_type: EventType
    voltage: Optional[float] = Field(None, ge=0, le=20)
    voltage_0a: Optional[float] = Field(None, ge=0, le=20)
    voltage_1a: Optional[float] = Field(None, ge=0, le=20)
    voltage_18a: Optional[float] = Field(None, ge=0, le=20)
    internal_resistance: Optional[float] = Field(None, ge=0, le=1000)
    match_number: Optional[int] = Field(None, ge=1)
    logged_by: Optional[str] = None
    notes: Optional[str] = None
    robot_id: Optional[int] = None
    competition_id: Optional[int] = None


class EventResponse(BaseModel):
    id: int
    battery_id: int
    event_type: str
    voltage: Optional[float]
    voltage_0a: Optional[float]
    voltage_1a: Optional[float]
    voltage_18a: Optional[float]
    internal_resistance: Optional[float]
    match_number: Optional[int]
    logged_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    robot_id: Optional[int]
    competition_id: Optional[int]
    robot: Optional[RobotResponse] = None
    competition: Optional[CompetitionResponse] = None

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
    competition_match_uses: int
    competition_charge_cycles: int
    status: str  # good | warn | retire | unknown
    last_checked: Optional[datetime]


class CompetitionBatterySummary(BaseModel):
    battery_id: int
    battery_label: str
    match_count: int
    charge_count: int
    latest_ir: Optional[float]
    min_voltage: Optional[float]
    status: str


class IRDataPoint(BaseModel):
    ir: float
    recorded_at: datetime
