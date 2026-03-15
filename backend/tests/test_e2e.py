"""
E2E 테스트 — 프로젝트 생성 → 파이프라인 실행 → 렌더링 완료
pytest로 실행: pytest backend/tests/test_e2e.py -v
"""
import pytest
import httpx
import asyncio
import time
from typing import Optional

BASE_URL = "http://localhost:8000/api/v1"
TEST_PROJECT_TITLE = "[E2E TEST] AI 솔루션 소개"
TEST_SOURCE_TEXT = """
바이칼시스템즈는 AI 기반 비즈니스 자동화 솔루션을 제공합니다.
기업의 반복 업무를 자동화하고, 데이터 기반 의사결정을 지원합니다.
현재 50개 이상의 기업이 바이칼의 솔루션을 사용하고 있습니다.
"""


@pytest.fixture
async def http_client():
    """비동기 HTTP 클라이언트"""
    async with httpx.AsyncClient(timeout=300) as client:
        yield client


@pytest.mark.asyncio
async def test_full_pipeline_e2e(http_client: httpx.AsyncClient):
    """
    전체 파이프라인 E2E 테스트
    1. 프로젝트 생성
    2. 파이프라인 실행
    3. 파이프라인 완료 대기
    4. 렌더링 시작
    5. 렌더링 완료 대기
    6. 결과 다운로드
    """
    project_id: Optional[str] = None
    
    try:
        # ─── Step 1: 프로젝트 생성 ───
        print("\n[1/6] 프로젝트 생성 중...")
        create_response = await http_client.post(
            f"{BASE_URL}/projects",
            json={
                "title": TEST_PROJECT_TITLE,
                "source_text": TEST_SOURCE_TEXT,
                "content_type": "SOLUTION",
            },
        )
        assert create_response.status_code == 201, f"프로젝트 생성 실패: {create_response.text}"
        project = create_response.json()
        project_id = project["id"]
        print(f"✓ 프로젝트 생성 완료: {project_id}")
        
        # ─── Step 2: 파이프라인 실행 ───
        print("\n[2/6] 파이프라인 실행 중...")
        pipeline_response = await http_client.post(
            f"{BASE_URL}/pipeline/{project_id}/run"
        )
        assert pipeline_response.status_code == 200, f"파이프라인 실행 실패: {pipeline_response.text}"
        print("✓ 파이프라인 시작됨")
        
        # ─── Step 3: 파이프라인 완료 대기 (최대 5분) ───
        print("\n[3/6] 파이프라인 완료 대기 중...")
        pipeline_done = await wait_for_pipeline_completion(http_client, project_id, timeout=300)
        assert pipeline_done, "파이프라인이 시간 내에 완료되지 않았습니다"
        print("✓ 파이프라인 완료 (summary → plan → script → scenes → tts)")
        
        # ─── Step 4: 렌더링 시작 ───
        print("\n[4/6] 렌더링 시작 중...")
        render_response = await http_client.post(
            f"{BASE_URL}/render/{project_id}"
        )
        assert render_response.status_code == 200, f"렌더링 시작 실패: {render_response.text}"
        render_job = render_response.json()
        print(f"✓ 렌더 작업 생성: {render_job['id']}")
        
        # ─── Step 5: 렌더링 완료 대기 (최대 10분) ───
        print("\n[5/6] 렌더링 완료 대기 중...")
        render_done = await wait_for_render_completion(http_client, project_id, timeout=600)
        assert render_done, "렌더링이 시간 내에 완료되지 않았습니다"
        print("✓ 렌더링 완료")
        
        # ─── Step 6: 결과 다운로드 URL 확인 ───
        print("\n[6/6] 다운로드 URL 확인 중...")
        download_response = await http_client.get(
            f"{BASE_URL}/render/{project_id}/download"
        )
        assert download_response.status_code == 200, f"다운로드 조회 실패: {download_response.text}"
        outputs = download_response.json()
        assert len(outputs) > 0, "렌더 결과가 없습니다"
        
        print(f"\n✓ E2E 테스트 성공!")
        print(f"  - YouTube 패키지: {outputs[0]['video_url']}")
        print(f"  - 캡션: {outputs[0]['caption_text'][:50]}...")
        
    finally:
        # 테스트 후 프로젝트 삭제
        if project_id:
            print(f"\n[Cleanup] 테스트 프로젝트 삭제 중... ({project_id})")
            await http_client.delete(f"{BASE_URL}/projects/{project_id}")
            print("✓ 정리 완료")


async def wait_for_pipeline_completion(
    client: httpx.AsyncClient,
    project_id: str,
    timeout: int = 300,
    poll_interval: int = 5,
) -> bool:
    """파이프라인 완료 대기"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        response = await client.get(f"{BASE_URL}/pipeline/{project_id}/status")
        if response.status_code != 200:
            await asyncio.sleep(poll_interval)
            continue
        
        status = response.json()
        steps = status.get("steps", {})
        
        # 모든 단계가 'done' 상태인지 확인
        required_steps = ["summary", "plan", "script", "scenes", "tts"]
        all_done = all(
            steps.get(step, {}).get("status") == "done"
            for step in required_steps
        )
        
        if all_done:
            return True
        
        # 실패한 단계가 있는지 확인
        has_failed = any(
            steps.get(step, {}).get("status") == "failed"
            for step in required_steps
        )
        if has_failed:
            failed_step = next(
                step for step in required_steps
                if steps.get(step, {}).get("status") == "failed"
            )
            print(f"✗ 파이프라인 실패: {failed_step}")
            return False
        
        print(f"  파이프라인 진행 중... ({int(time.time() - start_time)}초)")
        await asyncio.sleep(poll_interval)
    
    return False


async def wait_for_render_completion(
    client: httpx.AsyncClient,
    project_id: str,
    timeout: int = 600,
    poll_interval: int = 10,
) -> bool:
    """렌더링 완료 대기"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        response = await client.get(f"{BASE_URL}/render/{project_id}/status")
        if response.status_code != 200:
            await asyncio.sleep(poll_interval)
            continue
        
        render_job = response.json()
        status = render_job.get("status")
        progress = render_job.get("progress", 0)
        
        print(f"  렌더링 진행: {status} ({progress}%)")
        
        if status == "done":
            return True
        
        if status == "failed":
            error = render_job.get("error_message", "알 수 없는 오류")
            print(f"✗ 렌더링 실패: {error}")
            return False
        
        await asyncio.sleep(poll_interval)
    
    return False
