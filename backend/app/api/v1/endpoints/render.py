from fastapi import APIRouter, HTTPException, Body
from typing import List
from app.schemas.render import (
    RenderJobResponse,
    RenderOutputResponse,
    StartRenderRequest,
    RenderConfig,
)
from app.core.supabase import get_supabase
from app.core.render_queue import render_queue
import asyncio
import uuid
from datetime import datetime, timezone

router = APIRouter()


@router.post("/{project_id}", response_model=RenderJobResponse)
async def start_render(
    project_id: str,
    request: StartRenderRequest = Body(default=StartRenderRequest()),
):
    """
    렌더링 시작
    
    Args:
        project_id: 프로젝트 ID
        request: 렌더링 설정 (선택적, 기본값 사용 가능)
    """
    db = get_supabase()

    # 사전 조건 확인: TTS 완료 여부
    audio_result = db.table("scripts").select("audio_url").eq("project_id", project_id).execute()
    if not audio_result.data or not audio_result.data[0].get("audio_url"):
        raise HTTPException(status_code=400, detail="TTS 생성 또는 음성 업로드가 필요합니다")

    # 렌더 설정 (요청에서 전달된 config 사용, 없으면 기본값)
    config = request.config or RenderConfig()
    
    # 렌더 작업 생성
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    job_data = {
        "id": job_id,
        "project_id": project_id,
        "status": "pending",
        "progress": 0,
        "render_config": config.model_dump(),
        "created_at": now,
    }
    db.table("render_jobs").insert(job_data).execute()

    # 백그라운드 렌더링 시작
    from app.services.render_service import run_render_job
    asyncio.create_task(run_render_job(job_id, project_id))

    return job_data


@router.get("/{project_id}/status", response_model=RenderJobResponse)
async def get_render_status(project_id: str):
    db = get_supabase()
    result = (
        db.table("render_jobs")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="렌더 작업이 없습니다")
    return result.data[0]


@router.get("/{project_id}/download", response_model=List[RenderOutputResponse])
async def get_download_urls(project_id: str):
    db = get_supabase()

    # 가장 최근 렌더 작업 조회
    job_result = (
        db.table("render_jobs")
        .select("id")
        .eq("project_id", project_id)
        .eq("status", "done")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not job_result.data:
        raise HTTPException(status_code=404, detail="완료된 렌더 작업이 없습니다")

    job_id = job_result.data[0]["id"]
    outputs = db.table("render_outputs").select("*").eq("render_job_id", job_id).execute()
    return outputs.data or []


@router.get("/queue/status")
async def get_queue_status():
    """렌더 큐 상태 조회"""
    return render_queue.get_queue_status()
