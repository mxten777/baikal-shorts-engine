"""
로깅 설정 모듈

애플리케이션 전체에서 사용할 로거 설정
"""
import logging
import sys
from app.core.config import settings

# 로그 포맷 설정
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

def setup_logging():
    """로깅 시스템 초기화"""
    # 로그 레벨 설정
    log_level = logging.DEBUG if settings.APP_ENV == "development" else logging.INFO
    
    # 루트 로거 설정
    logging.basicConfig(
        level=log_level,
        format=LOG_FORMAT,
        datefmt=DATE_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # uvicorn 로거 레벨 조정
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    
    return logging.getLogger("baikal")

def get_logger(name: str) -> logging.Logger:
    """모듈별 로거 반환"""
    return logging.getLogger(f"baikal.{name}")
