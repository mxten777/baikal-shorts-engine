from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

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


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "baikal-shorts-engine"}
