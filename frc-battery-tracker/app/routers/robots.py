from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import Robot, Event
from app.models.schemas import RobotCreate, RobotUpdate, RobotResponse, EventResponse

router = APIRouter(prefix="/robots", tags=["robots"])


@router.post("/", response_model=RobotResponse, status_code=status.HTTP_201_CREATED)
async def create_robot(payload: RobotCreate, db: AsyncSession = Depends(get_db)):
    robot = Robot(**payload.model_dump())
    db.add(robot)
    await db.commit()
    await db.refresh(robot)
    return robot


@router.get("/", response_model=list[RobotResponse])
async def list_robots(active: bool | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Robot)
    if active is not None:
        query = query.where(Robot.active == active)
    result = await db.execute(query.order_by(Robot.number))
    return result.scalars().all()


@router.get("/{robot_id}", response_model=RobotResponse)
async def get_robot(robot_id: int, db: AsyncSession = Depends(get_db)):
    robot = await db.get(Robot, robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    return robot


@router.patch("/{robot_id}", response_model=RobotResponse)
async def update_robot(robot_id: int, payload: RobotUpdate, db: AsyncSession = Depends(get_db)):
    robot = await db.get(Robot, robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(robot, field, value)
    await db.commit()
    await db.refresh(robot)
    return robot


@router.delete("/{robot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_robot(robot_id: int, db: AsyncSession = Depends(get_db)):
    robot = await db.get(Robot, robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    await db.delete(robot)
    await db.commit()


@router.get("/{robot_id}/events", response_model=list[EventResponse])
async def get_robot_events(
    robot_id: int,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    robot = await db.get(Robot, robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    result = await db.execute(
        select(Event)
        .where(Event.robot_id == robot_id)
        .options(selectinload(Event.robot), selectinload(Event.competition))
        .order_by(Event.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
