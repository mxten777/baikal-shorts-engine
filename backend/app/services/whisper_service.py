"""
Whisper Service — 업로드된 음성 파일을 자막으로 변환하고 씬에 정렬
"""
import io
import uuid
import json
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.supabase import get_supabase

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def process_uploaded_audio(
    project_id: str, audio_bytes: bytes, filename: str
) -> str:
    """업로드된 음성 파일을 처리: Storage 저장 + Whisper 자막 생성 + DB 업데이트"""
    db = get_supabase()

    # Supabase Storage 저장
    file_path = f"audio/{project_id}/original_{uuid.uuid4()}.mp3"
    db.storage.from_(settings.SUPABASE_BUCKET).upload(
        file_path,
        audio_bytes,
        {"content-type": "audio/mpeg"},
    )
    public_url = db.storage.from_(settings.SUPABASE_BUCKET).get_public_url(file_path)

    # DB 업데이트 (audio_url)
    db.table("scripts").update({"audio_url": public_url}).eq("project_id", project_id).execute()

    # Whisper로 자막 생성 (verbose_json = 타임스탬프 포함)
    transcription = await client.audio.transcriptions.create(
        model="whisper-1",
        file=(filename, io.BytesIO(audio_bytes), "audio/mpeg"),
        response_format="verbose_json",
        language="ko",
    )

    # 씬 자막 자동 정렬 (타임스탬프 기반)
    await _align_captions_to_scenes(project_id, transcription)

    return public_url


async def _align_captions_to_scenes(project_id: str, transcription) -> None:
    """Whisper 세그먼트를 씬 타임라인에 맞춰 자막 업데이트"""
    db = get_supabase()

    scenes_result = (
        db.table("scenes")
        .select("*")
        .eq("project_id", project_id)
        .order("scene_order")
        .execute()
    )
    if not scenes_result.data:
        return

    scenes = scenes_result.data
    segments = transcription.segments or []

    # 씬별 시간 범위 계산
    scene_start = 0.0
    for scene in scenes:
        scene_end = scene_start + scene["duration_sec"]

        # 해당 씬 시간대의 세그먼트 텍스트 수집
        scene_text = " ".join(
            seg.text.strip()
            for seg in segments
            if seg.start >= scene_start and seg.start < scene_end
        )

        if scene_text:
            # 자막은 15자 이내로 축약
            caption = scene_text[:15] if len(scene_text) > 15 else scene_text
            db.table("scenes").update({"caption_text": caption}).eq("id", scene["id"]).execute()

        scene_start = scene_end
