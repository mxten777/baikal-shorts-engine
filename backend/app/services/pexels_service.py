"""
Pexels Service — 키워드로 고품질 배경 이미지/비디오 검색
"""
import httpx
from app.core.config import settings

PEXELS_API_URL = "https://api.pexels.com/v1/search"
PEXELS_VIDEO_API_URL = "https://api.pexels.com/videos/search"

async def search_background_image(keyword: str) -> str | None:
    """Pexels에서 키워드에 맞는 고품질 이미지 검색"""
    if not settings.PEXELS_API_KEY:
        return None

    headers = {"Authorization": settings.PEXELS_API_KEY}
    params = {
        "query": f"{keyword} abstract",
        "orientation": "portrait",
        "size": "large",
        "per_page": 1
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(PEXELS_API_URL, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            if data.get("photos"):
                return data["photos"][0]["src"]["large2x"]
        except httpx.HTTPStatusError as e:
            print(f"Pexels API error: {e}")
            return None
    return None
