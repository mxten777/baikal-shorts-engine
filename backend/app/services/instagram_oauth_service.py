"""
Instagram OAuth2 및 비즈니스 계정 연동 서비스

Instagram Graph API를 사용하여 비즈니스 계정 인증 및 게시물 업로드 기능 제공
"""
import os
import json
import requests
from typing import Optional, Dict
from supabase import Client

from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY


class InstagramOAuthService:
    """Instagram Graph API를 통한 OAuth2 및 게시물 관리"""
    
    def __init__(self):
        self.client_id = os.getenv("INSTAGRAM_APP_ID")
        self.client_secret = os.getenv("INSTAGRAM_APP_SECRET")
        self.redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI", "http://localhost:5173/auth/instagram/callback")
        self.supabase: Client = Client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    def get_authorization_url(self, state: str) -> str:
        """
        Instagram OAuth 인증 URL 생성
        
        Args:
            state: CSRF 방지용 상태 토큰
            
        Returns:
            Instagram 인증 페이지 URL
        """
        scopes = [
            "instagram_basic",
            "instagram_content_publish",
            "pages_read_engagement",
            "pages_show_list"
        ]
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": ",".join(scopes),
            "response_type": "code",
            "state": state
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"https://api.instagram.com/oauth/authorize?{query_string}"
    
    def exchange_code_for_token(self, code: str) -> Dict[str, str]:
        """
        인증 코드를 액세스 토큰으로 교환
        
        Args:
            code: Instagram에서 받은 인증 코드
            
        Returns:
            access_token 및 user_id 포함 딕셔너리
        """
        url = "https://api.instagram.com/oauth/access_token"
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri,
            "code": code
        }
        
        response = requests.post(url, data=data)
        response.raise_for_status()
        
        result = response.json()
        
        # Short-lived 토큰을 Long-lived 토큰으로 변환
        long_lived_token = self._exchange_for_long_lived_token(result["access_token"])
        
        return {
            "access_token": long_lived_token,
            "user_id": str(result["user_id"])
        }
    
    def _exchange_for_long_lived_token(self, short_token: str) -> str:
        """
        Short-lived 토큰을 Long-lived 토큰으로 변환 (60일 유효)
        
        Args:
            short_token: 단기 액세스 토큰
            
        Returns:
            장기 액세스 토큰
        """
        url = "https://graph.instagram.com/access_token"
        params = {
            "grant_type": "ig_exchange_token",
            "client_secret": self.client_secret,
            "access_token": short_token
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        return response.json()["access_token"]
    
    def refresh_token(self, token: str) -> str:
        """
        Long-lived 토큰 갱신 (만료 전 60일마다 갱신 필요)
        
        Args:
            token: 기존 장기 액세스 토큰
            
        Returns:
            갱신된 장기 액세스 토큰
        """
        url = "https://graph.instagram.com/refresh_access_token"
        params = {
            "grant_type": "ig_refresh_token",
            "access_token": token
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        return response.json()["access_token"]
    
    def save_credentials(self, user_id: str, access_token: str, instagram_user_id: str):
        """
        Instagram 인증 정보를 Supabase에 저장
        
        Args:
            user_id: 시스템 사용자 ID
            access_token: Instagram 액세스 토큰
            instagram_user_id: Instagram 사용자 ID
        """
        data = {
            "user_id": user_id,
            "platform": "instagram",
            "credentials": json.dumps({
                "access_token": access_token,
                "instagram_user_id": instagram_user_id
            })
        }
        
        # Upsert: 기존 레코드가 있으면 업데이트, 없으면 삽입
        self.supabase.table("social_media_credentials").upsert(data).execute()
    
    def get_credentials(self, user_id: str) -> Optional[Dict]:
        """
        저장된 Instagram 인증 정보 조회
        
        Args:
            user_id: 시스템 사용자 ID
            
        Returns:
            인증 정보 딕셔너리 또는 None
        """
        result = (
            self.supabase.table("social_media_credentials")
            .select("*")
            .eq("user_id", user_id)
            .eq("platform", "instagram")
            .execute()
        )
        
        if not result.data:
            return None
        
        return json.loads(result.data[0]["credentials"])
    
    def get_instagram_account(self, access_token: str) -> Dict:
        """
        Instagram 비즈니스 계정 정보 조회
        
        Args:
            access_token: Instagram 액세스 토큰
            
        Returns:
            계정 정보 (id, username, profile_picture_url 등)
        """
        url = "https://graph.instagram.com/me"
        params = {
            "fields": "id,username,account_type,media_count",
            "access_token": access_token
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        return response.json()
    
    def create_media_container(
        self, 
        instagram_user_id: str, 
        access_token: str,
        video_url: str,
        caption: str
    ) -> str:
        """
        Instagram 비디오 컨테이너 생성 (업로드 1단계)
        
        Args:
            instagram_user_id: Instagram 사용자 ID
            access_token: Instagram 액세스 토큰
            video_url: 공개 접근 가능한 비디오 URL (HTTPS 필수)
            caption: 게시물 캡션
            
        Returns:
            생성된 컨테이너 ID
        """
        url = f"https://graph.instagram.com/{instagram_user_id}/media"
        data = {
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption,
            "access_token": access_token
        }
        
        response = requests.post(url, data=data)
        response.raise_for_status()
        
        return response.json()["id"]
    
    def publish_media(
        self,
        instagram_user_id: str,
        access_token: str,
        creation_id: str
    ) -> str:
        """
        미디어 컨테이너를 실제 게시물로 발행 (업로드 2단계)
        
        Args:
            instagram_user_id: Instagram 사용자 ID
            access_token: Instagram 액세스 토큰
            creation_id: 미디어 컨테이너 ID
            
        Returns:
            발행된 게시물 ID
        """
        url = f"https://graph.instagram.com/{instagram_user_id}/media_publish"
        data = {
            "creation_id": creation_id,
            "access_token": access_token
        }
        
        response = requests.post(url, data=data)
        response.raise_for_status()
        
        return response.json()["id"]
    
    def upload_reel(
        self,
        user_id: str,
        video_url: str,
        caption: str
    ) -> str:
        """
        Instagram Reels 자동 업로드 (전체 프로세스)
        
        Args:
            user_id: 시스템 사용자 ID
            video_url: 공개 접근 가능한 비디오 URL
            caption: 게시물 캡션
            
        Returns:
            발행된 게시물 ID
        """
        # 저장된 인증 정보 가져오기
        creds = self.get_credentials(user_id)
        if not creds:
            raise ValueError("Instagram credentials not found. Please authenticate first.")
        
        access_token = creds["access_token"]
        instagram_user_id = creds["instagram_user_id"]
        
        # 1단계: 미디어 컨테이너 생성
        container_id = self.create_media_container(
            instagram_user_id, 
            access_token, 
            video_url, 
            caption
        )
        
        # 2단계: 발행
        post_id = self.publish_media(instagram_user_id, access_token, container_id)
        
        return post_id
