from fastapi import APIRouter, HTTPException, status
from typing import Optional, List
from app.schemas.project import ProjectCreate, ProjectResponse
from app.core.supabase import get_supabase
import uuid
from datetime import datetime, timezone

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate):
    db = get_supabase()
    project_id = str(uuid.uuid4())
    now = _now()

    data = {
        "id": project_id,
        "title": payload.title,
        "source_text": payload.source_text,
        "content_type": payload.content_type,
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }

    result = db.table("projects").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="프로젝트 생성 실패")

    return result.data[0]


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[str] = None,
    content_type: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    프로젝트 목록 조회 (필터 + 검색)
    
    Args:
        status: 프로젝트 상태 필터 (draft|processing|done|failed)
        content_type: 콘텐츠 유형 필터 (PROBLEM|SOLUTION|CASE|COMPARE|SALES|BRAND)
        search: 제목 또는 원문 텍스트 검색 (부분 일치)
    """
    db = get_supabase()
    query = db.table("projects").select("*").order("created_at", desc=True)
    
    if status:
        query = query.eq("status", status)
    
    if content_type:
        query = query.eq("content_type", content_type)
    
    result = query.execute()
    projects = result.data or []
    
    # 검색어 필터링 (Supabase에서 LIKE 검색이 제한적이므로 Python에서 처리)
    if search:
        search_lower = search.lower()
        projects = [
            p for p in projects
            if search_lower in p.get("title", "").lower()
            or search_lower in p.get("source_text", "").lower()
        ]
    
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    db = get_supabase()
    result = db.table("projects").select("*").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    return result.data[0]


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str):
    """프로젝트 삭제 (CASCADE로 관련 데이터 모두 삭제)"""
    db = get_supabase()
    
    # 프로젝트 존재 여부 확인
    result = db.table("projects").select("id, title").eq("id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    
    # 삭제 전 로깅 (디버깅용)
    project_title = result.data[0].get("title", "Unknown")
    print(f"[DELETE] 프로젝트 삭제 시작: {project_id} ({project_title})")
    
    # 삭제 실행 (CASCADE로 관련 테이블 자동 삭제)
    delete_result = db.table("projects").delete().eq("id", project_id).execute()
    
    print(f"[DELETE] 프로젝트 삭제 완료: {project_id}")
    return None
