from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from app.config import settings
from app.database import init_db
from app.websocket.manager import ws_manager
from app.websocket.simulator import live_simulation_loop

# Import all routers
from app.routes import (
    auth, assets, services, vulnerabilities, controls,
    risks, evidence, scenarios, investments, optimizations,
    ai, reports, models, audit, search, health, demo, compliance, sources, intelligence
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cyberrisk-platform")

# Initialize database tables on startup
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: launch live simulation engine. Shutdown: cancel it."""
    sim_task = asyncio.create_task(live_simulation_loop(ws_manager, interval_seconds=20))
    logging.getLogger("cyberrisk-platform").info("Live simulation engine task started")
    yield
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Enterprise Cybersecurity Decision-Support Platform: Continuous Risk Quantification & Investment Optimization (SIH 26105)",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Live Endpoint
@app.websocket("/api/v1/live")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive receive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket exception: {e}")
        ws_manager.disconnect(websocket)

# Include all API v1 routers
prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=prefix)
app.include_router(assets.router, prefix=prefix)
app.include_router(services.router, prefix=prefix)
app.include_router(vulnerabilities.router, prefix=prefix)
app.include_router(controls.router, prefix=prefix)
app.include_router(risks.router, prefix=prefix)
app.include_router(evidence.router, prefix=prefix)
app.include_router(scenarios.router, prefix=prefix)
app.include_router(investments.router, prefix=prefix)
app.include_router(optimizations.router, prefix=prefix)
app.include_router(ai.router, prefix=prefix)
app.include_router(reports.router, prefix=prefix)
app.include_router(models.router, prefix=prefix)
app.include_router(audit.router, prefix=prefix)
app.include_router(search.router, prefix=prefix)
app.include_router(demo.router, prefix=prefix)
app.include_router(compliance.router, prefix=prefix)
app.include_router(sources.router, prefix=prefix)
app.include_router(intelligence.router, prefix=prefix)
app.include_router(health.router)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

# Static frontend assets
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend_assets")

@app.get("/{full_path:path}")
def serve_frontend_spa(full_path: str):
    # Don't intercept API or docs routes
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "status": "Operational",
        "docs": "/docs",
        "api_v1": "/api/v1",
        "demo_user": "ciso@demofinancial.com",
        "demo_password": "DemoPassword2026!"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc)
            }
        }
    )
