"""
YouTube OAuth2 인증 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.services.youtube_oauth_service import (
    get_authorization_url,
    get_credentials_from_code,
    save_credentials_to_db,
)

router = APIRouter()


@router.get("/youtube/authorize")
async def youtube_authorize():
    """
    YouTube OAuth2 인증 시작
    사용자를 Google 로그인 페이지로 리디렉션
    """
    try:
        auth_url, state = get_authorization_url()
        # TODO: state를 세션 또는 Redis에 저장 (CSRF 방지)
        return {"authorization_url": auth_url, "state": state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth 인증 URL 생성 실패: {str(e)}")


@router.get("/youtube/callback")
async def youtube_callback(
    code: str = Query(..., description="Authorization code"),
    state: str = Query(..., description="State parameter"),
):
    """
    YouTube OAuth2 콜백
    Google이 authorization code를 반환하면 access token으로 교환
    """
    try:
        # TODO: state 검증 (세션/Redis에서 확인)
        
        credentials = get_credentials_from_code(code, state)
        
        # TODO: 실제 user_id 가져오기 (현재 인증 시스템 없음)
        user_id = "default_user"
        save_credentials_to_db(user_id, credentials)
        
        # 프론트엔드로 리디렉션 (성공 페이지)
        return RedirectResponse(
            url="http://localhost:5173/settings/youtube?success=true",
            status_code=302,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth 토큰 교환 실패: {str(e)}")


@router.get("/youtube/status")
async def youtube_auth_status():
    """
    YouTube 인증 상태 확인
    """
    # TODO: 현재 사용자의 credentials 존재 여부 확인
    return {"authenticated": False, "message": "인증 시스템 구현 필요"}
