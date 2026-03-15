"""
TTS Service — OpenAI TTS API를 사용해 대본 → 음성 파일 생성
"""
import io
import uuid
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.supabase import get_supabase

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_tts_for_project(project_id: str) -> str:
    """프로젝트 대본 전체를 TTS로 변환 후 Supabase Storage에 업로드"""
    db = get_supabase()

    # 대본 조회
    result = db.table("scripts").select("*").eq("project_id", project_id).execute()
    if not result.data:
        raise ValueError(f"대본을 찾을 수 없습니다: {project_id}")

    script = result.data[0]
    full_text = f"{script['hook']}\n\n{script['body']}\n\n{script['cta']}"
    voice = script.get("tts_voice", settings.TTS_VOICE)

    # OpenAI TTS 생성
    response = await client.audio.speech.create(
        model="tts-1-hd",
        voice=voice,
        input=full_text,
        response_format="mp3",
    )

    audio_bytes = response.read()

    # Supabase Storage 업로드
    file_path = f"audio/{project_id}/{uuid.uuid4()}.mp3"
    db.storage.from_(settings.SUPABASE_BUCKET).upload(
        file_path,
        audio_bytes,
        {"content-type": "audio/mpeg"},
    )

    # 공개 URL 생성
    public_url = db.storage.from_(settings.SUPABASE_BUCKET).get_public_url(file_path)

    # DB 업데이트
    db.table("scripts").update({"audio_url": public_url}).eq("project_id", project_id).execute()

    return public_url


async def generate_scene_tts(project_id: str, scene_order: int, text: str, voice: str) -> bytes:
    """씬별 개별 TTS 생성 (렌더링 시 사용) — bytes 직접 반환"""
    response = await client.audio.speech.create(
        model="tts-1-hd",
        voice=voice,
        input=text,
        response_format="mp3",
    )
    return response.read()
