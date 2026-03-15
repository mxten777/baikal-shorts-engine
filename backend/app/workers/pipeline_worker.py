"""
Pipeline Worker — 전체 파이프라인 오케스트레이션
summary → plan → script → scenes → tts → render → package
"""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.services.llm_service import extract_summary, generate_plan, generate_script
from app.services.tts_service import generate_tts_for_project
from app.core.supabase import get_supabase
from app.schemas.pipeline import PipelineState

PIPELINE_STEPS = ["summary", "plan", "script", "scenes", "tts", "render", "package"]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def run_pipeline(
    project_id: str,
    project: dict,
    pipeline_states: dict,
    start_from: Optional[str] = None,
) -> None:
    """파이프라인 전체 실행 — 각 단계를 순차적으로 처리"""
    db = get_supabase()
    state: PipelineState = pipeline_states.get(project_id) or PipelineState(
        steps={step: "pending" for step in PIPELINE_STEPS},
        current_step=None,
    )

    def set_step(step: str, status: str):
        state.steps[step] = status
        state.current_step = step if status == "running" else None
        pipeline_states[project_id] = state

    async def save_run(step: str, status: str, result: dict | None = None, error: str | None = None):
        existing = db.table("pipeline_runs").select("id").eq("project_id", project_id).eq("step", step).execute()
        run_data = {
            "project_id": project_id,
            "step": step,
            "status": status,
            "result_json": result,
            "error_message": error,
            "finished_at": _now() if status in ("done", "failed") else None,
        }
        if existing.data:
            db.table("pipeline_runs").update(run_data).eq("id", existing.data[0]["id"]).execute()
        else:
            db.table("pipeline_runs").insert({"id": str(uuid.uuid4()), "started_at": _now(), **run_data}).execute()

    source_text = project["source_text"]
    content_type = project["content_type"]

    # 이전 단계 결과 캐시
    summary_data: dict = {}
    plan_data: dict = {}
    script_data: dict = {}

    # 기존 결과 로드 (재실행 시)
    if start_from:
        for step in PIPELINE_STEPS:
            if step == start_from:
                break
            run = db.table("pipeline_runs").select("result_json").eq("project_id", project_id).eq("step", step).eq("status", "done").execute()
            if run.data and run.data[0]["result_json"]:
                if step == "summary":
                    summary_data = run.data[0]["result_json"]
                elif step == "plan":
                    plan_data = run.data[0]["result_json"]
                elif step == "script":
                    script_data = run.data[0]["result_json"]

    start_idx = PIPELINE_STEPS.index(start_from) if start_from else 0

    try:
        # ── Step 1: 핵심 요약 ──────────────────────────────────────────────
        if start_idx <= 0:
            set_step("summary", "running")
            await save_run("summary", "running")
            try:
                summary_data = await extract_summary(source_text)
                set_step("summary", "done")
                await save_run("summary", "done", result=summary_data)
            except Exception as e:
                set_step("summary", "failed")
                state.error = str(e)
                await save_run("summary", "failed", error=str(e))
                raise

        # ── Step 2: 기획 생성 ──────────────────────────────────────────────
        if start_idx <= 1:
            set_step("plan", "running")
            await save_run("plan", "running")
            try:
                plan_data = await generate_plan(summary_data, content_type)
                set_step("plan", "done")
                await save_run("plan", "done", result=plan_data)
            except Exception as e:
                set_step("plan", "failed")
                state.error = str(e)
                await save_run("plan", "failed", error=str(e))
                raise

        # ── Step 3: 대본 생성 ──────────────────────────────────────────────
        if start_idx <= 2:
            set_step("script", "running")
            await save_run("script", "running")
            try:
                script_data = await generate_script(plan_data, content_type)
                # DB에 저장
                await _save_script(project_id, script_data, db)
                set_step("script", "done")
                await save_run("script", "done", result=script_data)
            except Exception as e:
                set_step("script", "failed")
                state.error = str(e)
                await save_run("script", "failed", error=str(e))
                raise

        # ── Step 4: 씬 분해 ────────────────────────────────────────────────
        if start_idx <= 3:
            set_step("scenes", "running")
            await save_run("scenes", "running")
            try:
                await _save_scenes(project_id, script_data, db)
                set_step("scenes", "done")
                await save_run("scenes", "done")
            except Exception as e:
                set_step("scenes", "failed")
                state.error = str(e)
                await save_run("scenes", "failed", error=str(e))
                raise

        # ── Step 5: TTS 생성 ───────────────────────────────────────────────
        if start_idx <= 4:
            set_step("tts", "running")
            await save_run("tts", "running")
            try:
                await generate_tts_for_project(project_id)
                set_step("tts", "done")
                await save_run("tts", "done")
            except Exception as e:
                # TTS 실패는 경고만 (수동 업로드 가능)
                set_step("tts", "failed")
                state.error = f"TTS 생성 실패 (직접 녹음 업로드 가능): {e}"
                await save_run("tts", "failed", error=str(e))
                # TTS 실패 시 렌더링 전 중단 (수동 업로드 기다림)
                db.table("projects").update({"status": "processing"}).eq("id", project_id).execute()
                return

        # ── Step 6: 렌더링 (별도 트리거) ──────────────────────────────────
        set_step("render", "pending")
        set_step("package", "pending")

        # 렌더링은 /render/{project_id} API에서 별도 트리거
        # 파이프라인은 TTS까지만 자동 진행 후 사용자가 대본 검토 후 렌더링 요청
        db.table("projects").update({"status": "ready"}).eq("id", project_id).execute()

    except Exception as e:
        db.table("projects").update({"status": "failed"}).eq("id", project_id).execute()
        print(f"[PipelineWorker] 파이프라인 실패 project_id={project_id}: {e}")


async def _save_script(project_id: str, script_data: dict, db) -> None:
    """생성된 대본을 DB에 저장"""
    body = "\n\n".join(
        s["text"] for s in script_data.get("scenes", [])
    )
    existing = db.table("scripts").select("id").eq("project_id", project_id).execute()
    script_record = {
        "project_id": project_id,
        "hook": script_data.get("hook", ""),
        "body": script_data.get("body", body),
        "cta": script_data.get("cta", ""),
        "tts_voice": "nova",
        "version": 1,
    }
    if existing.data:
        db.table("scripts").update(script_record).eq("project_id", project_id).execute()
    else:
        db.table("scripts").insert({"id": str(uuid.uuid4()), **script_record}).execute()


async def _save_scenes(project_id: str, script_data: dict, db) -> None:
    """씬 분해 결과를 DB에 저장"""
    # 기존 씬 삭제
    db.table("scenes").delete().eq("project_id", project_id).execute()

    scenes = script_data.get("scenes", [])
    for scene in scenes:
        db.table("scenes").insert({
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "scene_order": scene["order"],
            "duration_sec": scene.get("duration", 5.0),
            "description": scene.get("text", ""),
            "caption_text": scene.get("caption", scene.get("text", "")[:15]),
            "visual_hint": scene.get("visual_hint", ""),
        }).execute()
