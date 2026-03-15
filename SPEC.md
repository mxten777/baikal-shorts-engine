# BAIKAL Shorts Engine — 완전 설계 명세서
> 작성일: 2026-03-15 | 버전: 1.0.0 | 작성: 바이칼시스템즈

---

## 1. 제품 정의
KusHsXFbMq2Rgihl
### 1.1 제품 목적
BAIKAL Shorts Engine은 **텍스트 자산 → 9:16 쇼츠 영상**까지의 전 과정을 자동화하는 내부 콘텐츠 생산 플랫폼이다.
사업계획서, 프로젝트 소개서, 블로그 초안, 서비스 설명문, 랜딩페이지 문구를 입력받아
기획·대본·씬·자막·렌더링·업로드 패키지를 일관된 파이프라인으로 처리한다.

### 1.2 핵심 가치
| 가치 | 설명 |
|------|------|
| **반복 생산** | 매주 5~10개 쇼츠를 최소 인력으로 생산 |
| **브랜드 일관성** | 바이칼 컬러·폰트·CTA를 템플릿으로 고정 |
| **텍스트 재활용** | 하나의 원문 → 유튜브/인스타/링크드인 패키지 동시 생성 |
| **SaaS 확장성** | 내부 도구 → 고객사 제공 구조로 전환 가능 |

### 1.3 지원 콘텐츠 유형
| 타입 코드 | 설명 |
|-----------|------|
| `PROBLEM` | 문제제기형 — "이 문제 알고 계셨나요?" |
| `SOLUTION` | 해결제시형 — "바이칼이 이렇게 해결했습니다" |
| `CASE` | 구축사례형 — "실제 고객사 적용 사례" |
| `COMPARE` | 비교형 — "기존 방식 vs 바이칼 방식" |
| `SALES` | 영업전환형 — "지금 바로 문의하세요" |
| `BRAND` | 대표 브랜딩형 — "대표가 직접 전하는 이야기" |

---

## 2. 핵심 사용자 시나리오

### 시나리오 A: 프로젝트 사례 홍보 (가장 빈번)
```
1. 담당자가 완료 프로젝트 소개서(PDF/텍스트)를 업로드
2. 시스템이 CASE 유형으로 기획 생성 (후크 → 배경 → 문제 → 솔루션 → 결과 → CTA)
3. 대본 확인 후 TTS 음성 생성 (또는 직접 녹음 파일 업로드)
4. 씬 6개 자동 분해 → 자막 자동 생성
5. FFmpeg 렌더링 → 썸네일 문구 + 해시태그 패키지 다운로드
6. 유튜브 쇼츠 업로드
```

### 시나리오 B: 서비스 설명 쇼츠 반복 생산
```
1. 서비스 랜딩페이지 URL 또는 텍스트 붙여넣기
2. SOLUTION 유형 → 30초 대본 자동 생성
3. 대본 인라인 편집
4. 렌더링 → 인스타그램 릴스 패키지
```

### 시나리오 C: 대표 브랜딩 쇼츠
```
1. 대표가 생각 메모(자유 텍스트) 입력
2. BRAND 유형 → 1인칭 대본 생성
3. 직접 녹음 파일 업로드
4. Whisper 자막 자동 정렬
5. 렌더링 → 유튜브 + 인스타 동시 패키지
```

---

## 3. 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                       │
│   Vite + React + TypeScript + TailwindCSS + shadcn/ui           │
│                                                                 │
│  [원문입력] → [기획보드] → [대본에디터] → [씬매니저] → [렌더대시보드]  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST + SSE (스트리밍)
┌──────────────────────────▼──────────────────────────────────────┐
│                    BACKEND (FastAPI / Python)                   │
│                                                                 │
│  API Layer (v1)                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ /project │ │/pipeline │ │ /render  │ │ /upload  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │             │            │             │                │
│  Service Layer                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  LLM     │ │  TTS     │ │  FFmpeg  │ │ Platform │          │
│  │ Service  │ │ Service  │ │  Render  │ │  Upload  │          │
│  │(GPT-4o)  │ │(OpenAI)  │ │ Service  │ │  Service │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                        │                                        │
│  ┌─────────────────────▼────────────────────────────────┐      │
│  │              Background Worker (asyncio)             │      │
│  │  Pipeline 단계별 순차 처리 + 진행상황 SSE 스트리밍     │      │
│  └──────────────────────────────────────────────────────┘      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
┌─────────▼──────┐ ┌───────▼──────┐ ┌──────▼────────┐
│   Supabase     │ │  OpenAI API  │ │  YouTube API  │
│  PostgreSQL    │ │ (GPT-4o,TTS, │ │  Instagram    │
│  Storage       │ │  Whisper)    │ │  Graph API    │
└────────────────┘ └──────────────┘ └───────────────┘
```

### 기술 결정 근거
| 결정 | 이유 |
|------|------|
| FastAPI | 비동기 처리 필수 (FFmpeg, LLM 스트리밍) |
| Supabase | PostgreSQL + Storage + Realtime을 하나로 |
| SSE (Server-Sent Events) | 파이프라인 진행상황 실시간 표시, WebSocket보다 단순 |
| asyncio worker | Celery 없이 MVP 단계 처리 가능, 추후 교체 용이 |
| OpenAI TTS | 별도 TTS 서버 없이 즉시 사용 |

---

## 4. 폴더 구조

```
baikal_shorts_engine/
├── frontend/
│   ├── public/
│   │   └── baikal-logo.svg
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts           # axios 인스턴스
│   │   │   ├── projects.ts         # 프로젝트 CRUD
│   │   │   ├── pipeline.ts         # 파이프라인 실행/상태
│   │   │   └── render.ts           # 렌더링 요청/다운로드
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui 자동 생성
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── pipeline/
│   │   │   │   ├── PipelineStatus.tsx   # 단계별 진행 표시
│   │   │   │   └── StepIndicator.tsx
│   │   │   ├── editor/
│   │   │   │   ├── ScriptEditor.tsx     # 대본 인라인 편집
│   │   │   │   └── SceneCard.tsx        # 씬 카드
│   │   │   └── project/
│   │   │       ├── ProjectCard.tsx
│   │   │       └── ContentTypeSelector.tsx
│   │   ├── hooks/
│   │   │   ├── usePipeline.ts      # SSE 파이프라인 구독
│   │   │   └── useProject.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # 프로젝트 목록
│   │   │   ├── NewProject.tsx      # 원문 입력
│   │   │   ├── ProjectDetail.tsx   # 기획/대본/씬 편집
│   │   │   └── RenderResult.tsx    # 렌더 결과 + 다운로드
│   │   ├── stores/
│   │   │   └── projectStore.ts     # Zustand 전역 상태
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── projects.py     # CRUD
│   │   │       │   ├── pipeline.py     # 실행 + SSE
│   │   │       │   ├── render.py       # FFmpeg 렌더
│   │   │       │   └── upload.py       # 플랫폼 업로드
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── config.py           # 환경변수
│   │   │   └── supabase.py         # Supabase 클라이언트
│   │   ├── services/
│   │   │   ├── llm_service.py      # GPT-4o 기획/대본/자막
│   │   │   ├── tts_service.py      # OpenAI TTS
│   │   │   ├── whisper_service.py  # 음성 → 자막
│   │   │   ├── render_service.py   # FFmpeg 파이프라인
│   │   │   ├── thumbnail_service.py
│   │   │   └── upload_service.py
│   │   ├── schemas/
│   │   │   ├── project.py
│   │   │   ├── pipeline.py
│   │   │   └── render.py
│   │   ├── workers/
│   │   │   └── pipeline_worker.py  # 비동기 파이프라인 오케스트레이터
│   │   └── main.py
│   ├── assets/
│   │   └── templates/
│   │       ├── baikal_bg.png       # 바이칼 기본 배경
│   │       └── baikal_logo.png     # 워터마크용 로고
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_rls_policies.sql
│
├── docker-compose.yml
└── README.md
```

---

## 5. DB 설계 (Supabase / PostgreSQL)

### ERD 요약
```
users ──< projects ──< pipeline_runs ──< scenes
                   ──< scripts
                   ──< render_jobs ──< render_outputs
```

### 테이블 상세

#### `projects` — 콘텐츠 프로젝트 단위
```sql
id             uuid PRIMARY KEY
title          text NOT NULL
source_text    text NOT NULL          -- 원문
content_type   text NOT NULL          -- PROBLEM|SOLUTION|CASE|COMPARE|SALES|BRAND
status         text DEFAULT 'draft'   -- draft|processing|done|failed
created_by     uuid REFERENCES auth.users
created_at     timestamptz DEFAULT now()
updated_at     timestamptz DEFAULT now()
```

#### `pipeline_runs` — 파이프라인 실행 이력
```sql
id             uuid PRIMARY KEY
project_id     uuid REFERENCES projects
step           text   -- summary|plan|script|scenes|tts|render|package
status         text   -- pending|running|done|failed
result_json    jsonb  -- 각 단계 결과 저장
error_message  text
started_at     timestamptz
finished_at    timestamptz
```

#### `scripts` — 생성된 대본
```sql
id             uuid PRIMARY KEY
project_id     uuid REFERENCES projects UNIQUE
hook           text   -- 후크 문장 (첫 3초)
body           text   -- 본문 대본
cta            text   -- CTA 문장
tts_voice      text DEFAULT 'nova'  -- OpenAI TTS 음성
audio_url      text   -- Supabase Storage URL
version        int DEFAULT 1
```

#### `scenes` — 씬 분해
```sql
id             uuid PRIMARY KEY
project_id     uuid REFERENCES projects
scene_order    int NOT NULL
duration_sec   float DEFAULT 5.0
description    text   -- 씬 설명 (배경/동작)
caption_text   text   -- 씬 자막
visual_hint    text   -- 배경색/이미지 힌트
```

#### `render_jobs` — FFmpeg 렌더 작업
```sql
id             uuid PRIMARY KEY
project_id     uuid REFERENCES projects
status         text DEFAULT 'pending'  -- pending|running|done|failed
progress       int DEFAULT 0          -- 0~100
render_config  jsonb  -- 해상도, 배경, 자막 스타일 등
output_url     text   -- 최종 영상 URL
thumbnail_url  text
package_url    text   -- zip 패키지 URL
created_at     timestamptz DEFAULT now()
```

#### `render_outputs` — 채널별 출력 패키지
```sql
id             uuid PRIMARY KEY
render_job_id  uuid REFERENCES render_jobs
channel        text   -- youtube|instagram|linkedin
video_url      text
caption_text   text   -- 플랫폼별 본문 캡션
hashtags       text[]
thumbnail_text text
created_at     timestamptz DEFAULT now()
```

---

## 6. API 명세 (v1)

### Base URL: `/api/v1`

#### Projects
```
POST   /projects              — 프로젝트 생성 (원문 + 유형 입력)
GET    /projects              — 목록 조회 (status 필터)
GET    /projects/{id}         — 상세 조회
DELETE /projects/{id}         — 삭제
```

#### Pipeline
```
POST   /pipeline/{project_id}/run    — 전체 파이프라인 실행
GET    /pipeline/{project_id}/status — 현재 상태 조회
GET    /pipeline/{project_id}/stream — SSE 진행상황 스트림
POST   /pipeline/{project_id}/step/{step_name} — 특정 단계 재실행
```

#### Script
```
GET    /scripts/{project_id}         — 대본 조회
PUT    /scripts/{project_id}         — 대본 수정
POST   /scripts/{project_id}/tts     — TTS 생성 요청
POST   /scripts/{project_id}/upload-audio — 직접 녹음 파일 업로드
```

#### Scenes
```
GET    /scenes/{project_id}          — 씬 목록
PUT    /scenes/{project_id}/{scene_id} — 씬 수정
```

#### Render
```
POST   /render/{project_id}          — 렌더링 시작
GET    /render/{project_id}/status   — 렌더 진행상황
GET    /render/{project_id}/download — 패키지 다운로드 URL 반환
```

#### Upload
```
POST   /upload/{project_id}/youtube  — 유튜브 업로드
POST   /upload/{project_id}/instagram — 인스타그램 업로드
```

---

## 7. 핵심 서비스 로직

### 7.1 LLM 파이프라인 프롬프트 구조 (GPT-4o)

**Step 1: 핵심 요약 추출**
```
시스템: "당신은 B2B 마케터입니다. 주어진 텍스트에서 핵심 메시지 3가지를 추출하세요."
유저: [source_text]
출력: JSON { "key_messages": [...], "target_audience": "...", "main_value": "..." }
```

**Step 2: 쇼츠 기획 생성**
```
시스템: "30초 쇼츠 기획을 {content_type} 유형으로 생성하세요. 후크→문제→해결→CTA 구조."
유저: [key_messages] + content_type
출력: JSON { "title": "...", "hook": "...", "structure": [...], "cta": "..." }
```

**Step 3: 대본 생성**
```
시스템: "300자 내외 쇼츠 대본. 1문장 = 1씬. 구어체. 바이칼시스템즈 화자."
유저: [plan]
출력: JSON { "hook": "...", "scenes": [{"order":1,"text":"...","duration":5},...], "cta": "..." }
```

**Step 4: 썸네일 문구 생성**
```
시스템: "클릭률 높은 썸네일 텍스트 3가지 (15자 이내)"
유저: [plan + hook]
출력: JSON { "options": ["...", "...", "..."], "recommended": 0 }
```

### 7.2 TTS 처리
- OpenAI TTS API (`tts-1-hd`, voice: `nova` 기본값)
- 씬별 음성 파일 생성 후 Supabase Storage 업로드
- 직접 녹음 시: Whisper API로 자막 자동 정렬

### 7.3 FFmpeg 렌더링 시퀀스
```
1. 씬별 정적 배경 이미지 생성 (PIL)
2. 씬별 자막 오버레이 (ffmpeg drawtext)
3. 씬별 음성(TTS mp3) 결합
4. 씬 클립 concat
5. 바이칼 로고 워터마크 오버레이
6. 인트로 0.5초 + 아웃트로 1초 추가
7. H.264 / 9:16 (1080x1920) 출력
```

---

## 8. 렌더링 파이프라인

```
[씬 데이터]
    │
    ▼
[per-scene: PIL 배경 생성]
  - 바이칼 컬러 배경 (#0A1628 기본)
  - 씬 번호별 visual_hint 적용
    │
    ▼
[per-scene: FFmpeg concat]
  ffmpeg -loop 1 -i bg_{n}.png         ← 배경
         -i audio_{n}.mp3               ← TTS/녹음
         -vf "drawtext=fontfile=...:    ← 자막
              text='{caption}':
              fontsize=48:fontcolor=white:
              x=(w-text_w)/2:y=h*0.75"
         -t {duration} scene_{n}.mp4
    │
    ▼
[concat 필터]
  ffmpeg -i scene_0.mp4 -i scene_1.mp4 ... \
         -filter_complex "[0][1][2]...concat=n={N}:v=1:a=1[v][a]" \
         -map "[v]" -map "[a]" merged.mp4
    │
    ▼
[워터마크 + 최종 인코딩]
  ffmpeg -i merged.mp4 -i logo.png \
         -filter_complex "overlay=W-w-20:20" \
         -c:v libx264 -preset fast -crf 23 \
         -c:a aac -b:a 128k \
         -s 1080x1920 final.mp4
    │
    ▼
[Supabase Storage 업로드]
[render_jobs.output_url 업데이트]
```

### 바이칼 브랜드 템플릿 고정값
```python
BAIKAL_BRAND = {
    "bg_color": "#0A1628",        # 다크 네이비
    "accent_color": "#00D4FF",    # 바이칼 시안
    "font_family": "NotoSansKR",
    "caption_font_size": 52,
    "caption_position": "bottom_center",  # y = h*0.75
    "caption_bg_opacity": 0.6,
    "logo_position": "top_right",
    "cta_style": "bold_cyan",
    "resolution": "1080x1920",
    "fps": 30,
}
```

---

## 9. UI 화면 설계

### 화면 1: Dashboard (프로젝트 목록)
```
┌─────────────────────────────────────────────┐
│ BAIKAL Shorts Engine    [+ 새 프로젝트]      │
├──────┬──────────────────────────────────────┤
│      │  전체  처리중(2)  완료(8)  실패(1)   │
│ 사이  ├──────────────────────────────────────┤
│ 드   │  [카드] AI플랫폼 구축사례  CASE ✓   │
│ 바   │  [카드] 바이칼 서비스소개  SOLUTION  │
│      │  [카드] 대표 메시지 2026  BRAND  ●  │
│      │  ...                                 │
└──────┴──────────────────────────────────────┘
```

### 화면 2: 새 프로젝트 (원문 입력)
```
┌─────────────────────────────────────────────┐
│ ← 새 프로젝트 만들기                         │
│                                             │
│  제목: [________________]                   │
│                                             │
│  콘텐츠 유형:                               │
│  [문제제기] [해결제시] [구축사례]           │
│  [비교형]  [영업전환] [대표브랜딩]          │
│                                             │
│  원문 입력:                                 │
│  ┌─────────────────────────────────┐        │
│  │ 텍스트 붙여넣기 또는 파일 업로드 │        │
│  │ (PDF / TXT / DOCX 지원)         │        │
│  └─────────────────────────────────┘        │
│                                             │
│           [파이프라인 시작 →]               │
└─────────────────────────────────────────────┘
```

### 화면 3: 파이프라인 진행 + 결과 편집
```
┌─────────────────────────────────────────────┐
│ AI플랫폼 구축사례                           │
│                                             │
│  ① 요약추출 ✓  ② 기획생성 ✓  ③ 대본생성 ●  │
│  ④ 씬분해 ○   ⑤ TTS생성 ○   ⑥ 렌더링 ○    │
│                                             │
│  [대본 편집 탭] [씬 편집 탭] [설정 탭]     │
│  ─────────────────────────────────────────  │
│  후크: "AI 도입하려다 3개월 날린 적 있나요?" │
│  [편집 가능한 텍스트 영역...]               │
│                                             │
│  씬 #1 [5초] "문제 상황 설명..."  [편집]   │
│  씬 #2 [5초] "바이칼 접근법..."   [편집]   │
│  ...                                        │
│                                             │
│      [렌더링 시작]  [TTS만 재생성]          │
└─────────────────────────────────────────────┘
```

### 화면 4: 렌더 결과 + 패키지 다운로드
```
┌─────────────────────────────────────────────┐
│ 렌더 완료 ✓                                 │
│  ┌────────┐  썸네일 텍스트 옵션:            │
│  │ 영상   │  ● "AI 도입 3개월 실패, 우리가" │
│  │ 미리   │  ○ "바이칼이 6주 만에 해냈다"  │
│  │ 보기   │  ○ "레거시 시스템 탈출 가이드"  │
│  └────────┘                                 │
│                                             │
│  유튜브 패키지:  [다운로드↓]  [바로 업로드↑]│
│  인스타 패키지:  [다운로드↓]  [바로 업로드↑]│
│                                             │
│  해시태그: #AI구축 #바이칼 #IT컨설팅 ...   │
└─────────────────────────────────────────────┘
```

---

## 10. 4주 개발 일정

### Week 1: 기반 구조
| 일자 | 작업 |
|------|------|
| D1-2 | Supabase 프로젝트 생성, DB 마이그레이션, RLS 정책 |
| D3-4 | FastAPI 기반 구조 + `/projects` CRUD API |
| D5   | Frontend Vite 세팅 + Dashboard, NewProject 화면 골격 |

### Week 2: LLM 파이프라인
| 일자 | 작업 |
|------|------|
| D6-7 | LLM Service (요약 → 기획 → 대본 → 씬 분해) 구현 |
| D8   | Pipeline Worker (순차 처리 + SSE 스트리밍) |
| D9   | Frontend: PipelineStatus 컴포넌트 + SSE 구독 |
| D10  | 대본/씬 편집 UI 완성 |

### Week 3: 렌더링 파이프라인
| 일자 | 작업 |
|------|------|
| D11-12 | TTS Service (OpenAI) + Whisper 자막 정렬 |
| D13-14 | FFmpeg Render Service (씬별 → concat → 워터마크) |
| D15    | 렌더 진행상황 API + Frontend 연동 |

### Week 4: 패키지 완성 + 테스트
| 일자 | 작업 |
|------|------|
| D16-17 | 썸네일 생성 + 패키지 ZIP 생성 + 다운로드 |
| D18-19 | 유튜브 업로드 API 연동 (OAuth 포함) |
| D20    | E2E 테스트 3건 + 버그 수정 + Vercel/백엔드 배포 |

---

## 11. MVP 완료 기준

아래 체크리스트를 모두 통과해야 MVP 완료로 인정한다.

- [ ] 텍스트 입력 → 쇼츠 대본 자동 생성 (30초 이내)
- [ ] 6가지 콘텐츠 유형별 대본 품질 검증 (팀 리뷰)
- [ ] 대본 인라인 편집 후 렌더링 정상 작동
- [ ] TTS 음성 생성 및 씬 자막 자동 정렬
- [ ] 9:16 1080×1920 MP4 렌더링 출력
- [ ] 바이칼 브랜드 템플릿 (컬러/로고/자막 스타일) 고정 적용
- [ ] 썸네일 텍스트 3가지 옵션 생성
- [ ] 유튜브 업로드 패키지 (영상 + 제목 + 설명 + 해시태그) 다운로드
- [ ] 프로젝트 3개 동시 처리 시 크래시 없음
- [ ] 렌더링 실패 시 에러 메시지 표시 및 재시도 가능

---
