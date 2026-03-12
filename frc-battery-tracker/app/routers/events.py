from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import Battery, Event, Robot, Competition
from app.models.schemas import EventCreate, EventResponse

router = APIRouter(prefix="/batteries/{battery_id}/events", tags=["events"])


async def _get_battery_or_404(battery_id: int, db: AsyncSession) -> Battery:
    battery = await db.get(Battery, battery_id)
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")
    return battery


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def log_event(battery_id: int, payload: EventCreate, db: AsyncSession = Depends(get_db)):
    battery = await _get_battery_or_404(battery_id, db)

    if payload.robot_id is not None:
        robot = await db.get(Robot, payload.robot_id)
        if not robot:
            raise HTTPException(status_code=404, detail="Robot not found")

    if payload.competition_id is not None:
        competition = await db.get(Competition, payload.competition_id)
        if not competition:
            raise HTTPException(status_code=404, detail="Competition not found")

    # Validate match events have required fields.
    if payload.event_type == "match":
        if payload.match_number is None:
            raise HTTPException(
                status_code=422,
                detail="match events require match_number",
            )
        if payload.robot_id is None:
            raise HTTPException(
                status_code=422,
                detail="match events require robot_id",
            )

    # Validate beak_check has at least one voltage reading or IR.
    if (
        payload.event_type == "beak_check"
        and payload.voltage is None
        and payload.voltage_0a is None
        and payload.voltage_1a is None
        and payload.voltage_18a is None
        and payload.internal_resistance is None
    ):
        raise HTTPException(
            status_code=422,
            detail="beak_check events require a voltage reading or internal_resistance",
        )

    event_data = payload.model_dump()
    # Keep legacy voltage populated from 0A for backward compatibility.
    if payload.voltage_0a is not None:
        event_data["voltage"] = payload.voltage_0a

    event = Event(battery_id=battery.id, **event_data)
    db.add(event)

    # Auto-retire if event type is retired
    if payload.event_type == "retired":
        battery.retired = True

    # Auto-update rotation status, but do not override very recent manual updates.
    now = datetime.now(timezone.utc)
    recent_manual_update = (
        battery.rotation_updated_at is not None
        and (now - battery.rotation_updated_at).total_seconds() < 60
    )
    if not recent_manual_update:
        if payload.event_type == "charge":
            if battery.rotation_status != "charging":
                battery.rotation_status = "charging"
                battery.rotation_updated_at = now
        elif payload.event_type in ("match", "practice"):
            if battery.rotation_status != "in_use":
                battery.rotation_status = "in_use"
                battery.rotation_updated_at = now

    await db.commit()
    await db.refresh(event)
    result = await db.execute(
        select(Event)
        .where(Event.id == event.id)
        .options(selectinload(Event.robot), selectinload(Event.competition))
    )
    return result.scalar_one()


@router.get("/", response_model=list[EventResponse])
async def get_events(
    battery_id: int,
    event_type: str | None = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    await _get_battery_or_404(battery_id, db)
    query = (
        select(Event)
        .where(Event.battery_id == battery_id)
        .options(selectinload(Event.robot), selectinload(Event.competition))
    )
    if event_type:
        query = query.where(Event.event_type == event_type)
    query = query.order_by(Event.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
