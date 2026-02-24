from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.config import settings
from app.routers import (
    admin,
    auth,
    invitations,
    media,
    persons,
    proposals,
    relationships,
    search,
    sections,
    trees,
)
from app.services.storage import init_storage

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.ENVIRONMENT == "development" else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up roots backend")
    await init_storage()
    yield
    logger.info("Shutting down roots backend")


app = FastAPI(
    title="Roots Genealogy API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(trees.router, prefix="", tags=["trees"])
app.include_router(persons.router, prefix="", tags=["persons"])
app.include_router(relationships.router, prefix="", tags=["relationships"])
app.include_router(media.router, prefix="", tags=["media"])
app.include_router(sections.router, prefix="", tags=["sections"])
app.include_router(proposals.router, prefix="", tags=["proposals"])
app.include_router(invitations.router, prefix="", tags=["invitations"])
app.include_router(search.router, prefix="", tags=["search"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
