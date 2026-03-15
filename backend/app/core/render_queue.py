"""
렌더 큐 관리자 — 동시 렌더링 제한 및 작업 큐 관리
"""
import asyncio
from typing import Dict, Optional
from datetime import datetime


class RenderQueue:
    """
    인메모리 렌더 큐 (MVP)
    향후 Redis Queue 또는 Celery로 교체 가능
    """
    
    def __init__(self, max_concurrent: int = 2):
        """
        Args:
            max_concurrent: 동시 실행 가능한 최대 렌더 작업 수
        """
        self.max_concurrent = max_concurrent
        self.active_jobs: Dict[str, dict] = {}  # job_id -> {project_id, started_at}
        self.queue: asyncio.Queue = asyncio.Queue()
        self._lock = asyncio.Lock()
    
    async def can_start(self, job_id: str) -> bool:
        """렌더 작업 시작 가능 여부 확인"""
        async with self._lock:
            return len(self.active_jobs) < self.max_concurrent
    
    async def acquire(self, job_id: str, project_id: str) -> bool:
        """
        렌더 작업 슬롯 획득
        
        Returns:
            True: 즉시 시작 가능
            False: 대기열에 추가됨
        """
        async with self._lock:
            if len(self.active_jobs) < self.max_concurrent:
                self.active_jobs[job_id] = {
                    "project_id": project_id,
                    "started_at": datetime.utcnow(),
                }
                return True
            else:
                # 대기열에 추가
                await self.queue.put((job_id, project_id))
                return False
    
    async def release(self, job_id: str):
        """
        렌더 작업 슬롯 해제 및 대기 중인 작업 시작
        """
        async with self._lock:
            if job_id in self.active_jobs:
                del self.active_jobs[job_id]
            
            # 대기열에서 다음 작업 가져오기
            if not self.queue.empty():
                next_job_id, next_project_id = await self.queue.get()
                self.active_jobs[next_job_id] = {
                    "project_id": next_project_id,
                    "started_at": datetime.utcnow(),
                }
                # TODO: 대기 중인 작업 실행 트리거
                # 현재는 폴링 방식으로 처리 (render_service에서 체크)
    
    def get_queue_status(self) -> dict:
        """큐 상태 반환"""
        return {
            "active_count": len(self.active_jobs),
            "max_concurrent": self.max_concurrent,
            "queue_size": self.queue.qsize(),
            "active_jobs": [
                {
                    "job_id": job_id,
                    "project_id": info["project_id"],
                    "started_at": info["started_at"].isoformat(),
                }
                for job_id, info in self.active_jobs.items()
            ],
        }
    
    def get_position(self, job_id: str) -> Optional[int]:
        """대기열에서의 위치 반환 (0부터 시작, None이면 대기 중 아님)"""
        # asyncio.Queue는 순회 불가능하므로 별도 추적 필요
        # 현재는 간단히 active 여부만 반환
        if job_id in self.active_jobs:
            return -1  # 실행 중
        return None  # 대기열 위치 추적 미구현


# 전역 싱글턴 인스턴스
render_queue = RenderQueue(max_concurrent=2)
