from pydantic import BaseModel, Field
from typing import Literal, Optional, List
from datetime import datetime


RenderStatus = Literal["pending", "queued", "running", "done", "failed"]
ChannelType = Literal["youtube", "instagram", "linkedin"]


class RenderConfig(BaseModel):
    """렌더링 설정"""
    resolution: str = Field(default="1080x1920", description="해상도 (width×height)")
    fps: int = Field(default=30, description="프레임레이트", ge=24, le=60)
    bg_color: str = Field(default="#0A1628", description="배경색 (hex)")
    accent_color: str = Field(default="#00D4FF", description="강조색 (hex)")
    caption_color: str = Field(default="#FFFFFF", description="자막 색상 (hex)")
    caption_font_size: int = Field(default=52, description="자막 폰트 크기", ge=24, le=120)
    caption_position: Literal["top", "center", "bottom"] = Field(default="bottom", description="자막 위치")
    thumbnail_style: Literal["gradient", "tech", "minimal", "bold"] = Field(
        default="gradient", 
        description="썸네일 스타일 (gradient: 그라디언트, tech: 테크, minimal: 미니멀, bold: 대담)"
    )


class StartRenderRequest(BaseModel):
    """렌더링 시작 요청"""
    config: Optional[RenderConfig] = None


class RenderJobResponse(BaseModel):
    id: str
    project_id: str
    status: RenderStatus
    progress: int
    output_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    package_url: Optional[str] = None
    created_at: datetime


class RenderOutputResponse(BaseModel):
    id: str
    render_job_id: str
    channel: ChannelType
    video_url: str
    caption_text: str
    hashtags: List[str]
    thumbnail_text: str
