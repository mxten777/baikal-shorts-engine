from fastapi import APIRouter
from app.api.v1.endpoints import projects, pipeline, render, upload, auth, instagram_auth

api_router = APIRouter()

api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])
api_router.include_router(render.router, prefix="/render", tags=["render"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(auth.router, prefix="/auth/youtube", tags=["youtube-auth"])
api_router.include_router(instagram_auth.router, prefix="/auth/instagram", tags=["instagram-auth"])

# scripts / scenes 엔드포인트도 pipeline 라우터에 포함
api_router.include_router(
    pipeline.scripts_router, prefix="/scripts", tags=["scripts"]
)
api_router.include_router(
    pipeline.scenes_router, prefix="/scenes", tags=["scenes"]
)
