"""
커스텀 예외 클래스 및 전역 예외 핸들러
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.logging import get_logger

logger = get_logger("exceptions")


class AppException(Exception):
    """애플리케이션 기본 예외"""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ResourceNotFoundException(AppException):
    """리소스를 찾을 수 없음"""
    def __init__(self, resource: str, resource_id: str):
        message = f"{resource}을(를) 찾을 수 없습니다: {resource_id}"
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class ValidationException(AppException):
    """입력 검증 실패"""
    def __init__(self, message: str):
        super().__init__(message, status.HTTP_400_BAD_REQUEST)


class ExternalServiceException(AppException):
    """외부 서비스 오류 (OpenAI, Supabase 등)"""
    def __init__(self, service: str, message: str):
        full_message = f"{service} 서비스 오류: {message}"
        super().__init__(full_message, status.HTTP_503_SERVICE_UNAVAILABLE)


async def app_exception_handler(request: Request, exc: AppException):
    """커스텀 예외 핸들러"""
    logger.error(f"AppException: {exc.message} (status={exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.message,
            "type": exc.__class__.__name__,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """FastAPI 입력 검증 예외 핸들러"""
    errors = exc.errors()
    logger.warning(f"Validation error: {errors}")
    
    # 더 명확한 에러 메시지 생성
    error_messages = []
    for error in errors:
        loc = " -> ".join(str(l) for l in error["loc"])
        msg = error["msg"]
        error_messages.append(f"{loc}: {msg}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "입력 데이터 검증 실패",
            "errors": error_messages,
        },
    )


async def general_exception_handler(request: Request, exc: Exception):
    """모든 예외를 잡는 최종 핸들러"""
    logger.exception(f"Unhandled exception: {exc}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.",
            "type": "InternalServerError",
        },
    )
