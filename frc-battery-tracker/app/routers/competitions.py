from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import Competition, Battery, Event
from app.models.schemas import (
    CompetitionCreate,
    CompetitionUpdate,
    CompetitionResponse,
    CompetitionBatterySummary,
)

router = APIRouter(prefix="/competitions", tags=["competitions"])


def _compute_status(ir: float | None) -> str:
    if ir is None:
        return "unknown"
    if ir >= 30:
        return "retire"
    if ir >= 22:
        return "warn"
    return "good"


@router.post("/", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
async def create_competition(payload: CompetitionCreate, db: AsyncSession = Depends(get_db)):
    competition = Competition(**payload.model_dump())
    db.add(competition)
    await db.commit()
    await db.refresh(competition)
    return competition


@router.get("/", response_model=list[CompetitionResponse])
async def list_competitions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Competition).order_by(Competition.created_at.desc()))
    return result.scalars().all()


@router.get("/active", response_model=CompetitionResponse)
async def get_active_competition(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Competition).where(Competition.active == True))
    competition = result.scalar_one_or_none()
    if not competition:
        raise HTTPException(status_code=404, detail="No active competition")
    return competition


@router.get("/{competition_id}", response_model=CompetitionResponse)
async def get_competition(competition_id: int, db: AsyncSession = Depends(get_db)):
    competition = await db.get(Competition, competition_id)
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")
    return competition


@router.patch("/{competition_id}", response_model=CompetitionResponse)
async def update_competition(competition_id: int, payload: CompetitionUpdate, db: AsyncSession = Depends(get_db)):
    competition = await db.get(Competition, competition_id)
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(competition, field, value)

    # Guard the one-active constraint if PATCH active=true was requested.
    if updates.get("active") is True:
        await db.execute(update(Competition).where(Competition.id != competition_id).values(active=False))

    await db.commit()
    await db.refresh(competition)
    return competition


@router.post("/{competition_id}/activate", response_model=CompetitionResponse)
async def activate_competition(competition_id: int, db: AsyncSession = Depends(get_db)):
    competition = await db.get(Competition, competition_id)
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    await db.execute(update(Competition).values(active=False))
    competition.active = True
    db.add(competition)
    await db.commit()
    await db.refresh(competition)
    return competition


@router.post("/{competition_id}/deactivate", response_model=CompetitionResponse)
async def deactivate_competition(competition_id: int, db: AsyncSession = Depends(get_db)):
    competition = await db.get(Competition, competition_id)
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    competition.active = False
    await db.commit()
    await db.refresh(competition)
    return competition


@router.get("/{competition_id}/summary", response_model=list[CompetitionBatterySummary])
async def get_competition_summary(competition_id: int, db: AsyncSession = Depends(get_db)):
    competition = await db.get(Competition, competition_id)
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    beak_where = and_(
        Event.competition_id == competition_id,
        Event.event_type == "beak_check",
    )
    min_voltage_expr = func.min(
        case(
            (Event.voltage_18a.is_not(None), Event.voltage_18a),
            (Event.voltage_1a.is_not(None), Event.voltage_1a),
            else_=func.coalesce(Event.voltage_0a, Event.voltage),
        )
    )

    result = await db.execute(
        select(
            Battery.id.label("battery_id"),
            Battery.label.label("battery_label"),
            func.count(case((and_(Event.event_type == "match", Event.competition_id == competition_id), 1))).label("match_count"),
            func.count(case((and_(Event.event_type == "charge", Event.competition_id == competition_id), 1))).label("charge_count"),
            min_voltage_expr.label("min_voltage"),
        )
        .select_from(Battery)
        .join(Event, Event.battery_id == Battery.id, isouter=True)
        .group_by(Battery.id, Battery.label)
        .order_by(func.count(case((and_(Event.event_type == "match", Event.competition_id == competition_id), 1))).desc(), Battery.label.asc())
    )

    rows = result.all()
    summaries = []
    for row in rows:
        latest_ir_result = await db.execute(
            select(Event.internal_resistance)
            .where(
                Event.battery_id == row.battery_id,
                Event.competition_id == competition_id,
                Event.event_type == "beak_check",
                Event.internal_resistance.is_not(None),
            )
            .order_by(Event.created_at.desc())
            .limit(1)
        )
        latest_ir = latest_ir_result.scalar_one_or_none()

        summaries.append(
            CompetitionBatterySummary(
                battery_id=row.battery_id,
                battery_label=row.battery_label,
                match_count=row.match_count or 0,
                charge_count=row.charge_count or 0,
                latest_ir=float(latest_ir) if latest_ir is not None else None,
                min_voltage=float(row.min_voltage) if row.min_voltage is not None else None,
                status=_compute_status(float(latest_ir) if latest_ir is not None else None),
            )
        )

    return summaries
