from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime
import uuid


ContentType = Literal["PROBLEM", "SOLUTION", "CASE", "COMPARE", "SALES", "BRAND"]
ProjectStatus = Literal["draft", "processing", "ready", "done", "failed"]


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    source_text: str = Field(..., min_length=10)
    content_type: ContentType


class ProjectResponse(BaseModel):
    id: str
    title: str
    source_text: str
    content_type: ContentType
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
