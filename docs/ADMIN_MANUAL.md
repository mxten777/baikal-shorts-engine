# BAIKAL Shorts Engine - 관리자 매뉴얼

**시스템 관리 및 운영 가이드**

버전: 1.0.0  
최종 업데이트: 2026년 3월 16일  
**배포 완료: 2026년 3월 16일**

---

## 📋 목차

1. [서버 설정 및 배포](#서버-설정-및-배포)
2. [데이터베이스 관리](#데이터베이스-관리)
3. [환경 변수 설정](#환경-변수-설정)
4. [모니터링 및 로깅](#모니터링-및-로깅)
5. [백업 및 복구](#백업-및-복구)
6. [트러블슈팅](#트러블슈팅)
7. [보안 관리](#보안-관리)
8. [성능 최적화](#성능-최적화)

---

## 서버 설정 및 배포

### 로컬 개발 환경

#### 백엔드 실행
```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

**접속**: http://localhost:8000/docs

#### 프론트엔드 실행
```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

**접속**: http://localhost:5173

### Docker Compose 배포

#### 전체 스택 실행
```bash
# .env 파일 설정
cp backend/.env.example backend/.env

# 컨테이너 빌드 및 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

**접속**:
- 프론트엔드: http://localhost:80
- 백엔드: http://localhost:8000

#### 컨테이너 관리
```bash
# 컨테이너 상태 확인
docker-compose ps

# 특정 서비스 재시작
docker-compose restart backend

# 볼륨 정리
docker-compose down -v
```

### 프로덕션 배포

#### GitHub Actions CI/CD
1. **GitHub Secrets 설정**
   ```
   Repository Settings → Secrets and variables → Actions
   ```

   필수 Secrets:
   ```
   SUPABASE_URL
   SUPABASE_SERVICE_KEY
   OPENAI_API_KEY
   DOCKER_USERNAME
   DOCKER_PASSWORD
   VERCEL_TOKEN (프론트엔드 배포 시)
   ```

2. **자동 배포 플로우**
   ```
   main 브랜치 푸시 → CI/CD 트리거
   ├── Lint & Test
   ├── Docker 이미지 빌드
   ├── Docker Hub 푸시
   └── 프로덕션 서버 배포 (계획)
   ```

3. **수동 배포**
   ```bash
   # Docker Hub 로그인
   docker login

   # 이미지 빌드
   docker build -t yourusername/baikal-shorts-backend:latest ./backend
   docker build -t yourusername/baikal-shorts-frontend:latest ./frontend

   # 이미지 푸시
   docker push yourusername/baikal-shorts-backend:latest
   docker push yourusername/baikal-shorts-frontend:latest
   ```

#### Vercel 프론트엔드 배포
```bash
cd frontend

# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프로젝트 연결
vercel link

# 배포
vercel --prod
```

---

## 데이터베이스 관리

### Supabase 설정

#### 초기 설정
1. **Supabase 프로젝트 생성**
   - https://supabase.com → New Project
   - Region: Seoul (가장 가까운 리전)

2. **DB 마이그레이션 실행**
   ```
   Supabase Dashboard → SQL Editor
   ```

   순서대로 실행:
   ```sql
   -- 1. 스키마 생성
   supabase/migrations/001_initial_schema.sql

   -- 2. RLS 정책 설정
   supabase/migrations/002_rls_policies.sql
   ```

3. **Storage 버킷 생성**
   ```
   Supabase Dashboard → Storage → New Bucket
   ```
   - Bucket Name: `shorts-engine`
   - Public: **ON** 필수
   - File Size Limit: 100MB

#### 스키마 개요
```sql
-- 프로젝트 메타데이터
projects (
  id UUID PRIMARY KEY,
  title TEXT,
  source_text TEXT,
  content_type TEXT,
  status TEXT,
  summary TEXT,
  plan TEXT,
  created_at TIMESTAMP
)

-- 대본
scripts (
  id UUID PRIMARY KEY,
  project_id UUID,
  content TEXT,
  created_at TIMESTAMP
)

-- 씬
scenes (
  id UUID PRIMARY KEY,
  script_id UUID,
  sequence_number INT,
  text TEXT,
  duration FLOAT,
  audio_url TEXT,
  created_at TIMESTAMP
)

-- 렌더 작업
render_jobs (
  id UUID PRIMARY KEY,
  project_id UUID,
  status TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  render_config JSONB,
  error_message TEXT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
)

-- 소셜 미디어 인증
social_media_credentials (
  id UUID PRIMARY KEY,
  user_id TEXT,
  platform TEXT,
  credentials JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### 데이터베이스 쿼리

#### 프로젝트 통계
```sql
-- 전체 프로젝트 수
SELECT COUNT(*) FROM projects;

-- 상태별 프로젝트 수
SELECT status, COUNT(*) 
FROM projects 
GROUP BY status;

-- 콘텐츠 타입별 분포
SELECT content_type, COUNT(*) 
FROM projects 
GROUP BY content_type;
```

#### 렌더링 성능 분석
```sql
-- 평균 렌더링 시간
SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds
FROM render_jobs
WHERE status = 'completed';

-- 실패율
SELECT 
  COUNT(CASE WHEN status = 'failed' THEN 1 END)::FLOAT / COUNT(*) * 100 as failure_rate
FROM render_jobs;
```

#### 저장소 사용량
```sql
-- Supabase Dashboard → Storage → shorts-engine
-- 또는 CLI:
supabase storage du shorts-engine
```

### 데이터 정리

#### 오래된 프로젝트 삭제 (90일 이상)
```sql
-- 주의: 실제 삭제 전 백업 필수!
DELETE FROM projects 
WHERE created_at < NOW() - INTERVAL '90 days' 
AND status = 'completed';
```

#### 실패한 렌더 작업 정리
```sql
DELETE FROM render_jobs 
WHERE status = 'failed' 
AND created_at < NOW() - INTERVAL '30 days';
```

---

## 환경 변수 설정

### 백엔드 환경 변수 (`.env`)

```bash
# ─── 앱 설정 ────────────────────────────────────────────────
APP_ENV=production  # development | production
SECRET_KEY=your-super-secret-key-min-32-chars

# ─── Supabase ───────────────────────────────────────────────
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...  # Service Role Key (비밀!)
SUPABASE_BUCKET=shorts-engine

# ─── OpenAI ─────────────────────────────────────────────────
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o  # 또는 gpt-4o-mini (비용 절감)
TTS_VOICE=nova  # alloy|echo|fable|onyx|nova|shimmer

# ─── YouTube (선택) ────────────────────────────────────────
YOUTUBE_CLIENT_ID=xxx.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-xxx
YOUTUBE_REDIRECT_URI=https://yourdomain.com/auth/youtube/callback

# ─── Instagram (선택) ─────────────────────────────────────
INSTAGRAM_APP_ID=123456789
INSTAGRAM_APP_SECRET=abcdef123456
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/auth/instagram/callback

# ─── Sentry (에러 트래킹) ──────────────────────────────────
SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/123456

# ─── CORS ───────────────────────────────────────────────────
# JSON 배열 형식
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]

# ─── FFmpeg ─────────────────────────────────────────────────
FFMPEG_PATH=ffmpeg  # 또는 절대 경로

# ─── 브랜드 정보 ────────────────────────────────────────────
BRAND_NAME=바이칼시스템즈
BRAND_EMAIL=contact@baikalsystems.com
BRAND_WEBSITE=www.baikalsystems.com
DEFAULT_HASHTAGS=["바이칼시스템즈","IT컨설팅","디지털전환"]
```

### 프론트엔드 환경 변수 (`.env`)

```bash
# Vite 환경 변수는 VITE_ 접두사 필수
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 환경별 설정 관리

```bash
# 개발 환경
backend/.env.development
CORS_ORIGINS=["http://localhost:5173"]

# 프로덕션 환경
backend/.env.production
CORS_ORIGINS=["https://yourdomain.com"]

# 환경 선택
APP_ENV=production  # .env에서 설정
```

---

## 모니터링 및 로깅

### Sentry 연동

#### 설정
```python
# backend/app/main.py (이미 구현됨)
import sentry_sdk

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("APP_ENV"),
    traces_sample_rate=1.0 if APP_ENV == "development" else 0.2
)
```

#### 사용
- Sentry Dashboard: https://sentry.io
- 실시간 에러 알림
- 성능 모니터링 (APM)
- 릴리스 추적

### 로그 관리

#### 백엔드 로그
```bash
# uvicorn 로그
uvicorn app.main:app --log-level info

# 파일로 저장
uvicorn app.main:app --log-config logging.conf > app.log 2>&1

# 로그 레벨
# - debug: 개발용 상세 로그
# - info: 일반 정보 (권장)
# - warning: 경고
# - error: 오류
# - critical: 치명적 오류
```

#### Docker 로그
```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend

# 최근 100줄
docker-compose logs --tail=100 backend

# 로그 파일로 저장
docker-compose logs > docker.log
```

### 성능 메트릭

#### API 응답 시간 모니터링
```python
# Sentry APM 또는 Prometheus + Grafana 사용 권장
# 현재는 Uvicorn 기본 로그로 확인 가능
INFO: 127.0.0.1:xxxxx - "GET /api/v1/projects HTTP/1.1" 200 OK (0.123s)
```

#### 렌더링 성능
```sql
-- 평균 렌더링 시간
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) / 60 as avg_minutes
FROM render_jobs
WHERE status = 'completed'
AND created_at > NOW() - INTERVAL '7 days';
```

---

## 백업 및 복구

### 데이터베이스 백업

#### Supabase 자동 백업
- **무료 플랜**: 자동 백업 미제공
- **Pro 플랜**: 매일 자동 백업 (7일 보관)

#### 수동 백업
```bash
# pg_dump 사용 (Supabase 연결 정보 필요)
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql

# 또는 Supabase CLI
supabase db dump -f backup.sql
```

#### 정기 백업 스크립트
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > $BACKUP_FILE

# S3 업로드 (선택)
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

# 30일 이상 백업 삭제
find . -name "backup_*.sql" -mtime +30 -delete
```

**Cron 설정 (매일 02:00)**:
```cron
0 2 * * * /path/to/backup.sh
```

### Storage 백업

#### Supabase Storage 백업
```python
# backup_storage.py
from supabase import create_client
import os

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# 모든 파일 목록
files = supabase.storage.from_("shorts-engine").list()

# 로컬에 다운로드
for file in files:
    data = supabase.storage.from_("shorts-engine").download(file["name"])
    with open(f"backup/{file['name']}", "wb") as f:
        f.write(data)
```

### 복구

#### 데이터베이스 복구
```bash
# PostgreSQL 복구
psql -h db.xxxxx.supabase.co -U postgres -d postgres < backup.sql

# 또는 Supabase Dashboard → SQL Editor에서 직접 실행
```

#### Storage 복구
```python
# restore_storage.py
import os
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

for file in os.listdir("backup/"):
    with open(f"backup/{file}", "rb") as f:
        supabase.storage.from_("shorts-engine").upload(file, f)
```

---

## 트러블슈팅

### 일반적인 오류

#### 1. 서버 시작 실패
**증상**: `uvicorn app.main:app` 실행 시 오류

**원인 및 해결**:
```bash
# 포트 충돌
netstat -ano | findstr :8000  # Windows
lsof -i :8000  # macOS/Linux
# → 기존 프로세스 종료

# 모듈 import 오류
pip install -r requirements.txt  # 의존성 재설치

# 환경 변수 누락
cp .env.example .env  # .env 파일 확인
```

#### 2. Supabase 연결 실패
**증상**: `Connection refused` 또는 `401 Unauthorized`

**해결**:
```python
# .env 파일 확인
SUPABASE_URL=https://xxxxx.supabase.co  # 정확한지 확인
SUPABASE_SERVICE_KEY=eyJhbG...  # Service Role Key 사용

# 연결 테스트
python -c "from app.core.supabase import get_supabase; db=get_supabase(); print(db.table('projects').select('*').limit(1).execute())"
```

#### 3. OpenAI API 오류
**증상**: `RateLimitError` 또는 `AuthenticationError`

**해결**:
```bash
# API 키 확인
echo $OPENAI_API_KEY

# 크레딧 잔액 확인
# https://platform.openai.com/account/billing

# Rate Limit 대응: gpt-4o-mini 사용
OPENAI_MODEL=gpt-4o-mini  # 비용 1/10
```

#### 4. FFmpeg 오류
**증상**: `FileNotFoundError: ffmpeg not found`

**해결**:
```bash
# FFmpeg 설치 확인
ffmpeg -version

# PATH 추가 (Windows)
setx PATH "%PATH%;C:\ffmpeg\bin"

# .env 설정
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe  # 절대 경로
```

#### 5. 렌더링 실패
**증상**: 렌더 작업 상태가 `failed`

**디버깅**:
```sql
-- 에러 메시지 확인
SELECT error_message, render_config 
FROM render_jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 5;
```

**일반적인 원인**:
- TTS 파일 누락 → 씬 재생성
- Storage 용량 초과 → 오래된 파일 삭제
- FFmpeg 메모리 부족 → 서버 스펙 업그레이드

### 디버깅 도구

#### 로그 레벨 증가
```bash
# 개발 모드 (상세 로그)
uvicorn app.main:app --reload --log-level debug
```

#### Python 디버거
```python
# 서비스 코드에 중단점 삽입
import pdb; pdb.set_trace()
```

#### API 테스트
```bash
# curl로 엔드포인트 테스트
curl -X GET http://localhost:8000/api/v1/projects

# Swagger UI 활용
# http://localhost:8000/docs
```

---

## 보안 관리

### 인증 및 권한

#### 현재 상태
- **인증 없음**: 내부 플랫폼으로 단일 사용자 가정
- **향후 계획**: JWT 기반 인증, 사용자 권한 관리 (Q3 2026)

#### 임시 보안 조치
```python
# backend/app/core/security.py (추가 권장)
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    if api_key != os.getenv("ADMIN_API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key
```

### Secrets 관리

#### 환경 변수 암호화
```bash
# .env 파일 권한 제한
chmod 600 .env  # 소유자만 읽기/쓰기

# Git에서 제외 (.gitignore)
.env
.env.local
*.key
```

#### Supabase Service Key 보호
- **절대 노출 금지**: GitHub, 클라이언트 코드
- **주기적 갱신**: 3개월마다 재발급 권장
- **역할 제한**: Anon Key는 RLS 정책 적용, Service Key는 서버 전용

### CORS 설정

```python
# backend/app/main.py
CORS_ORIGINS = json.loads(os.getenv("CORS_ORIGINS", '["http://localhost:5173"]'))

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # 화이트리스트만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### HTTPS 강제

#### 프로덕션 배포 시
```python
# backend/app/main.py
if os.getenv("APP_ENV") == "production":
    from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
    app.add_middleware(HTTPSRedirectMiddleware)
```

---

## 성능 최적화

### 백엔드 최적화

#### 1. Uvicorn Worker 수 증가
```bash
# 프로덕션 배포
uvicorn app.main:app --workers 4  # CPU 코어 수만큼
```

#### 2. 비동기 처리 활용
```python
# 이미 구현됨: async def로 모든 엔드포인트 작성
# OpenAI, Supabase 호출 시 await 사용
```

#### 3. 렌더링 큐 튜닝
```python
# backend/app/services/render_queue.py
MAX_CONCURRENT_RENDERS = 4  # 서버 스펙에 맞게 조정
```

### 데이터베이스 최적화

#### 인덱스 추가
```sql
-- 자주 조회되는 컬럼 인덱싱
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_render_jobs_project_id ON render_jobs(project_id);
```

#### 쿼리 최적화
```sql
-- N+1 문제 방지: JOIN 사용
SELECT p.*, r.video_url 
FROM projects p
LEFT JOIN render_jobs r ON r.project_id = p.id
LIMIT 20;
```

### 프론트엔드 최적화

#### 1. 번들 크기 줄이기
```bash
# 빌드 분석
npm run build -- --analyze

# 불필요한 패키지 제거
npm prune
```

#### 2. 코드 스플리팅
```tsx
// React lazy loading (이미 구현됨)
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
```

#### 3. 이미지 최적화
- WebP 포맷 사용
- 썸네일 크기 제한 (최대 500KB)

### CDN 사용

#### Supabase Storage CDN
- 자동 CDN 제공 (Cloudflare)
- 지연 시간 최소화

#### Vercel Edge Network
- 프론트엔드 전역 배포
- 자동 캐싱

---

## 유지보수 체크리스트

### 일일 체크
- [ ] Sentry 대시보드에서 에러 확인
- [ ] 렌더링 큐 상태 확인 (대기 작업 수)
- [ ] Storage 사용량 확인

### 주간 체크
- [ ] 데이터베이스 백업 확인
- [ ] 실패한 렌더 작업 검토 및 정리
- [ ] OpenAI API 사용량 및 비용 확인

### 월간 체크
- [ ] 패키지 업데이트 (npm, pip)
- [ ] 보안 패치 적용
- [ ] Supabase 크레딧 잔액 확인
- [ ] 성능 메트릭 분석

---

## 지원 및 연락처

**개발팀**: dev@baikalsystems.com  
**긴급 문의**: +82-10-xxxx-xxxx  
**GitHub Issues**: https://github.com/baikalsystems/shorts-engine/issues

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026년 3월 15일  
**© 2026 바이칼시스템즈. All rights reserved.**
