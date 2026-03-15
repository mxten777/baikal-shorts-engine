from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

# 로깅 초기화
setup_logging()
logger = get_logger("main")

# Sentry 초기화 (프로덕션 또는 DSN 설정 시)
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        traces_sample_rate=1.0 if settings.APP_ENV == "development" else 0.1,
        profiles_sample_rate=1.0 if settings.APP_ENV == "development" else 0.1,
        integrations=[
            FastApiIntegration(),
            StarletteIntegration(),
        ],
    )
    logger.info(f"Sentry initialized for {settings.APP_ENV} environment")

app = FastAPI(
    title="BAIKAL Shorts Engine API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    logger.info("=" * 50)
    logger.info("BAIKAL Shorts Engine API Starting...")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info(f"CORS Origins: {settings.get_cors_origins()}")
    logger.info("=" * 50)


@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행"""
    logger.info("BAIKAL Shorts Engine API Shutting down...")


@app.get("/")
async def root():
    """API 루트 엔드포인트"""
    return {
        "message": "BAIKAL Shorts Engine API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "baikal-shorts-engine"}
