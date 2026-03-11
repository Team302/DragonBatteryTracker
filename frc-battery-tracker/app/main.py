from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import batteries, events, dashboard, robots


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic for production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="FRC Battery Tracker",
    description="Track FRC robot battery health, charge cycles, and match usage.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(batteries.router)
app.include_router(events.router)
app.include_router(dashboard.router)
app.include_router(robots.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
