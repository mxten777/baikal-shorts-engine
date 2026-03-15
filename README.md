# BAIKAL Shorts Engine

텍스트 자산 → 9:16 쇼츠 영상 자동 생성 내부 플랫폼

---

## 빠른 시작

### 요구사항

- Node.js 20+
- Python 3.12+
- FFmpeg (PATH 등록 필요)
- Supabase 프로젝트
- OpenAI API Key

### 1. 환경 변수 설정

```bash
cd backend
cp .env.example .env
# .env 파일에서 SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY 설정
```

### 2. DB 마이그레이션

Supabase Dashboard > SQL Editor에서 순서대로 실행:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

### 3. Supabase Storage 버킷 생성

Supabase Dashboard > Storage에서 버킷 생성:
- 버킷 이름: `shorts-engine`
- Public bucket: **ON** (공개 설정 필수 — 비공개 시 영상 URL 접근 불가)

또는 Python으로 생성:
```python
from supabase import create_client
db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
db.storage.create_bucket("shorts-engine", {"public": True})
```

### 3. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속

### 5. Docker로 한번에 실행

```bash
cp backend/.env.example backend/.env
# .env 설정 후
docker-compose up --build
```

---

## 프로젝트 구조

```
baikal_shorts_engine/
├── frontend/        # Vite + React + TS + TailwindCSS
├── backend/         # FastAPI + Python
├── supabase/        # DB 마이그레이션
└── SPEC.md          # 전체 설계 명세서
```

---

## 사용 흐름

1. **새 프로젝트** → 원문 텍스트 입력 + 콘텐츠 유형 선택
2. **파이프라인 자동 실행** → 요약 → 기획 → 대본 → 씬 분해 → TTS
3. **대본/씬 검토 및 편집** → 인라인 수정 가능
4. **렌더링 시작** → FFmpeg 9:16 영상 생성
5. **패키지 다운로드** → 유튜브/인스타 업로드 패키지

---

## FFmpeg 설치

**Windows:**
```
winget install ffmpeg
# 또는 https://ffmpeg.org/download.html 에서 다운로드 후 PATH 추가
```

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

---

## 전체 설계 명세

[SPEC.md](./SPEC.md) 를 참고하세요.

---

## 테스트 실행

E2E 테스트 (프로젝트 생성 → 파이프라인 → 렌더링):

```bash
cd backend
pytest tests/test_e2e.py -v
```

**주의:** 서버가 실행 중이어야 하며, 실제 OpenAI API를 호출하므로 비용이 발생합니다.

---

## API 문서

서버 실행 후:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 최신 개선사항 (2026-03-15)

✅ **즉시 조치 완료:**
- TypeScript 타입 에러 해결 (tailwind.config.ts)
- CORS 환경별 화이트리스트 설정 (개발/프로덕션 분리)
- YouTube OAuth2 기본 구현 (`/api/v1/auth/youtube/authorize` 엔드포인트)
- 렌더링 큐 시스템 (동시 렌더링 2개 제한, `/api/v1/render/queue/status`)
- Sentry 에러 트래킹 연동 (SENTRY_DSN 설정 시 자동 활성화)
- E2E 테스트 코드 작성 (`tests/test_e2e.py`)

✅ **중기 조치 완료:**
- 프로젝트 검색/필터 기능 (상태, 콘텐츠 타입, 텍스트 검색)
- 렌더 설정 커스터마이징 UI (해상도, FPS, 색상, 자막 설정)
- Instagram OAuth + Reels 자동 업로드
- GitHub Actions CI/CD 파이프라인 구축

---

## 문서

**프로젝트 이해:**
- [프로젝트 소개서](./docs/PROJECT_OVERVIEW.md) - 전체 개요, 기술 스택, 아키텍처
- [사업계획서](./docs/BUSINESS_PLAN.md) - 시장 분석, 비즈니스 모델, 성장 전략

**사용 가이드:**
- [사용자 매뉴얼](./docs/USER_MANUAL.md) - 프로젝트 생성부터 영상 다운로드까지
- [관리자 매뉴얼](./docs/ADMIN_MANUAL.md) - 서버 관리, DB 관리, 트러블슈팅

**개발 참고:**
- [전체 설계 명세서](./SPEC.md) - 상세 기술 명세
- [CI/CD 가이드](./CI_CD_GUIDE.md) - GitHub Actions, Docker 배포

---

*바이칼시스템즈 내부 플랫폼 | 2026*
