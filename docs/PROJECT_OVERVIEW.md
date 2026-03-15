# BAIKAL Shorts Engine - 프로젝트 소개서

**텍스트 자산을 9:16 쇼츠 영상으로 자동 변환하는 AI 기반 내부 플랫폼**

바이칼시스템즈 | 2026년 3월  
버전: 1.0.0 MVP

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [핵심 기능](#핵심-기능)
3. [기술 스택](#기술-스택)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [주요 모듈](#주요-모듈)
6. [개발 타임라인](#개발-타임라인)
7. [향후 로드맵](#향후-로드맵)

---

## 프로젝트 개요

### 배경
- **문제**: 마케팅 자산(블로그 글, 사례 연구, 제안서 등)을 SNS 쇼츠 영상으로 수작업 변환하는 데 시간과 비용 소모
- **해결**: AI 기반 자동화로 텍스트 → 요약 → 대본 → 씬 분해 → TTS → 영상 렌더링까지 원클릭 처리

### 목표
- ⏱️ **생산성 향상**: 평균 2-3시간 소요 작업을 10분 이내로 단축
- 💰 **비용 절감**: 외주 제작 대비 90% 이상 비용 절감
- 🎯 **품질 일관성**: 브랜드 가이드라인에 맞춘 자동화된 시각적 템플릿
- 📈 **확장성**: YouTube Shorts, Instagram Reels 다중 플랫폼 배포 자동화

### 핵심 가치 제안
1. **완전 자동화**: 텍스트 입력만으로 업로드 가능한 영상 패키지 생성
2. **AI 콘텐츠 최적화**: GPT-4o 기반 요약, 기획, 대본 생성
3. **브랜드 일관성**: 바이칼시스템즈 CI/CD 적용된 통일된 비주얼
4. **검토 및 수정**: 각 단계별 인라인 편집 기능
5. **원클릭 배포**: Instagram/YouTube OAuth 연동 자동 업로드

---

## 핵심 기능

### 1. **AI 콘텐츠 파이프라인**
```
원문 입력 → GPT 요약 → 콘텐츠 기획 → 대본 생성 → 씬 분해 → TTS 음성 생성
```

**지원 콘텐츠 유형:**
- 💡 **PROBLEM**: 문제 제기형
- ✅ **SOLUTION**: 해결 제시형
- 🏗️ **CASE**: 구축 사례형
- ⚖️ **COMPARISON**: 비교 분석형
- 🎯 **CONVERSION**: 영업 전환형
- 👔 **BRAND**: 대표 브랜딩형

### 2. **비주얼 렌더링 엔진**
- **해상도**: 1080×1920 (9:16), 1080×1350 (4:5), 1080×1080 (1:1)
- **FPS**: 24/30/60fps 선택 가능
- **커스터마이징**: 배경색, 강조색, 자막 색상/크기/위치 조정
- **FFmpeg 기반**: 고품질 비디오 인코딩

### 3. **프로젝트 관리**
- 📊 **대시보드**: 전체 프로젝트 상태 한눈에 파악
- 🔍 **검색/필터**: 상태별, 콘텐츠 타입별, 키워드 검색
- ✏️ **인라인 편집**: 대본, 씬 텍스트 실시간 수정
- 🎬 **렌더링 큐**: 동시 렌더링 2개 제한, 대기열 관리

### 4. **소셜 미디어 연동**
- **Instagram**: Reels 자동 업로드 (OAuth2, Long-lived Token)
- **YouTube**: Shorts 업로드 준비 (OAuth2 구현 완료)
- **패키지 다운로드**: 영상 + 썸네일 + 메타데이터 ZIP

### 5. **품질 관리**
- **에러 트래킹**: Sentry 연동으로 실시간 오류 모니터링
- **렌더 큐 시스템**: 서버 과부하 방지
- **E2E 테스트**: 전체 플로우 자동 테스트

---

## 기술 스택

### 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18.3 | UI 프레임워크 |
| TypeScript | 5.x | 타입 안정성 |
| Vite | 5.x | 빌드 도구 |
| TailwindCSS | 3.x | 스타일링 |
| React Query | 5.x | 서버 상태 관리 |
| React Router | 6.x | 라우팅 |
| Axios | 1.x | HTTP 클라이언트 |
| Lucide React | - | 아이콘 |

### 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Python | 3.12 | 런타임 |
| FastAPI | 0.115 | API 프레임워크 |
| Pydantic | 2.9 | 데이터 검증 |
| Supabase | 2.28 | DB + Storage |
| OpenAI | 1.54 | GPT-4o + TTS |
| FFmpeg | - | 비디오 렌더링 |
| Pillow | 11.0 | 이미지 생성 |

### 인프라 & DevOps
| 기술 | 용도 |
|------|------|
| GitHub Actions | CI/CD 자동화 |
| Docker | 컨테이너화 |
| Docker Compose | 로컬 개발 환경 |
| Vercel | 프론트엔드 배포 (계획) |
| Sentry | 에러 트래킹 |
| Supabase Cloud | DB + Storage 호스팅 |

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  React + TypeScript + TailwindCSS (Vite)                    │
│  - Dashboard, Project Detail, Settings                      │
│  - RenderConfigDialog, InstagramConnect                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       Backend API                            │
│  FastAPI (Python 3.12)                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Endpoints:                                           │  │
│  │ - /projects (CRUD)                                   │  │
│  │ - /pipeline (요약, 기획, 대본, 씬, TTS)             │  │
│  │ - /render (비디오 렌더링, 큐 관리)                  │  │
│  │ - /upload (패키지 다운로드)                         │  │
│  │ - /auth/instagram, /auth/youtube (OAuth)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Services:                                            │  │
│  │ - PipelineService (AI 콘텐츠 생성)                  │  │
│  │ - RenderService (FFmpeg 비디오 생성)                │  │
│  │ - TTSService (OpenAI TTS)                            │  │
│  │ - InstagramOAuthService (Reels 업로드)              │  │
│  │ - RenderQueueService (큐 관리)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────┬────────────────┬────────────────┬──────────────────────┘
     │                │                │
     ▼                ▼                ▼
┌─────────┐    ┌──────────┐    ┌────────────┐
│Supabase │    │ OpenAI   │    │  FFmpeg    │
│ (DB +   │    │ GPT-4o + │    │  (Video    │
│ Storage)│    │   TTS    │    │ Encoding)  │
└─────────┘    └──────────┘    └────────────┘
```

### 데이터베이스 스키마
- **projects**: 프로젝트 메타데이터, 상태 관리
- **scripts**: GPT 생성 대본 저장
- **scenes**: 씬별 분해 데이터, TTS 파일 경로
- **render_jobs**: 렌더링 작업 상태, 설정, 결과
- **social_media_credentials**: OAuth 토큰 저장 (암호화)

---

## 주요 모듈

### 1. Pipeline Service (`backend/app/services/pipeline_service.py`)
**역할**: GPT-4o를 활용한 AI 콘텐츠 생성 파이프라인

**주요 메서드:**
```python
async def summarize(text: str, content_type: str) -> str
async def plan(summary: str, content_type: str) -> str
async def generate_script(plan: str, content_type: str) -> str
async def break_into_scenes(script_id: str) -> List[Scene]
async def generate_tts(scene_id: str) -> str  # audio_url 반환
```

**특징:**
- 콘텐츠 유형별 맞춤 프롬프트
- 구조화된 JSON 응답 파싱
- 에러 핸들링 및 재시도 로직

### 2. Render Service (`backend/app/services/render_service.py`)
**역할**: FFmpeg 기반 9:16 쇼츠 영상 생성

**렌더링 프로세스:**
```python
1. 씬별 배경 이미지 생성 (Pillow)
2. TTS 오디오 다운로드
3. FFmpeg concat 필터로 통합
4. 자막 오버레이 (ASS 포맷)
5. Supabase Storage 업로드
6. 메타데이터 업데이트
```

**커스터마이징 옵션:**
- 해상도, FPS, 배경색, 강조색, 자막 설정

### 3. Instagram OAuth Service (`backend/app/services/instagram_oauth_service.py`)
**역할**: Instagram Graph API를 통한 Reels 자동 업로드

**OAuth 플로우:**
```
1. 인증 URL 생성 (/auth/url)
2. 사용자 인증 (Instagram 팝업)
3. 콜백 처리 (/auth/callback)
4. Short-lived → Long-lived Token 교환
5. DB 저장 (social_media_credentials 테이블)
6. Reels 업로드 (/upload/reel)
```

### 4. Render Queue Service (`backend/app/services/render_queue.py`)
**역할**: 동시 렌더링 제한 및 대기열 관리

**특징:**
- 최대 2개 동시 렌더링
- 상태별 필터링 (pending, rendering, completed, failed)
- 우선순위 큐 (FIFO)

---

## 개발 타임라인

### Phase 1: MVP 개발 (2026-01 ~ 2026-02)
- ✅ 프로젝트 CRUD
- ✅ AI 파이프라인 (요약 → 대본 → 씬 분해 → TTS)
- ✅ FFmpeg 비디오 렌더링
- ✅ 기본 UI/UX (Dashboard, ProjectDetail)

### Phase 2: 품질 개선 (2026-02 ~ 2026-03-10)
- ✅ TypeScript 타입 에러 수정
- ✅ CORS 환경별 설정
- ✅ Sentry 에러 트래킹
- ✅ 렌더링 큐 시스템
- ✅ E2E 테스트 작성

### Phase 3: 기능 확장 (2026-03-10 ~ 2026-03-15)
- ✅ 프로젝트 검색/필터
- ✅ 렌더 설정 커스터마이징
- ✅ Instagram OAuth + Reels 업로드
- ✅ GitHub Actions CI/CD 구축

### Phase 4: 배포 준비 (2026-03-15 ~)
- 🔄 프로덕션 환경 설정
- 🔄 Docker 이미지 배포
- 🔄 모니터링 대시보드 구축
- 🔄 사용자 매뉴얼 작성

---

## 향후 로드맵

### 단기 계획 (Q2 2026)
- [ ] YouTube Shorts OAuth 완전 구현
- [ ] 썸네일 자동 생성 (GPT-4 Vision)
- [ ] 멀티 해상도 동시 렌더링
- [ ] 프로젝트 템플릿 기능
- [ ] 렌더링 진행률 실시간 표시

### 중기 계획 (Q3-Q4 2026)
- [ ] 사용자 권한 관리 (Admin/Editor/Viewer)
- [ ] 팀 협업 기능 (코멘트, 승인 플로우)
- [ ] AI 음성 클로닝 (ElevenLabs 연동)
- [ ] 영상 A/B 테스트 기능
- [ ] 자동 자막 번역 (다국어 지원)

### 장기 계획 (2027)
- [ ] 오픈 API 제공 (외부 연동)
- [ ] 모바일 앱 (React Native)
- [ ] 실시간 협업 편집 (WebSocket)
- [ ] AI 기반 성과 분석 (조회수/참여도 예측)
- [ ] SaaS 전환 고려

---

## 성과 지표

### 개발 효율성
- **코드 품질**: ESLint, Flake8, MyPy 통과율 100%
- **테스트 커버리지**: 60% 이상 (목표 80%)
- **빌드 시간**: 프론트엔드 < 2분, 백엔드 < 1분
- **배포 자동화**: GitHub Actions CI/CD 구축 완료

### 비즈니스 임팩트 (예상)
- **생산성 향상**: 작업 시간 85% 단축
- **비용 절감**: 외주 제작 대비 연간 ₩50M 절감
- **콘텐츠 생산량**: 월 평균 100개 → 500개 (5배 증가)
- **플랫폼 확장**: 블로그 위주 → YouTube + Instagram 진출

---

## 연락처

**프로젝트 책임자**: 바이칼시스템즈 개발팀  
**이메일**: contact@baikalsystems.com  
**웹사이트**: www.baikalsystems.com

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026년 3월 15일

---

*본 문서는 바이칼시스템즈의 내부 자산이며, 외부 공개 시 사전 승인이 필요합니다.*
