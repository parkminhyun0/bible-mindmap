# 원어 한글사전 트랙 · LLM 공통 체크인 계약

이 문서는 GPT, 자비스(Claude-OpenClaw), Claude, Gemini 및 다른 LLM이 원어 한글사전 작업을 시작하거나 재개할 때 사용하는 최소 체크리스트다.

## 1. 시작 전 읽기

- [ ] `AGENTS.md`
- [ ] `memory/RESUME.json`
- [ ] `docs/lexicon-workflow/TRACK_STATE.json`
- [ ] `docs/lexicon-workflow/MASTER_WORKFLOW.md`
- [ ] 최신 `main` SHA와 관련 열린 PR
- [ ] 관련 CI·Pages 상태
- [ ] Notion 최상위 대시보드
- [ ] Notion 66권 원어 한글사전 관제 대시보드
- [ ] Notion Public-First LLM 공통 운영 시스템
- [ ] 대상 책·배치·Strong 카드 1건

## 2. 체크인 보고 형식

```text
TRACK: lexicon-ko-66
MAIN: <full SHA>
NOTION: synced | stale | conflict
STATE: <TRACK_STATE.state>
TARGET: <book/batch/Strong>
OWNER: jarvis | gpt | claude | gemini | human
NEXT: <one executable action>
BLOCK: none | <exact blocker>
```

## 3. 충돌 해결

- GitHub 스키마·코드·상태와 Notion이 다르면 GitHub를 기준으로 한다.
- Notion은 사실을 수정해서 동기화하며 과거 Evidence는 삭제하지 않는다.
- 같은 파일을 두 LLM이 동시에 수정하지 않는다.
- 진행 중 PR이 있으면 새 PR을 만들기 전에 범위 충돌을 검사한다.
- 모델 답변만으로 상태를 `approved` 또는 `released`로 바꾸지 않는다.

## 4. 자동 진행 가능 범위

다음은 상태와 계약이 명확하면 사용자에게 매 단계 묻지 않고 진행할 수 있다.

- 공개 출처와 라이선스 등록 상태 검사
- 결정론적 파서 실행
- Evidence Packet 생성
- JSON Schema·Strong·node·fingerprint verifier
- 후보·감사·쟁점 번들 생성
- 저위험 항목을 `reviewed`까지 이동
- GitHub 결과에 따른 Notion 상태 동기화

## 5. 반드시 멈출 Gate

- 라이선스가 `unknown` 또는 `prohibited`
- R3·R4의 최종 대표 표현
- 기존 `approved` 의미의 추가·삭제·변경
- 사전·문맥·모델 간 미해결 충돌
- 운영 Approval Registry 승격
- Production·Pages 배포
- 사용자 화면 100% 판정

## 6. 역할별 출력

### GPT

`candidate.json`, 근거·risk·미확인 질문, 사람 검토용 차이표를 만든다.

### Claude

`audit.json`에 누락·과병합·범위 오류·문맥 오류를 `confirmed/probable/unresolved`로 기록한다.

### Gemini

`dispute-review.json`에 전달된 충돌 항목만 판정하고 Evidence를 명시한다.

### 자비스

상태 복원, parser/verifier, 파일 통합, PR·CI·Pages, Notion 동기화를 담당한다.

## 7. 프로젝트 균형

이 트랙은 `<성경 마인드맵>` 전체의 한 부분이다. 최상위 대시보드에서 다른 기능·데이터·검색·디자인·운영 트랙의 우선순위를 확인하고, 원어 사전 트랙 때문에 전체 프로젝트의 긴급 버그·배포 차단·보안 작업을 방치하지 않는다.
