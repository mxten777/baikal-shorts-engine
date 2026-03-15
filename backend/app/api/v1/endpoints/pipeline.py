from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List
import asyncio
import json

from app.schemas.pipeline import (
    PipelineState,
    ScriptUpdate,
    ScriptResponse,
    SceneUpdate,
    SceneResponse,
)
from app.core.supabase import get_supabase
from app.workers.pipeline_worker import run_pipeline, PIPELINE_STEPS

router = APIRouter()
scripts_router = APIRouter()
scenes_router = APIRouter()

# 진행중인 파이프라인 상태 인메모리 캐시 (MVP용; 프로덕션은 Redis)
_pipeline_states: dict[str, PipelineState] = {}


# ─── Pipeline ───────────────────────────────────────────────────────────────

@router.post("/{project_id}/run")
async def start_pipeline(project_id: str):
    db = get_supabase()
    result = db.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")

    project = result.data[0]

    # 이중 실행 방지: 인메모리 상태에 활성 파이프라인이 있으면 409 반환
    existing_state = _pipeline_states.get(project_id)
    if existing_state and existing_state.current_step is not None:
        raise HTTPException(
            status_code=409,
            detail=f"파이프라인이 이미 실행 중입니다 (현재 단계: {existing_state.current_step}). 완료 후 다시 시도하세요."
        )

    # 초기 상태 설정
    state = PipelineState(
        steps={step: "pending" for step in PIPELINE_STEPS},
        current_step=None,
    )
    _pipeline_states[project_id] = state

    # 상태 업데이트 업패닝 DB
    db.table("projects").update({"status": "processing"}).eq("id", project_id).execute()

    # 백그라운드 실행
    asyncio.create_task(
        run_pipeline(project_id, project, _pipeline_states)
    )

    return {"message": "파이프라인이 시작되었습니다", "project_id": project_id}


@router.get("/{project_id}/status", response_model=PipelineState)
async def get_pipeline_status(project_id: str):
    state = _pipeline_states.get(project_id)
    if state is None:
        # DB에서 단계별 최신 실행 결과 조회 (DESC → 첫 번째 = 가장 최신)
        db = get_supabase()
        runs = (
            db.table("pipeline_runs")
            .select("step,status")
            .eq("project_id", project_id)
            .order("started_at", desc=True)
            .execute()
        )
        steps = {step: "pending" for step in PIPELINE_STEPS}
        seen: set[str] = set()
        for run in runs.data or []:
            if run["step"] not in seen:
                steps[run["step"]] = run["status"]
                seen.add(run["step"])
        state = PipelineState(steps=steps, current_step=None)
    return state


@router.get("/{project_id}/stream")
async def stream_pipeline(project_id: str):
    """SSE 스트림으로 파이프라인 진행상황 전달"""
    async def event_generator():
        last_json = ""
        timeout = 0
        while timeout < 600:  # 최대 10분
            state = _pipeline_states.get(project_id)
            if state:
                # 객체 동일성이 아닌 값 비교로 변경 감지
                current_json = state.model_dump_json()
                if current_json != last_json:
                    last_json = current_json
                    data = {
                        "step": state.current_step,
                        "steps": state.steps,
                        "error": state.error,
                    }
                    yield f"data: {json.dumps(data)}\n\n"

                    all_done = all(
                        s in ("done", "failed") for s in state.steps.values()
                    )
                    if all_done:
                        break
            await asyncio.sleep(0.5)
            timeout += 0.5

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{project_id}/step/{step_name}")
async def rerun_step(project_id: str, step_name: str):
    db = get_supabase()
    result = db.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")

    if step_name not in PIPELINE_STEPS:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 단계: {step_name}")

    project = result.data[0]
    state = _pipeline_states.get(project_id) or PipelineState(
        steps={step: "done" for step in PIPELINE_STEPS},
        current_step=None,
    )
    # 해당 단계만 재실행
    state.steps[step_name] = "pending"
    _pipeline_states[project_id] = state

    asyncio.create_task(
        run_pipeline(project_id, project, _pipeline_states, start_from=step_name)
    )
    return {"message": f"{step_name} 재실행 시작"}


# ─── Scripts ────────────────────────────────────────────────────────────────

@scripts_router.get("/{project_id}", response_model=ScriptResponse)
async def get_script(project_id: str):
    db = get_supabase()
    result = db.table("scripts").select("*").eq("project_id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="대본이 아직 생성되지 않았습니다")
    return result.data[0]


@scripts_router.put("/{project_id}", response_model=ScriptResponse)
async def update_script(project_id: str, payload: ScriptUpdate):
    db = get_supabase()
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 내용이 없습니다")

    result = (
        db.table("scripts")
        .update(update_data)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="대본을 찾을 수 없습니다")
    return result.data[0]


@scripts_router.post("/{project_id}/tts")
async def generate_tts(project_id: str):
    from app.services.tts_service import generate_tts_for_project
    asyncio.create_task(generate_tts_for_project(project_id))
    return {"message": "TTS 생성을 시작했습니다"}


@scripts_router.post("/{project_id}/upload-audio")
async def upload_audio(project_id: str, file: UploadFile = File(...)):
    from app.services.whisper_service import process_uploaded_audio
    content = await file.read()
    asyncio.create_task(process_uploaded_audio(project_id, content, file.filename or "audio.mp3"))
    return {"message": "음성 파일 처리를 시작했습니다"}


# ─── Scenes ─────────────────────────────────────────────────────────────────

@scenes_router.get("/{project_id}", response_model=List[SceneResponse])
async def get_scenes(project_id: str):
    db = get_supabase()
    result = (
        db.table("scenes")
        .select("*")
        .eq("project_id", project_id)
        .order("scene_order")
        .execute()
    )
    return result.data or []


@scenes_router.put("/{project_id}/{scene_id}", response_model=SceneResponse)
async def update_scene(project_id: str, scene_id: str, payload: SceneUpdate):
    db = get_supabase()
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 내용이 없습니다")

    result = (
        db.table("scenes")
        .update(update_data)
        .eq("id", scene_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="씬을 찾을 수 없습니다")
    return result.data[0]
