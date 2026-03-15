from fastapi import APIRouter, HTTPException
from app.core.supabase import get_supabase
from app.services.upload_service import upload_to_youtube, upload_to_instagram

router = APIRouter()


def _get_latest_render_output(project_id: str, channel: str) -> dict:
    db = get_supabase()
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
    output = (
        db.table("render_outputs")
        .select("*")
        .eq("render_job_id", job_id)
        .eq("channel", channel)
        .execute()
    )
    if not output.data:
        raise HTTPException(status_code=404, detail=f"{channel} 출력 패키지가 없습니다")
    return output.data[0]


@router.post("/{project_id}/youtube")
async def upload_youtube(project_id: str):
    output = _get_latest_render_output(project_id, "youtube")
    url = await upload_to_youtube(output)
    return {"url": url, "channel": "youtube"}


@router.post("/{project_id}/instagram")
async def upload_instagram(project_id: str):
    output = _get_latest_render_output(project_id, "instagram")
    url = await upload_to_instagram(output)
    return {"url": url, "channel": "instagram"}
