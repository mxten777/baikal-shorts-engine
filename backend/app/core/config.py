from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import json


class Settings(BaseSettings):
    # 앱
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-this-in-production"

    # 브랜드 / 연락처
    BRAND_NAME: str = "바이칼시스템즈"
    BRAND_EMAIL: str = "contact@baikalsystems.com"
    BRAND_WEBSITE: str = "www.baikalsystems.com"
    DEFAULT_HASHTAGS: List[str] = ["바이칼시스템즈", "IT컨설팅"]

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str  # service_role key (백엔드 전용)
    SUPABASE_BUCKET: str = "shorts-engine"

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"
    TTS_VOICE: str = "nova"  # alloy|echo|fable|onyx|nova|shimmer

    # YouTube (OAuth2)
    YOUTUBE_CLIENT_ID: str = ""
    YOUTUBE_CLIENT_SECRET: str = ""
    YOUTUBE_REDIRECT_URI: str = "http://localhost:8000/auth/youtube/callback"

    # Instagram Graph API
    INSTAGRAM_ACCESS_TOKEN: str = ""

    # 에러 트래킹
    SENTRY_DSN: str = ""  # Sentry DSN (프로덕션에서만 필수)

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "https://baikal-shorts-engine.vercel.app",
        "https://frontend-sigma-three-25.vercel.app",
    ]
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """환경 변수의 JSON 문자열을 파싱"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # JSON 파싱 실패 시 쉼표로 구분된 문자열로 시도
                return [origin.strip() for origin in v.split(",")]
        return v

    # FFmpeg
    FFMPEG_PATH: str = "ffmpeg"  # PATH에 있으면 그대로, 아니면 절대경로

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def is_production(self) -> bool:
        """프로덕션 환경 여부"""
        return self.APP_ENV == "production"

    def get_cors_origins(self) -> List[str]:
        """환경별 CORS origins 반환 (보안 검증용)"""
        origins = self.CORS_ORIGINS if isinstance(self.CORS_ORIGINS, list) else []
        if self.is_production:
            # 프로덕션: 실제 도메인만 허용 (localhost 제거)
            return [origin for origin in origins if "localhost" not in origin]
        return origins


settings = Settings()
