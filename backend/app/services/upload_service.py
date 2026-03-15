"""
Upload Service — YouTube / Instagram 플랫폼 업로드
"""
import httpx
import tempfile
from pathlib import Path
from app.core.config import settings
from app.services.youtube_oauth_service import (
    load_credentials_from_db,
    upload_video_to_youtube,
)


async def upload_to_youtube(output: dict, user_id: str = "default_user") -> str:
    """
    YouTube Data API v3를 통해 동영상 업로드
    
    Args:
        output: render_outputs 레코드 (video_url, caption_text, hashtags 등)
        user_id: 사용자 ID (OAuth credentials 로드용)
    
    Returns:
        YouTube 업로드 URL 또는 다운로드 URL (인증 없을 시)
    """
    # OAuth2 credentials 확인
    credentials = load_credentials_from_db(user_id)
    
    if not credentials:
        # 인증 안 되어 있으면 다운로드 URL만 반환 (수동 업로드)
        return output.get("video_url", "")
    
    # 비디오 다운로드 (임시 파일)
    video_url = output.get("video_url", "")
    async with httpx.AsyncClient(timeout=300) as client:
        video_response = await client.get(video_url)
        video_response.raise_for_status()
        
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_file:
            tmp_file.write(video_response.content)
            video_path = tmp_file.name
    
    try:
        # YouTube 업로드
        title = output.get("caption_text", "")[:100]  # 제목 100자 제한
        description = output.get("caption_text", "")
        tags = output.get("hashtags", [])
        
        youtube_url = await upload_video_to_youtube(
            credentials=credentials,
            video_path=video_path,
            title=title,
            description=description,
            tags=tags,
            privacy_status="public",
        )
        
        return youtube_url
    finally:
        # 임시 파일 삭제
        Path(video_path).unlink(missing_ok=True)


async def upload_to_instagram(output: dict) -> str:
    """
    Instagram Graph API를 통해 릴스 업로드
    사전 조건: INSTAGRAM_ACCESS_TOKEN 설정
    """
    if not settings.INSTAGRAM_ACCESS_TOKEN:
        return output.get("video_url", "")

    video_url = output.get("video_url", "")
    caption = output.get("caption_text", "")

    # Step 1: 미디어 컨테이너 생성
    async with httpx.AsyncClient(timeout=120) as client:
        create_res = await client.post(
            f"https://graph.instagram.com/v18.0/me/media",
            params={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
                "access_token": settings.INSTAGRAM_ACCESS_TOKEN,
            },
        )
        create_res.raise_for_status()
        container_id = create_res.json()["id"]

        # Step 2: 게시
        publish_res = await client.post(
            f"https://graph.instagram.com/v18.0/me/media_publish",
            params={
                "creation_id": container_id,
                "access_token": settings.INSTAGRAM_ACCESS_TOKEN,
            },
        )
        publish_res.raise_for_status()
        post_id = publish_res.json()["id"]

    return f"https://www.instagram.com/p/{post_id}/"
