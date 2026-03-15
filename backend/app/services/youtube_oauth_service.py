"""
YouTube OAuth2 Service — Google OAuth2 토큰 관리 및 업로드
"""
import os
from typing import Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from app.core.config import settings


# OAuth2 스코프
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def get_authorization_url() -> tuple[str, str]:
    """
    OAuth2 인증 URL 생성
    Returns: (authorization_url, state)
    """
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.YOUTUBE_CLIENT_ID,
                "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.YOUTUBE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.YOUTUBE_REDIRECT_URI
    
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
    )
    
    return authorization_url, state


def get_credentials_from_code(code: str, state: str) -> Credentials:
    """
    Authorization code로 access token 교환
    """
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.YOUTUBE_CLIENT_ID,
                "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.YOUTUBE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        state=state,
    )
    flow.redirect_uri = settings.YOUTUBE_REDIRECT_URI
    flow.fetch_token(code=code)
    
    return flow.credentials


async def upload_video_to_youtube(
    credentials: Credentials,
    video_path: str,
    title: str,
    description: str,
    tags: list[str],
    privacy_status: str = "public",
) -> str:
    """
    YouTube에 동영상 업로드
    
    Args:
        credentials: Google OAuth2 Credentials
        video_path: 업로드할 비디오 파일 경로
        title: 동영상 제목
        description: 동영상 설명
        tags: 해시태그 리스트
        privacy_status: public|unlisted|private
    
    Returns:
        YouTube 동영상 URL
    """
    youtube = build("youtube", "v3", credentials=credentials)
    
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": "22",  # 22 = People & Blogs
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False,
        },
    }
    
    media = MediaFileUpload(
        video_path,
        mimetype="video/mp4",
        resumable=True,
        chunksize=10 * 1024 * 1024,  # 10MB chunks
    )
    
    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media,
    )
    
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Upload progress: {int(status.progress() * 100)}%")
    
    video_id = response["id"]
    return f"https://www.youtube.com/shorts/{video_id}"


def save_credentials_to_db(user_id: str, credentials: Credentials):
    """
    TODO: DB에 credentials 저장 (암호화 필요)
    현재는 스텁 구현
    """
    # Supabase에 user_youtube_credentials 테이블 생성 후 저장
    pass


def load_credentials_from_db(user_id: str) -> Optional[Credentials]:
    """
    TODO: DB에서 credentials 로드
    현재는 스텁 구현
    """
    return None
