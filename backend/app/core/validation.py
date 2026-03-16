"""
환경 변수 검증 모듈
서버 시작 시 필수 환경 변수가 설정되어 있는지 검증
"""
import sys
from typing import List, Tuple
from app.core.config import settings


def validate_environment() -> Tuple[bool, List[str]]:
    """
    필수 환경 변수 검증
    
    Returns:
        (is_valid, missing_vars): 검증 성공 여부와 누락된 변수 목록
    """
    missing = []
    
    # 필수 환경 변수 목록
    required_vars = {
        "SUPABASE_URL": settings.SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": settings.SUPABASE_SERVICE_KEY,
        "OPENAI_API_KEY": settings.OPENAI_API_KEY,
    }
    
    # 기본값이 placeholder인지 확인
    for var_name, var_value in required_vars.items():
        if not var_value or var_value.startswith("your-") or var_value.startswith("sk-your"):
            missing.append(var_name)
    
    # FFmpeg 경로 검증 (선택적이지만 렌더링에 필수)
    if not settings.FFMPEG_PATH or settings.FFMPEG_PATH == "ffmpeg":
        # PATH에 있는지만 확인하고 경고만 표시
        import shutil
        if not shutil.which("ffmpeg"):
            print("⚠️  WARNING: FFmpeg가 PATH에 없습니다. 렌더링이 실패할 수 있습니다.")
    
    return len(missing) == 0, missing


def check_and_exit_if_invalid():
    """환경 변수 검증 후 누락 시 종료"""
    is_valid, missing = validate_environment()
    
    if not is_valid:
        print("\n" + "="*60)
        print("🚨 환경 변수 설정 오류")
        print("="*60)
        print("\n다음 필수 환경 변수가 설정되지 않았습니다:\n")
        for var in missing:
            print(f"  ❌ {var}")
        print("\n해결 방법:")
        print("  1. backend/.env 파일을 생성하세요")
        print("  2. .env.example을 참고하여 필수 값을 입력하세요")
        print("  3. Supabase와 OpenAI API 키를 발급받아 설정하세요")
        print("\n" + "="*60 + "\n")
        sys.exit(1)
    
    print("✅ 환경 변수 검증 완료")
