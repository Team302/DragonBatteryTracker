from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import Battery, Event
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

    # Validate beak_check has at least voltage or IR
    if payload.event_type == "beak_check" and payload.voltage is None and payload.internal_resistance is None:
        raise HTTPException(status_code=422, detail="beak_check events require voltage or internal_resistance")

    event = Event(battery_id=battery.id, **payload.model_dump())
    db.add(event)

    # Auto-retire if event type is retired
    if payload.event_type == "retired":
        battery.retired = True

    await db.commit()
    await db.refresh(event)
    result = await db.execute(
        select(Event).where(Event.id == event.id).options(selectinload(Event.robot))
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
        .options(selectinload(Event.robot))
    )
    if event_type:
        query = query.where(Event.event_type == event_type)
    query = query.order_by(Event.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
