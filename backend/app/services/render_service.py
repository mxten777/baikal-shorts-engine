"""
Render Service — FFmpeg 기반 9:16 쇼츠 영상 렌더링 파이프라인
씬별 배경 생성 → 자막 오버레이 → 음성 결합 → concat → 워터마크 → 인코딩
"""
import asyncio
import tempfile
import uuid
import io
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import httpx

from app.core.config import settings
from app.core.supabase import get_supabase
from app.core.render_queue import render_queue
from app.core.logging import get_logger
from app.services.tts_service import generate_scene_tts
from app.services.pexels_service import search_background_image

# 로거 초기화
logger = get_logger("render_service")

# 바이칼 브랜드 상수
BAIKAL_BRAND = {
    "bg_color": (10, 22, 40),        # #0A1628
    "accent_color": (0, 212, 255),   # #00D4FF
    "text_color": (255, 255, 255),
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "font_size": 52,
    "caption_y_ratio": 0.75,
}

ASSETS_DIR = Path(__file__).parent.parent.parent / "assets" / "templates"


async def run_render_job(job_id: str, project_id: str) -> None:
    """렌더 작업 메인 실행 함수 (큐 관리 포함)"""
    db = get_supabase()

    # 큐 슬롯 획득 시도
    can_start = await render_queue.acquire(job_id, project_id)
    if not can_start:
        # 대기열에 추가됨
        db.table("render_jobs").update({
            "status": "queued",
            "progress": 0,
        }).eq("id", job_id).execute()
        # TODO: 큐에서 순서가 되면 자동 실행 (현재는 폴링 필요)
        return

    def update_job(status: str, progress: int, **kwargs):
        db.table("render_jobs").update(
            {"status": status, "progress": progress, **kwargs}
        ).eq("id", job_id).execute()

    try:
        update_job("running", 5)

        # render_config 조회
        job_result = db.table("render_jobs").select("render_config").eq("id", job_id).execute()
        render_config = job_result.data[0].get("render_config", {}) if job_result.data else {}
        
        # config에서 렌더 설정 추출 (기본값 포함)
        config = {
            "resolution": render_config.get("resolution", "1080x1920"),
            "fps": render_config.get("fps", 30),
            "bg_color": render_config.get("bg_color", "#0A1628"),
            "accent_color": render_config.get("accent_color", "#00D4FF"),
            "caption_color": render_config.get("caption_color", "#FFFFFF"),
            "caption_font_size": render_config.get("caption_font_size", 52),
            "caption_position": render_config.get("caption_position", "bottom"),
            "thumbnail_style": render_config.get("thumbnail_style", "gradient"),
        }
        
        # 해상도 파싱
        width, height = map(int, config["resolution"].split("x"))
        
        # 배경색 hex → RGB 변환
        def hex_to_rgb(hex_color: str) -> tuple:
            hex_color = hex_color.lstrip("#")
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        
        bg_rgb = hex_to_rgb(config["bg_color"])
        accent_rgb = hex_to_rgb(config["accent_color"])
        caption_rgb = hex_to_rgb(config["caption_color"])

        # 필요 데이터 조회
        script_result = db.table("scripts").select("*").eq("project_id", project_id).execute()
        scenes_result = (
            db.table("scenes")
            .select("*")
            .eq("project_id", project_id)
            .order("scene_order")
            .execute()
        )
        plan_result = (
            db.table("pipeline_runs")
            .select("result_json")
            .eq("project_id", project_id)
            .eq("step", "plan")
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        )

        script = script_result.data[0]
        scenes = scenes_result.data
        plan_result_json = plan_result.data[0]["result_json"] if plan_result.data else {}

        update_job("running", 15)

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)

            # Step 1: 씬별 배경 이미지 생성 또는 다운로드
            bg_paths = []
            async with httpx.AsyncClient() as client:
                for scene in scenes:
                    bg_path = tmp / f"bg_{scene['scene_order']:02d}.png"
                    
                    # Pexels에서 이미지 검색
                    visual_hint = _get_scene_visual_hint(scene, plan_result_json)
                    image_url = await search_background_image(visual_hint)

                    if image_url:
                        try:
                            # 이미지 다운로드
                            response = await client.get(image_url, timeout=20.0)
                            response.raise_for_status()
                            # Pillow로 열어서 리사이즈 및 저장
                            with Image.open(io.BytesIO(response.content)) as img:
                                img_resized = img.resize((width, height))
                                img_resized.save(bg_path, "PNG")
                        except (httpx.HTTPStatusError, IOError) as e:
                            logger.warning(f"배경 이미지 다운로드/처리 실패: {e}, 단색 배경으로 대체합니다.")
                            _create_scene_background(bg_path, scene, width, height, bg_rgb, accent_rgb)
                    else:
                        # Pexels 이미지가 없으면 기존 단색 배경 생성
                        _create_scene_background(bg_path, scene, width, height, bg_rgb, accent_rgb)
                    
                    bg_paths.append(bg_path)

            update_job("running", 30)

            # Step 2: 씬별 TTS 음성 생성
            voice = script.get("tts_voice", settings.TTS_VOICE)
            audio_paths = []
            for scene in scenes:
                audio_bytes = await generate_scene_tts(
                    project_id, scene["scene_order"], scene["caption_text"] + ". " + _get_scene_body(scene, plan_result_json), voice
                )
                audio_path = tmp / f"audio_{scene['scene_order']:02d}.mp3"
                audio_path.write_bytes(audio_bytes)
                audio_paths.append(audio_path)

            update_job("running", 50)

            # Step 3: 씬별 클립 생성 (FFmpeg)
            clip_paths = []
            for i, scene in enumerate(scenes):
                clip_path = tmp / f"clip_{scene['scene_order']:02d}.mp4"
                await _create_scene_clip(
                    bg_paths[i],
                    audio_paths[i],
                    clip_path,
                    scene["caption_text"],
                    scene["duration_sec"],
                )
                clip_paths.append(clip_path)

            update_job("running", 70)

            # Step 4: 클립 concat
            merged_path = tmp / "merged.mp4"
            await _concat_clips(clip_paths, merged_path)

            update_job("running", 85)

            # Step 5: 워터마크 오버레이 + 최종 인코딩
            final_path = tmp / "final.mp4"
            logo_path = ASSETS_DIR / "baikal_logo.png"
            await _apply_watermark_and_encode(merged_path, final_path, logo_path)

            update_job("running", 92)

            # Step 6: Supabase Storage 업로드
            output_key = f"renders/{project_id}/{uuid.uuid4()}.mp4"
            with open(final_path, "rb") as f:
                db.storage.from_(settings.SUPABASE_BUCKET).upload(
                    output_key, f, {"content-type": "video/mp4"}
                )
            output_url = db.storage.from_(settings.SUPABASE_BUCKET).get_public_url(output_key)

            # 썸네일 생성
            thumbnail_url = await _create_and_upload_thumbnail(
                project_id, plan_result_json, tmpdir, db, style=config["thumbnail_style"]
            )

            # Step 7: 플랫폼별 패키지 + ZIP 생성
            hashtags = plan_result_json.get("hashtags", settings.DEFAULT_HASHTAGS)
            thumbnail_options = plan_result_json.get("thumbnail_options", [settings.BRAND_NAME])
            thumbnail_text = thumbnail_options[0] if thumbnail_options else settings.BRAND_NAME

            for channel in ["youtube", "instagram"]:
                caption = _build_channel_caption(plan_result_json, channel)
                db.table("render_outputs").insert({
                    "id": str(uuid.uuid4()),
                    "render_job_id": job_id,
                    "channel": channel,
                    "video_url": output_url,
                    "caption_text": caption,
                    "hashtags": hashtags,
                    "thumbnail_text": thumbnail_text,
                }).execute()

            # Job 완료
            update_job(
                "done", 100,
                output_url=output_url,
                thumbnail_url=thumbnail_url,
            )

            # 프로젝트 상태 done으로 업데이트
            db.table("projects").update({"status": "done"}).eq("id", project_id).execute()

    except Exception as e:
        logger.error(f"렌더링 작업 실패 (job_id: {job_id}): {e}", exc_info=True)
        update_job("failed", 100, error_message=str(e))
    finally:
        # 큐 슬롯 해제
        await render_queue.release(job_id)


def _get_scene_body(scene: dict, plan_result: dict) -> str:
    """씬 순서에 맞는 대본 body 추출"""
    try:
        return plan_result["structure"][scene["scene_order"] - 1]["content"]
    except (KeyError, IndexError):
        return ""

def _get_scene_visual_hint(scene: dict, plan_result: dict) -> str:
    """씬 순서에 맞는 visual_hint 추출"""
    try:
        # llm_service.py의 generate_script 프롬프트에 따라 scenes 리스트에서 찾음
        script_scenes = plan_result.get("scenes", [])
        return script_scenes[scene["scene_order"] - 1].get("visual_hint", "abstract")
    except (KeyError, IndexError):
        return "abstract technology"

def _create_scene_background(
    bg_path: Path, scene: dict, width: int, height: int, bg_color: tuple, accent_color: tuple
) -> None:
    """PIL로 씬 배경 이미지 생성 — 추상 그래픽 + 브랜드 디자인"""
    import math, random
    w, h = width, height
    accent = accent_color
    scene_num = scene.get("scene_order", 1)

    # 씬마다 다른 시드로 배치 일관성 유지
    rng = random.Random(scene_num * 37)

    # ── 1. 세로 그라디언트 배경 ──────────────────────────────
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    # 상단: 짙은 네이비, 하단: 미드나잇 블루
    top    = (6,  14, 32)
    bottom = (12, 28, 60)
    for y in range(h):
        t = y / h
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # ── 2. 대형 글로우 원 (빛 번짐 효과) ───────────────────
    glow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    # 씬마다 위치 다른 두 개의 글로우
    cx1 = rng.randint(w // 4, w * 3 // 4)
    cy1 = rng.randint(h // 6, h // 2)
    for radius in range(400, 0, -20):
        alpha = int(18 * (1 - radius / 400))
        gd.ellipse(
            [cx1 - radius, cy1 - radius, cx1 + radius, cy1 + radius],
            fill=(0, 140, 200, alpha)
        )
    cx2 = rng.randint(0, w // 3)
    cy2 = rng.randint(h // 2, h * 5 // 6)
    for radius in range(300, 0, -20):
        alpha = int(14 * (1 - radius / 300))
        gd.ellipse(
            [cx2 - radius, cy2 - radius, cx2 + radius, cy2 + radius],
            fill=(0, 80, 160, alpha)
        )
    img = Image.alpha_composite(img.convert("RGBA"), glow_layer)

    # ── 3. 대각선 줄무늬 (얇은 테크 라인) ──────────────────
    line_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(line_layer)
    for i in range(0, w + h, 120):
        ld.line([(i, 0), (0, i)], fill=(0, 180, 220, 18), width=1)
        ld.line([(w, i - w), (i, h)], fill=(0, 180, 220, 18), width=1)
    img = Image.alpha_composite(img, line_layer)

    # ── 4. 기하학적 도형 ────────────────────────────────────
    geo_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    geo = ImageDraw.Draw(geo_layer)

    # 우측 상단 큰 원 (반투명 테두리)
    geo.ellipse([w - 420, -120, w + 120, 420],
                outline=(0, 212, 255, 50), width=2)
    geo.ellipse([w - 320, -60, w + 60, 320],
                outline=(0, 212, 255, 30), width=1)

    # 좌측 하단 반원
    geo.ellipse([-200, h - 400, 400, h + 200],
                outline=(0, 150, 200, 40), width=2)

    # 중앙 가로줄 (씬 번호 * 위치 변화)
    mid_y = int(h * 0.38) + (scene_num - 1) * 15
    geo.rectangle([(0, mid_y), (w, mid_y + 1)],
                  fill=(0, 212, 255, 25))

    # 랜덤 소형 다이아몬드 포인트
    for _ in range(8):
        px = rng.randint(80, w - 80)
        py = rng.randint(int(h * 0.1), int(h * 0.6))
        s = rng.randint(3, 8)
        geo.polygon([(px, py - s), (px + s, py),
                     (px, py + s), (px - s, py)],
                    fill=(0, 212, 255, rng.randint(60, 120)))

    img = Image.alpha_composite(img, geo_layer)

    # ── 5. 하단 자막 영역 — 어두운 반투명 패널 ──────────────
    panel_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel_layer)
    panel_top = int(h * 0.62)
    # 부드러운 페이드 (여러 단계)
    for i, alpha in enumerate(range(0, 190, 10)):
        y_off = panel_top + i * 4
        if y_off < h:
            pd.rectangle([(0, y_off), (w, y_off + 4)],
                         fill=(4, 8, 20, alpha))
    pd.rectangle([(0, panel_top + 80), (w, h)], fill=(4, 8, 20, 185))
    img = Image.alpha_composite(img, panel_layer)

    # ── 6. 상단 액센트 바 + SCENE 번호 ──────────────────────
    top_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    td = ImageDraw.Draw(top_layer)
    td.rectangle([(0, 0), (w, 10)], fill=(*accent, 255))
    # 씬 번호 배경 뱃지
    td.rectangle([(50, 50), (310, 110)], fill=(0, 212, 255, 40))
    td.rectangle([(50, 50), (310, 110)], outline=(*accent, 120), width=1)
    img = Image.alpha_composite(img, top_layer)

    draw2 = ImageDraw.Draw(img)
    font_path = ASSETS_DIR / "NotoSansKR-Bold.ttf"
    try:
        font_scene = ImageFont.truetype(str(font_path), 34)
        font_body  = ImageFont.truetype(str(font_path), 52)
    except Exception:
        font_scene = font_body = ImageFont.load_default()

    draw2.text((70, 58), f"SCENE  {scene_num:02d}", font=font_scene,
               fill=(*accent, 255))

    # ── 7. 씬 본문 텍스트 (중앙 상단) ──────────────────────
    body_text = scene.get("caption_text", "")
    if body_text:
        chunk = 14
        lines = [body_text[i:i+chunk] for i in range(0, len(body_text), chunk)]
        y_start = int(h * 0.22)
        for line in lines[:5]:
            bbox = draw2.textbbox((0, 0), line, font=font_body)
            lw = bbox[2] - bbox[0]
            lh = bbox[3] - bbox[1]
            # 텍스트 그림자
            draw2.text(((w - lw) // 2 + 3, y_start + 3), line,
                       font=font_body, fill=(0, 0, 0, 120))
            draw2.text(((w - lw) // 2, y_start), line,
                       font=font_body, fill=(210, 230, 255))
            y_start += lh + 30

    img = img.convert("RGB")
    img.save(bg_path, "PNG")


async def _create_scene_clip(
    bg_path: Path,
    audio_path: Path,
    output_path: Path,
    caption: str,
    duration: float,
) -> None:
    """FFmpeg: 배경 이미지 + 음성 + 자막 → 씬 클립"""
    w, h = BAIKAL_BRAND["width"], BAIKAL_BRAND["height"]
    font_size = BAIKAL_BRAND["font_size"]
    caption_y = int(h * BAIKAL_BRAND["caption_y_ratio"])

    # 자막 텍스트 안전 처리
    safe_caption = caption.replace("'", "\\'").replace(":", "\\:").replace("\\", "\\\\")

    # 폰트 경로 (시스템에 설치된 한글 폰트 필요)
    font_path = ASSETS_DIR / "NotoSansKR-Bold.ttf"
    # Windows 경로: 역슬래시 → 슬래시, 드라이브 콜론 이스케이프 (C:/ → C\:/)
    font_path_str = str(font_path).replace("\\", "/").replace(":/", "\\:/")
    font_file_arg = f"fontfile='{font_path_str}':" if font_path.exists() else ""

    drawtext_filter = (
        f"drawtext={font_file_arg}"
        f"text='{safe_caption}':"
        f"fontsize=58:"
        f"fontcolor=white:"
        f"borderw=4:"
        f"bordercolor=black:"
        f"x=(w-text_w)/2:"
        f"y={caption_y - font_size // 2}"
    )

    cmd = [
        settings.FFMPEG_PATH,
        "-y",
        "-loop", "1",
        "-i", str(bg_path),
        "-i", str(audio_path),
        "-vf", f"scale={w}:{h},{drawtext_filter}",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-t", str(duration),
        str(output_path),
    ]
    await _run_ffmpeg(cmd)


async def _concat_clips(clip_paths: list[Path], output_path: Path) -> None:
    """FFmpeg concat demuxer로 클립 이어붙이기"""
    concat_list = output_path.parent / "concat_list.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for cp in clip_paths:
            f.write(f"file '{cp}'\n")

    cmd = [
        settings.FFMPEG_PATH,
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list),
        "-c", "copy",
        str(output_path),
    ]
    await _run_ffmpeg(cmd)


async def _apply_watermark_and_encode(
    input_path: Path, output_path: Path, logo_path: Path
) -> None:
    """워터마크 오버레이 + 최종 H.264 인코딩"""
    w, h = BAIKAL_BRAND["width"], BAIKAL_BRAND["height"]

    if logo_path.exists():
        cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-i", str(input_path),
            "-i", str(logo_path),
            "-filter_complex",
            f"[1:v]scale=160:-1[logo];[0:v][logo]overlay=W-w-20:20",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-profile:v", "high",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            "-s", f"{w}x{h}",
            str(output_path),
        ]
    else:
        # 로고 없으면 그냥 인코딩
        cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-i", str(input_path),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            "-s", f"{w}x{h}",
            str(output_path),
        ]
    await _run_ffmpeg(cmd)


async def _run_ffmpeg(cmd: list[str]) -> None:
    """FFmpeg 실행 (Windows 호환: threadpool에서 동기 subprocess 실행)"""
    import subprocess
    loop = asyncio.get_running_loop()

    def _run():
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if result.returncode != 0:
            stderr_text = result.stderr.decode(errors='replace')
            # FFmpeg version header is first ~500 chars; actual error is at end
            raise RuntimeError(f"FFmpeg 오류 (끝부분):\n{stderr_text[-1500:]}")

    await loop.run_in_executor(None, _run)


async def _create_and_upload_thumbnail(
    project_id: str, plan: dict, tmpdir: str, db, style: str = "gradient"
) -> str:
    """썸네일 이미지 생성 및 업로드
    
    Args:
        project_id: 프로젝트 ID
        plan: 기획 결과 JSON
        tmpdir: 임시 디렉토리
        db: Supabase 클라이언트
        style: 썸네일 스타일 ("gradient", "tech", "minimal", "bold")
    """
    w, h = BAIKAL_BRAND["width"], BAIKAL_BRAND["height"]
    
    # 썸네일 텍스트
    options = plan.get("thumbnail_options", [settings.BRAND_NAME])
    text = options[0] if options else settings.BRAND_NAME
    
    # 스타일에 따라 다른 썸네일 생성
    if style == "tech":
        img = _create_tech_thumbnail(w, h, text)
    elif style == "minimal":
        img = _create_minimal_thumbnail(w, h, text)
    elif style == "bold":
        img = _create_bold_thumbnail(w, h, text)
    else:  # gradient (default)
        img = _create_gradient_thumbnail(w, h, text)

    thumb_path = Path(tmpdir) / "thumbnail.jpg"
    img.save(thumb_path, "JPEG", quality=95)

    thumb_key = f"thumbnails/{project_id}/{uuid.uuid4()}.jpg"
    with open(thumb_path, "rb") as f:
        db.storage.from_(settings.SUPABASE_BUCKET).upload(
            thumb_key, f, {"content-type": "image/jpeg"}
        )
    return db.storage.from_(settings.SUPABASE_BUCKET).get_public_url(thumb_key)


def _create_gradient_thumbnail(w: int, h: int, text: str) -> Image.Image:
    """그라디언트 스타일 썸네일"""
    # 세로 그라디언트 배경
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    
    # 다크 블루 → 시안 그라디언트
    top_color = (10, 22, 40)      # #0A1628
    bottom_color = (0, 60, 100)   # #003C64
    
    for y in range(h):
        t = y / h
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    
    # 글로우 효과
    glow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    
    # 중앙 상단 글로우
    cx, cy = w // 2, h // 3
    for radius in range(500, 0, -25):
        alpha = int(20 * (1 - radius / 500))
        gd.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=(0, 212, 255, alpha)
        )
    
    img = Image.alpha_composite(img.convert("RGBA"), glow_layer)
    
    # 장식 요소
    deco_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco_layer)
    
    # 상단 액센트 바
    dd.rectangle([(0, 0), (w, 15)], fill=(0, 212, 255, 255))
    
    # 우측 상단 원
    dd.ellipse([w - 450, -150, w + 150, 450], outline=(0, 212, 255, 60), width=3)
    
    # 좌측 하단 원
    dd.ellipse([-250, h - 450, 350, h + 150], outline=(0, 180, 220, 50), width=2)
    
    img = Image.alpha_composite(img, deco_layer)
    
    # 텍스트 추가
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)
    
    font_path = ASSETS_DIR / "NotoSansKR-Bold.ttf"
    try:
        # 텍스트 길이에 따라 폰트 크기 조정
        font_size = 100 if len(text) <= 10 else 80 if len(text) <= 15 else 60
        font = ImageFont.truetype(str(font_path), font_size)
    except Exception:
        font = ImageFont.load_default()
    
    # 텍스트 줄바꿈 처리
    lines = _wrap_text(text, 15)
    
    # 전체 텍스트 높이 계산
    total_height = 0
    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_h = bbox[3] - bbox[1]
        line_heights.append(line_h)
        total_height += line_h
    
    total_height += (len(lines) - 1) * 30  # 줄 간격
    
    # 중앙 정렬
    y_start = (h - total_height) // 2
    
    for line, line_h in zip(lines, line_heights):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        x = (w - text_w) // 2
        
        # 텍스트 그림자
        draw.text((x + 4, y_start + 4), line, fill=(0, 0, 0, 150), font=font)
        # 메인 텍스트
        draw.text((x, y_start), line, fill=(0, 212, 255), font=font)
        
        y_start += line_h + 30
    
    # 로고 추가 (하단 중앙)
    logo_path = ASSETS_DIR / "baikal_logo.png"
    if logo_path.exists():
        try:
            logo = Image.open(logo_path).convert("RGBA")
            # 로고 크기 조정 (가로 200px)
            logo_w = 200
            logo_h = int(logo.height * (logo_w / logo.width))
            logo = logo.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
            
            # 하단 중앙에 배치
            logo_x = (w - logo_w) // 2
            logo_y = h - logo_h - 80
            
            img_rgba = img.convert("RGBA")
            img_rgba.paste(logo, (logo_x, logo_y), logo)
            img = img_rgba.convert("RGB")
        except Exception as e:
            logger.warning(f"로고 추가 실패: {e}")
    
    return img


def _create_tech_thumbnail(w: int, h: int, text: str) -> Image.Image:
    """테크 스타일 썸네일 (기하학적 패턴)"""
    img = Image.new("RGB", (w, h), (8, 16, 32))
    draw = ImageDraw.Draw(img)
    
    # 대각선 그리드 패턴
    line_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(line_layer)
    
    # 세로선
    for x in range(0, w, 80):
        ld.line([(x, 0), (x, h)], fill=(0, 212, 255, 25), width=1)
    
    # 가로선
    for y in range(0, h, 80):
        ld.line([(0, y), (w, y)], fill=(0, 212, 255, 25), width=1)
    
    img = Image.alpha_composite(img.convert("RGBA"), line_layer).convert("RGB")
    draw = ImageDraw.Draw(img)
    
    # 중앙 사각형 프레임
    margin = 100
    draw.rectangle(
        [(margin, margin), (w - margin, h - margin)],
        outline=(0, 212, 255, 150), width=5
    )
    
    # 텍스트
    font_path = ASSETS_DIR / "NotoSansKR-Bold.ttf"
    try:
        font_size = 90 if len(text) <= 10 else 70 if len(text) <= 15 else 55
        font = ImageFont.truetype(str(font_path), font_size)
    except Exception:
        font = ImageFont.load_default()
    
    lines = _wrap_text(text, 12)
    y_start = h // 2 - len(lines) * 40
    
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (w - text_w) // 2
        
        # 배경 박스
        padding = 20
        draw.rectangle(
            [(x - padding, y_start - padding), 
             (x + text_w + padding, y_start + text_h + padding)],
            fill=(0, 212, 255, 30)
        )
        
        # 텍스트
        draw.text((x, y_start), line, fill=(255, 255, 255), font=font)
        y_start += text_h + 40
    
    return img


def _create_minimal_thumbnail(w: int, h: int, text: str) -> Image.Image:
    """미니멀 스타일 썸네일"""
    img = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # 상단 액센트
    draw.rectangle([(0, 0), (w, 30)], fill=(0, 212, 255))
    
    # 텍스트
    font_path = ASSETS_DIR / "NotoSansKR-Bold.ttf"
    try:
        font_size = 95 if len(text) <= 10 else 75 if len(text) <= 15 else 60
        font = ImageFont.truetype(str(font_path), font_size)
    except Exception:
        font = ImageFont.load_default()
    
    lines = _wrap_text(text, 14)
    y_start = h // 2 - len(lines) * 50
    
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (w - text_w) // 2
        
        draw.text((x, y_start), line, fill=(10, 22, 40), font=font)
        y_start += text_h + 35
    
    # 하단 장식선
    draw.rectangle([(w // 4, h - 100), (w * 3 // 4, h - 95)], fill=(0, 212, 255))
    
    return img


def _create_bold_thumbnail(w: int, h: int, text: str) -> Image.Image:
    """대담한 스타일 썸네일"""
    img = Image.new("RGB", (w, h), (0, 212, 255))
    draw = ImageDraw.Draw(img)
    
    # 중앙 다크 박스
    box_margin = 120
    draw.rectangle(
        [(box_margin, box_margin), (w - box_margin, h - box_margin)],
        fill=(10, 22, 40)
    )
    
    # 텍스트
    font_path = ASSETS_DIR / "NotoSansKR-Bold.ttf"
    try:
        font_size = 100 if len(text) <= 10 else 80 if len(text) <= 15 else 65
        font = ImageFont.truetype(str(font_path), font_size)
    except Exception:
        font = ImageFont.load_default()
    
    lines = _wrap_text(text, 12)
    y_start = h // 2 - len(lines) * 55
    
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (w - text_w) // 2
        
        # 외곽선 효과
        for offset_x, offset_y in [(-3, -3), (3, -3), (-3, 3), (3, 3)]:
            draw.text((x + offset_x, y_start + offset_y), line, 
                     fill=(0, 212, 255), font=font)
        
        # 메인 텍스트
        draw.text((x, y_start), line, fill=(255, 255, 255), font=font)
        y_start += text_h + 40
    
    return img


def _wrap_text(text: str, max_chars: int) -> list[str]:
    """텍스트를 지정된 길이로 줄바꿈"""
    if len(text) <= max_chars:
        return [text]
    
    words = text.split()
    lines = []
    current_line = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) + len(current_line) <= max_chars:
            current_line.append(word)
            current_length += len(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
            current_length = len(word)
    
    if current_line:
        lines.append(" ".join(current_line))
    
    return lines if lines else [text]


def _build_channel_caption(plan: dict, channel: str) -> str:
    """플랫폼별 업로드 캡션 생성"""
    title = plan.get("title", settings.BRAND_NAME)
    hashtags = " ".join(f"#{tag}" for tag in plan.get("hashtags", []))
    cta = plan.get("cta", "지금 바로 문의하세요")

    if channel == "youtube":
        return f"{title}\n\n{cta}\n\n📩 {settings.BRAND_EMAIL}\n🌐 {settings.BRAND_WEBSITE}\n\n{hashtags}"
    elif channel == "instagram":
        return f"{title}\n\n{cta}\n\n{hashtags}\n\n계정 팔로우 👆"
    else:
        return title
