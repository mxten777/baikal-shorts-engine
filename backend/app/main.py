from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.supabase import get_supabase
from app.core.validation import check_and_exit_if_invalid
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    general_exception_handler,
)
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

# 환경 변수 검증 (서버 시작 전 필수)
check_and_exit_if_invalid()

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

# CORS 설정 - 임시로 모든 origin 허용 (디버깅용)
cors_origins = settings.get_cors_origins()
logger.info(f"Configuring CORS with origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 임시로 모든 origin 허용
    allow_credentials=False,  # credentials를 False로 변경 (allow_origins="*"와 호환)
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# 예외 핸들러 등록
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    logger.info("=" * 50)
    logger.info("BAIKAL Shorts Engine API Starting...")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info(f"CORS Origins: {settings.get_cors_origins()}")
    logger.info("=" * 50)

    # 서버 재시작 시 stale 'running' 파이프라인 단계 복구
    try:
        db = get_supabase()
        stale_runs = (
            db.table("pipeline_runs")
            .select("id, project_id, step")
            .eq("status", "running")
            .execute()
        )
        if stale_runs.data:
            stale_count = len(stale_runs.data)
            logger.warning(f"서버 재시작: {stale_count}개의 중단된 파이프라인 단계를 'failed'로 복구합니다")
            stale_ids = [r["id"] for r in stale_runs.data]
            db.table("pipeline_runs").update({
                "status": "failed",
                "error_message": "서버 재시작으로 인한 강제 종료",
                "finished_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            }).in_("id", stale_ids).execute()

            # 연관 프로젝트도 processing → failed 처리
            stale_project_ids = list({r["project_id"] for r in stale_runs.data})
            db.table("projects").update({"status": "failed"}).in_("id", stale_project_ids).eq("status", "processing").execute()
            logger.warning(f"복구 완료: {stale_count}개 단계, {len(stale_project_ids)}개 프로젝트")
    except Exception as e:
        logger.error(f"stale 파이프라인 복구 실패: {e}")


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
    return {
        "status": "ok",
        "service": "baikal-shorts-engine",
        "environment": settings.APP_ENV,
        "cors_origins": settings.get_cors_origins()
    }
