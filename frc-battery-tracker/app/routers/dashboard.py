from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.models import Battery, Event, Competition
from app.models.schemas import BatterySummary, IRDataPoint
from app.config import settings

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _compute_status(ir: float | None) -> str:
    if ir is None:
        return "unknown"
    if ir >= settings.ir_retire_threshold:
        return "retire"
    if ir >= settings.ir_warn_threshold:
        return "warn"
    return "good"


@router.get("/", response_model=list[BatterySummary])
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    """Returns all batteries with their latest health stats."""

    # Get all batteries
    batteries_result = await db.execute(select(Battery).order_by(Battery.label))
    batteries = batteries_result.scalars().all()

    active_comp_result = await db.execute(select(Competition).where(Competition.active == True))
    active_competition = active_comp_result.scalar_one_or_none()

    summaries = []
    for battery in batteries:
        # Count events by type
        counts_result = await db.execute(
            select(
                Event.event_type,
                func.count(Event.id).label("cnt")
            )
            .where(Event.battery_id == battery.id)
            .group_by(Event.event_type)
        )
        counts = {row.event_type: row.cnt for row in counts_result}

        # Latest beak_check
        latest_beak = await db.execute(
            select(Event)
            .where(Event.battery_id == battery.id, Event.event_type == "beak_check")
            .order_by(Event.created_at.desc())
            .limit(1)
        )
        beak = latest_beak.scalar_one_or_none()

        summaries.append(BatterySummary(
            battery=battery,
            latest_voltage=float(beak.voltage) if beak and beak.voltage else None,
            latest_ir=float(beak.internal_resistance) if beak and beak.internal_resistance else None,
            charge_cycles=counts.get("charge", 0),
            match_uses=counts.get("match", 0),
            practice_uses=counts.get("practice", 0),
            competition_match_uses=0,
            competition_charge_cycles=0,
            status=_compute_status(float(beak.internal_resistance) if beak and beak.internal_resistance else None),
            last_checked=beak.created_at if beak else None,
        ))

    if active_competition:
        for summary in summaries:
            charge_predicates = [
                Event.battery_id == summary.battery.id,
                Event.event_type == "charge",
            ]
            if active_competition.start_date is not None:
                charge_predicates.append(Event.created_at >= active_competition.start_date)
            else:
                charge_predicates.append(Event.competition_id == active_competition.id)

            competition_charge_result = await db.execute(
                select(func.count(Event.id)).where(*charge_predicates)
            )

            competition_counts_result = await db.execute(
                select(
                    Event.event_type,
                    func.count(Event.id).label("cnt")
                )
                .where(
                    Event.battery_id == summary.battery.id,
                    Event.competition_id == active_competition.id,
                    Event.event_type.in_(["match", "charge"]),
                )
                .group_by(Event.event_type)
            )
            competition_counts = {row.event_type: row.cnt for row in competition_counts_result}
            summary.competition_match_uses = competition_counts.get("match", 0)
            summary.competition_charge_cycles = competition_charge_result.scalar() or 0

    # Sort: retire first, then warn, then good, then unknown
    order = {"retire": 0, "warn": 1, "good": 2, "unknown": 3}
    summaries.sort(key=lambda s: order[s.status])
    return summaries


@router.get("/battery/{battery_id}/ir-trend", response_model=list[IRDataPoint])
async def get_ir_trend(battery_id: int, db: AsyncSession = Depends(get_db)):
    """Returns IR readings over time for charting a single battery."""
    result = await db.execute(
        select(Event.internal_resistance, Event.created_at)
        .where(
            Event.battery_id == battery_id,
            Event.event_type == "beak_check",
            Event.internal_resistance.is_not(None),
        )
        .order_by(Event.created_at.asc())
    )
    return [
        IRDataPoint(ir=float(row.internal_resistance), recorded_at=row.created_at)
        for row in result
    ]


@router.get("/stats")
async def get_fleet_stats(db: AsyncSession = Depends(get_db)):
    """High level fleet summary."""
    total = await db.execute(select(func.count(Battery.id)))
    active = await db.execute(select(func.count(Battery.id)).where(Battery.retired == False))
    retired = await db.execute(select(func.count(Battery.id)).where(Battery.retired == True))
    total_events = await db.execute(select(func.count(Event.id)))

    return {
        "total_batteries": total.scalar(),
        "active_batteries": active.scalar(),
        "retired_batteries": retired.scalar(),
        "total_events_logged": total_events.scalar(),
    }
