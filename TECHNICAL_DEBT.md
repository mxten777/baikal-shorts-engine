# BAIKAL Shorts Engine - 기술부채 및 향후 작업 목록

> 생성일: 2026-03-15
> 최종 업데이트: 2026-03-16

## 🔴 긴급 (High Priority)

### 1. 사용자 인증 시스템 구현
- [ ] Supabase Auth 또는 JWT 기반 인증 구현
- [ ] auth_service.py 생성
- [ ] 현재 "default_user" 하드코딩된 부분 수정
- 📍 영향받는 파일:
  - `backend/app/api/v1/endpoints/auth.py` (Line 43)
  - `backend/app/services/upload_service.py`

### 2. CSRF 보호 구현
- [ ] State 토큰을 Redis 또는 세션에 저장
- [ ] OAuth callback에서 state 검증
- 📍 영향받는 파일:
  - `backend/app/api/v1/endpoints/auth.py` (Line 23, 39)

### 3. Credentials 암호화 저장
- [ ] YouTube credentials를 DB에 암호화하여 저장
- [ ] 암호화/복호화 유틸리티 함수 작성
- [ ] Supabase에 `user_youtube_credentials` 테이블 생성
- 📍 영향받는 파일:
  - `backend/app/services/youtube_oauth_service.py` (Line 129, 138)

## 🟡 중요 (Medium Priority)

### 4. 렌더 큐 자동 실행
- [ ] 현재: 폴링 방식으로 수동 트리거 필요
- [ ] 개선: 대기 중인 작업 자동 실행 시스템
- [ ] WebSocket 또는 SSE로 실시간 상태 업데이트
- 📍 영향받는 파일:
  - `backend/app/services/render_service.py` (Line 47)
  - `backend/app/core/render_queue.py` (Line 65)

### 5. ~~환경 변수 검증 강화~~ ✅ 완료 (2026-03-16)
- [x] 시작 시 필수 환경 변수 검증
- [x] 누락된 변수가 있으면 명확한 에러 메시지
- 📍 구현: `backend/app/core/validation.py`

### 6. ~~에러 핸들링 개선~~ ✅ 완료 (2026-03-16)
- [x] 전역 예외 핸들러 추가
- [x] 커스텀 예외 클래스 정의
- [x] API 에러 응답 표준화
- 📍 구현: `backend/app/core/exceptions.py`

### 7. 테스트 코드 추가
- [ ] 단위 테스트 작성 (pytest)
- [ ] API 엔드포인트 테스트
- [ ] 통합 테스트
- 📍 목표: 80% 이상 코드 커버리지

## 🟢 개선 사항 (Low Priority)

### 8. 코드 중복 제거
- [ ] 공통 함수 추출 (DRY 원칙)
- [ ] 유틸리티 모듈 정리
- [ ] 반복되는 DB 쿼리 패턴 추상화

### 9. 문서화 강화
- [ ] API 문서에 예제 추가
- [ ] 각 서비스 모듈에 README 추가
- [ ] 아키텍처 다이어그램 작성

### 10. 성능 최적화
- [ ] DB 쿼리 최적화 (N+1 문제 확인)
- [ ] 캐싱 전략 수립 (Redis)
- [ ] 비동기 작업 큐 (Celery/RQ)

### 11. 모니터링 및 알림
- [ ] 프로메테우스 메트릭 추가
- [ ] Grafana 대시보드 구성
- [ ] Slack/Discord 알림 연동

### 12. GitHub Actions 워크플로우 개선
- [ ] YAML 린터 에러 수정 (현재는 무시 가능)
- [ ] 자동 버전 태깅
- [ ] 배포 전 E2E 테스트 필수화

## ✅ 완료된 작업

### 2026-03-15
- [x] 로깅 시스템 구축
- [x] print() → logger 전환
- [x] .gitignore 개선
- [x] 배포 가이드 문서화
- [x] Render 백엔드 배포
- [x] Vercel 프론트엔드 배포

### 2026-03-16
- [x] 비디오 품질 개선 (CRF 23→20, preset fast, 오디오 192k)
- [x] 자막 가독성 개선 (폰트 52→58, 테두리 3→4)
- [x] LLM 프롬프트 개선 (기획 temperature 0.7, 대본 0.8)
- [x] Pexels API 연동 (씬별 동적 배경 이미지 자동 다운로드)
- [x] 프로젝트 삭제 루틴 개선 (404 자동 핸들링, 삭제 로깅)
- [x] 가비지 코드 정리 (_download_file 함수, os/zipfile import 제거)
- [x] 코드 에러 수정 (render_service.py의 output_path → bg_path)
- [x] **환경 변수 검증 시스템** (validation.py, 서버 시작 전 필수 변수 체크)
- [x] **전역 예외 핸들러** (exceptions.py, 표준화된 에러 응답)

---

## 📌 TODO 주석 상세

### 발견된 TODO 목록 (8개)

#### 1. `backend/app/services/render_service.py:47`
```python
# TODO: 큐에서 순서가 되면 자동 실행 (현재는 폴링 필요)
```
→ **작업 #4**와 연관

#### 2-3. `backend/app/services/youtube_oauth_service.py:129,138`
```python
# TODO: DB에 credentials 저장 (암호화 필요)
# TODO: DB에서 credentials 로드
```
→ **작업 #3**과 연관

#### 4-5. `backend/app/api/v1/endpoints/auth.py:23,39`
```python
# TODO: state를 세션 또는 Redis에 저장 (CSRF 방지)
# TODO: state 검증 (세션/Redis에서 확인)
```
→ **작업 #2**와 연관

#### 6. `backend/app/api/v1/endpoints/auth.py:43`
```python
# TODO: 실제 user_id 가져오기 (현재 인증 시스템 없음)
```
→ **작업 #1**과 연관

#### 7. `backend/app/api/v1/endpoints/auth.py:61`
```python
# TODO: 현재 사용자의 credentials 존재 여부 확인
```
→ **작업 #1**과 연관

#### 8. `backend/app/core/render_queue.py:65`
```python
# TODO: 대기 중인 작업 실행 트리거
```
→ **작업 #4**와 연관

---

## 🎯 다음 스프린트 제안 (우선순위순)

### Sprint 1: 보안 및 인증 (1-2주)
1. 사용자 인증 시스템 (#1)
2. CSRF 보호 (#2)
3. Credentials 암호화 (#3)

### Sprint 2: 안정성 및 테스트 (1-2주)
4. 에러 핸들링 개선 (#6)
5. 환경 변수 검증 (#5)
6. 단위 테스트 작성 (#7)

### Sprint 3: 기능 개선 (1-2주)
7. 렌더 큐 자동화 (#4)
8. 성능 최적화 (#10)
9. 모니터링 구축 (#11)

---

## 📝 참고 자료

- [FastAPI 보안 가이드](https://fastapi.tiangolo.com/tutorial/security/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Python 암호화 (cryptography)](https://cryptography.io/)
- [Redis 세션 관리](https://redis.io/docs/manual/patterns/sessions/)
- [Pytest 가이드](https://docs.pytest.org/)
