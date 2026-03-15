"""
Instagram OAuth2 인증 엔드포인트
"""
import secrets
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.instagram_oauth_service import InstagramOAuthService

router = APIRouter()
oauth_service = InstagramOAuthService()

# 임시 상태 저장소 (프로덕션에서는 Redis 사용 권장)
pending_states = {}


class AuthUrlResponse(BaseModel):
    """인증 URL 응답"""
    auth_url: str
    state: str


class InstagramCallbackRequest(BaseModel):
    """Instagram 콜백 요청"""
    code: str
    state: str
    user_id: str


class InstagramCallbackResponse(BaseModel):
    """Instagram 콜백 응답"""
    success: bool
    message: str
    instagram_user_id: Optional[str] = None


class InstagramAccountResponse(BaseModel):
    """Instagram 계정 정보 응답"""
    id: str
    username: str
    account_type: str
    media_count: int


class UploadReelRequest(BaseModel):
    """Reels 업로드 요청"""
    user_id: str
    video_url: str
    caption: str


class UploadReelResponse(BaseModel):
    """Reels 업로드 응답"""
    success: bool
    post_id: str
    message: str


@router.get("/auth/url", response_model=AuthUrlResponse)
async def get_auth_url():
    """
    Instagram OAuth 인증 URL 생성
    
    Returns:
        인증 URL 및 CSRF 방지용 상태 토큰
    """
    state = secrets.token_urlsafe(32)
    pending_states[state] = True
    
    auth_url = oauth_service.get_authorization_url(state)
    
    return AuthUrlResponse(auth_url=auth_url, state=state)


@router.post("/auth/callback", response_model=InstagramCallbackResponse)
async def handle_callback(request: InstagramCallbackRequest):
    """
    Instagram OAuth 콜백 처리
    
    Args:
        request: 인증 코드, 상태 토큰, 사용자 ID
        
    Returns:
        인증 성공 여부 및 Instagram 사용자 ID
    """
    # 상태 토큰 검증 (CSRF 방지)
    if request.state not in pending_states:
        raise HTTPException(status_code=400, detail="Invalid state token")
    
    del pending_states[request.state]
    
    try:
        # 인증 코드를 액세스 토큰으로 교환
        token_data = oauth_service.exchange_code_for_token(request.code)
        
        # 인증 정보 저장
        oauth_service.save_credentials(
            user_id=request.user_id,
            access_token=token_data["access_token"],
            instagram_user_id=token_data["user_id"]
        )
        
        return InstagramCallbackResponse(
            success=True,
            message="Instagram account connected successfully",
            instagram_user_id=token_data["user_id"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to authenticate: {str(e)}")


@router.get("/account/{user_id}", response_model=InstagramAccountResponse)
async def get_account_info(user_id: str):
    """
    연동된 Instagram 계정 정보 조회
    
    Args:
        user_id: 시스템 사용자 ID
        
    Returns:
        Instagram 계정 정보
    """
    try:
        creds = oauth_service.get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=404, detail="Instagram account not connected")
        
        account_info = oauth_service.get_instagram_account(creds["access_token"])
        
        return InstagramAccountResponse(**account_info)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch account info: {str(e)}")


@router.post("/upload/reel", response_model=UploadReelResponse)
async def upload_reel(request: UploadReelRequest):
    """
    Instagram Reels 자동 업로드
    
    Args:
        request: 사용자 ID, 비디오 URL, 캡션
        
    Returns:
        업로드된 게시물 ID
    """
    try:
        post_id = oauth_service.upload_reel(
            user_id=request.user_id,
            video_url=request.video_url,
            caption=request.caption
        )
        
        return UploadReelResponse(
            success=True,
            post_id=post_id,
            message="Reel uploaded successfully to Instagram"
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to upload reel: {str(e)}")


@router.post("/auth/refresh/{user_id}")
async def refresh_access_token(user_id: str):
    """
    Instagram 액세스 토큰 갱신 (60일마다 필요)
    
    Args:
        user_id: 시스템 사용자 ID
        
    Returns:
        갱신 성공 메시지
    """
    try:
        creds = oauth_service.get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=404, detail="Instagram account not connected")
        
        new_token = oauth_service.refresh_token(creds["access_token"])
        
        # 갱신된 토큰 저장
        oauth_service.save_credentials(
            user_id=user_id,
            access_token=new_token,
            instagram_user_id=creds["instagram_user_id"]
        )
        
        return {"success": True, "message": "Access token refreshed successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to refresh token: {str(e)}")
