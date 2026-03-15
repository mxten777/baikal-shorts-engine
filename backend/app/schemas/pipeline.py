from pydantic import BaseModel
from typing import Literal, Optional, Dict
from datetime import datetime


PipelineStep = Literal["summary", "plan", "script", "scenes", "tts", "render", "package"]
StepStatus = Literal["pending", "running", "done", "failed"]


class PipelineState(BaseModel):
    steps: Dict[str, StepStatus]
    current_step: Optional[PipelineStep] = None
    error: Optional[str] = None


class ScriptUpdate(BaseModel):
    hook: Optional[str] = None
    body: Optional[str] = None
    cta: Optional[str] = None


class ScriptResponse(BaseModel):
    id: str
    project_id: str
    hook: str
    body: str
    cta: str
    tts_voice: str
    audio_url: Optional[str] = None
    version: int


class SceneUpdate(BaseModel):
    duration_sec: Optional[float] = None
    description: Optional[str] = None
    caption_text: Optional[str] = None
    visual_hint: Optional[str] = None


class SceneResponse(BaseModel):
    id: str
    project_id: str
    scene_order: int
    duration_sec: float
    description: str
    caption_text: str
    visual_hint: str
