from datetime import datetime, timezone
import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import Battery, Event
from app.models.schemas import BatteryCreate, BatteryUpdate, BatteryResponse, BatteryRotationUpdate

router = APIRouter(prefix="/batteries", tags=["batteries"])


@router.post("/", response_model=BatteryResponse, status_code=status.HTTP_201_CREATED)
async def create_battery(payload: BatteryCreate, db: AsyncSession = Depends(get_db)):
    # Check for duplicate label
    existing = await db.execute(select(Battery).where(Battery.label == payload.label))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Battery with label '{payload.label}' already exists")

    battery = Battery(**payload.model_dump())
    db.add(battery)
    await db.commit()
    await db.refresh(battery)
    return battery


@router.get("/", response_model=list[BatteryResponse])
async def list_batteries(retired: bool | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Battery)
    if retired is not None:
        query = query.where(Battery.retired == retired)
    result = await db.execute(query.order_by(Battery.label))
    return result.scalars().all()


@router.get("/export/csv")
async def export_batteries_csv(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Battery).order_by(Battery.label))
    batteries = result.scalars().all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id",
        "label",
        "nfc_uid",
        "purchased",
        "manufacturer",
        "battery_model",
        "capacity_ah",
        "notes",
        "bad_cells",
        "comp_battery",
        "retired",
        "rotation_status",
        "rotation_updated_at",
        "created_at",
    ])

    for b in batteries:
        writer.writerow([
            b.id,
            b.label,
            b.nfc_uid or "",
            b.purchased.isoformat() if b.purchased else "",
            b.manufacturer or "",
            b.battery_model or "",
            b.capacity_ah if b.capacity_ah is not None else "",
            b.notes or "",
            b.bad_cells,
            b.comp_battery,
            b.retired,
            b.rotation_status,
            b.rotation_updated_at.isoformat() if b.rotation_updated_at else "",
            b.created_at.isoformat() if b.created_at else "",
        ])

    output.seek(0)
    filename = f"battery_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)


@router.get("/events/export/csv")
async def export_events_csv(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).order_by(Event.created_at.desc()))
    events = result.scalars().all()
    batteries_result = await db.execute(select(Battery.id, Battery.label))
    battery_labels = {row.id: row.label for row in batteries_result}

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id",
        "battery_id",
        "battery_label",
        "event_type",
        "created_at",
        "tested_on",
        "amp_hours",
        "watt_hours",
        "voltage",
        "voltage_0a",
        "voltage_1a",
        "voltage_18a",
        "internal_resistance",
        "beak_status",
        "charge_percent",
        "match_number",
        "logged_by",
        "notes",
        "robot_id",
        "competition_id",
    ])

    for e in events:
        writer.writerow([
            e.id,
            e.battery_id,
            battery_labels.get(e.battery_id, ""),
            e.event_type,
            e.created_at.isoformat() if e.created_at else "",
            e.tested_on.isoformat() if e.tested_on else "",
            e.amp_hours if e.amp_hours is not None else "",
            e.watt_hours if e.watt_hours is not None else "",
            e.voltage if e.voltage is not None else "",
            e.voltage_0a if e.voltage_0a is not None else "",
            e.voltage_1a if e.voltage_1a is not None else "",
            e.voltage_18a if e.voltage_18a is not None else "",
            e.internal_resistance if e.internal_resistance is not None else "",
            e.beak_status or "",
            e.charge_percent if e.charge_percent is not None else "",
            e.match_number if e.match_number is not None else "",
            e.logged_by or "",
            e.notes or "",
            e.robot_id if e.robot_id is not None else "",
            e.competition_id if e.competition_id is not None else "",
        ])

    output.seek(0)
    filename = f"battery_events_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)


@router.get("/{battery_id}", response_model=BatteryResponse)
async def get_battery(battery_id: int, db: AsyncSession = Depends(get_db)):
    battery = await db.get(Battery, battery_id)
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")
    return battery


@router.get("/nfc/{nfc_uid}", response_model=BatteryResponse)
async def get_battery_by_nfc(nfc_uid: str, db: AsyncSession = Depends(get_db)):
    """Called when an NFC tag is tapped. Looks up battery by tag UID."""
    result = await db.execute(select(Battery).where(Battery.nfc_uid == nfc_uid))
    battery = result.scalar_one_or_none()
    if not battery:
        raise HTTPException(status_code=404, detail="NFC tag not registered to any battery")
    return battery


@router.patch("/{battery_id}", response_model=BatteryResponse)
async def update_battery(battery_id: int, payload: BatteryUpdate, db: AsyncSession = Depends(get_db)):
    battery = await db.get(Battery, battery_id)
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(battery, field, value)
    await db.commit()
    await db.refresh(battery)
    return battery


@router.delete("/{battery_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_battery(battery_id: int, db: AsyncSession = Depends(get_db)):
    battery = await db.get(Battery, battery_id)
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")
    await db.delete(battery)
    await db.commit()


@router.patch("/{battery_id}/rotation", response_model=BatteryResponse)
async def update_rotation_status(
    battery_id: int,
    payload: BatteryRotationUpdate,
    db: AsyncSession = Depends(get_db),
):
    battery = await db.get(Battery, battery_id)
    if not battery:
        raise HTTPException(status_code=404, detail="Battery not found")

    battery.rotation_status = payload.rotation_status
    battery.rotation_updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(battery)
    return battery
