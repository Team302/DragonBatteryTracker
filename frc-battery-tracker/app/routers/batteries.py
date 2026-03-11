from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import Battery
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
