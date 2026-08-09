# 성경 66권 원어 한글사전 · Public-First LLM 공통 운영 시스템

- 버전: 3.0
- 상태: 운영 기준 제안·시스템 장착
- 프로젝트: Bible Mind Map
- Source of Truth: GitHub `parkminhyun0/bible-mindmap`
- Control Dashboard: Notion `📚 원어 한글사전 번역 · 66권 통합 관제 대시보드`
- Golden Reference: `GEN-1-1-H776`

## 1. 프로젝트 내 위치

원어 한글사전 66권 구축은 `<성경 마인드맵>` 전체 작업을 구성하는 장기 트랙 중 하나다. 기능 개발, 성경 데이터, 정렬·다언어 검색, 정경 추적, AI 검색, 디자인·모바일, 운영·보안 트랙을 중단하거나 독점하지 않는다.

- 이 트랙은 별도 상태 파일과 승인 Gate로 진행한다.
- 다른 트랙과 같은 파일·PR·배포 범위가 충돌하면 한 번에 하나의 PR만 진행한다.
- 최상위 대시보드에는 전체 프로젝트 중 현재 비중과 차단 상태만 요약한다.

## 2. 최종 운영 원칙

1. 공개·재사용 가능한 구약·신약 원문·형태론·사전을 먼저 수집한다.
2. 모든 출처는 라이선스·귀속·LLM 입력·파생물 배포 가능 여부를 등록한다.
3. 사전의 노드·부모·깊이·순서는 결정론적 파서가 만든다.
4. LLM은 구조를 발명하지 않고 Evidence Packet의 한국어 후보·감사·쟁점 판정만 수행한다.
5. AI 합의가 아니라 원문·직접 문맥·공개 사전 Evidence로 판단한다.
6. 후보는 `candidate → verified → audited → reviewed → approved → released` 순서를 건너뛰지 않는다.
7. 승인되지 않은 데이터는 운영 Registry와 UI에 노출하지 않는다.
8. 사용자는 모든 항목을 중계하지 않고 R3·R4 예외, 배치 승인, 실제 화면 확인만 담당한다.

## 3. 모든 LLM의 필수 체크인

원어 사전 관련 작업을 시작하거나 재개하는 GPT·자비스·Claude·Gemini 및 다른 LLM은 다음 순서를 지킨다.

1. GitHub `AGENTS.md`
2. GitHub `memory/RESUME.json`
3. GitHub `docs/lexicon-workflow/TRACK_STATE.json`
4. 이 문서 `MASTER_WORKFLOW.md`
5. GitHub 최신 `main`, 열린 관련 PR, CI·Pages 상태
6. Notion 최상위 `📖 성경 마인드맵 아이디어 · 대시보드`
7. Notion `📚 원어 한글사전 번역 · 66권 통합 관제 대시보드`
8. Notion `Public-First 원어 한글사전 · LLM 공통 운영 시스템`
9. 대상 책·배치·Strong의 관련 카드 한 건

충돌 시 우선순위는 `GitHub 코드·스키마·상태 → CI·Pages → Notion 관제 → 과거 대화`다. Notion과 GitHub가 다르면 GitHub를 기준으로 Notion을 동기화한다.

## 4. 권위 계층

1. 히브리어·아람어·헬라어 원문과 직접 문맥
2. 형태론·품사·구문·실제 용례 분포
3. 공개·재사용 가능한 원어 사전
4. 공개 한국어 자료와 성경 번역 용례
5. 성경 전체의 유비와 점진적 계시
6. 개혁주의·역사문법적 안전 기준
7. LLM 분석

개혁주의 신학은 사전 뜻을 덧칠하는 도구가 아니라 원문에 없는 교리 삽입, 어원 과잉, 신약 의미의 구약 소급, 사전 정의와 조직신학의 혼동을 차단하는 안전 규칙이다.

## 5. 역할 분담

### 자비스 · Claude-OpenClaw

- 실행 관제자
- 최신 상태 복원, 배치 생성, 결정론적 파서·verifier 실행
- Claude 독립 감사 연결
- 충돌 항목 추출, PR·CI·배포·Notion 동기화
- 같은 결과를 그대로 승인하지 않고 반증을 시도한다.

### GPT

- Evidence Packet 기반 한국어 후보 생성
- 음역·대표 뜻·sense 번역·책별 Usage·근거·위험 표시
- 차이표와 사람 검토 번들 작성
- 구조·노드·출처를 임의로 추가하거나 삭제하지 않는다.

### Claude

- GPT 후보를 보기 전 Evidence Packet 독립 분석
- 누락, 과병합, 중복, 범위 확대·축소, 문맥 오류, 신학적 삽입 감사
- 결과를 `confirmed / probable / unresolved`로 기록한다.

### Gemini

- 전수 번역자가 아니라 쟁점 판정자
- GPT·Claude 충돌, R3·R4, 사전 간 충돌, 대표 한국어 선택 문제만 검토한다.
- 근거 없는 판정은 채택하지 않는다.

### 박 목사님

- 프로젝트 우선순위와 범위 승인
- 신학 핵심어·논쟁 항목·기존 승인 변경의 최종 판단
- 배치 승인과 실제 화면 확인

## 6. 데이터 계층

```text
Source Registry
  → 결정론적 source nodes
  → Evidence Packet v2
  → Translation Candidate
  → Audit / Adjudication
  → Approval Registry
  → 공통 Strong 사전
  → 책별 Usage Layer
  → 구절별 token-sense 연결
```

필수 스키마:

- `SourceRegistry.schema.json`
- `StrongIdentity.schema.json`
- `EvidencePacket.schema.json`
- `TranslationRecord.schema.json`
- `BookUsageLayer.schema.json`
- `ApprovalRegistry.schema.json`
- `BatchStatus.schema.json`

Strong 앞자리 0은 제거하되 Extended Strong 접미 문자는 보존한다. 허용 언어는 `hebrew`, `aramaic`, `greek`이다.

## 7. Golden Reference

`GEN-1-1-H776`은 영구 회귀 사례다.

- PR #220 병합 SHA `7ec135fe540442a0e88c8c46fd954ccf6bb2cc23`
- `H0776 → H776` 정규화
- BDB 26개 정의 노드
- `pilot-reviewed` 표시 Gate
- 데스크톱·모바일 한글 Drawer
- verifier·Notion Evidence·사용자 확인

H776은 재번역 대상이 아니다. 새 Evidence Packet·Registry·React 통합이 기존 26개 노드와 UI 결과를 손실 없이 재현하는지 검증하는 fixture다.

## 8. 자동·반자동 상태 기계

```text
PLANNED
→ SOURCE_REGISTERING
→ SOURCE_READY
→ EVIDENCE_READY
→ GPT_GENERATING
→ GENERATED
→ VERIFYING
→ VERIFIED
→ CLAUDE_AUDITING
→ AUDITED
→ GEMINI_REQUIRED | AUTO_ADJUDICATION_READY
→ REVIEWED
→ HUMAN_EXCEPTION_REQUIRED | BATCH_APPROVAL_READY
→ APPROVED
→ RELEASED
```

자동 진행 허용:

- 공개 출처 조회와 등록 상태 검사
- 결정론적 구조 추출
- Evidence Packet 생성
- 형식·라이선스·node·fingerprint verifier
- 저위험 항목의 감사 번들 생성
- GitHub 상태 파일과 Notion 진행률 동기화

사람 Gate:

- 라이선스 `unknown`
- R3·R4
- 기존 승인 번역 변경
- 모델과 사전 간 미해결 충돌
- Approval Registry 승격
- Production·Pages 배포와 사용자 화면 확인

## 9. 데이터 전달·UI

대규모 데이터를 단일 JS 번들에 포함하지 않는다.

```text
public/lexicon/ko/
├── registry.json
├── manifests/{hebrew,aramaic,greek}.json
├── shards/H0001-H0100.json ...
└── usage/GEN, LUK ...
```

`LexiconPopup`이 Strong을 정규화하고 승인 Registry를 조회한 뒤 해당 shard를 lazy fetch한다. H776 DOM Bridge는 회귀 비교 후 React 네이티브 통합으로 교체한다.

## 10. 위험도

- R0: 고유명사·명백한 음역 — 자동 reviewed 가능
- R1: 일반 어휘 — Claude 배치 감사 후 자동 reviewed 가능
- R2: 다의어·문맥 의존 — Claude 전수 감사
- R3: 신학 핵심어 — Gemini 쟁점 판정과 배치 승인
- R4: 자료 충돌·불확실·기존 승인 변경 — 사람 개별 판단

## 11. 구현 순서

1. Source Registry와 스키마 동결
2. 결정론적 BDB 파서와 H776 Evidence Packet 마이그레이션
3. 범용 verifier·라이선스 Gate·H776 회귀 CI
4. Approval Registry·manifest·shard lazy loader
5. `LexiconPopup` React 네이티브 통합
6. 창세기 Gold 20–30
7. 누가복음 대표 G 10·Gold Set
8. 검증된 계약으로 나머지 64권 증분 확장

현재 단계에서는 1,694개 번역, Ollama preflight, 로컬 A/B 모델 실행, 대규모 UI 변경을 시작하지 않는다.

## 12. 완료 정의

Strong 완료:

- 출처 라이선스 승인
- Strong·lemma·언어·구조 검증
- 모든 의미에 Evidence 존재
- GPT 생성·verifier·Claude 감사 완료
- 필요 시 Gemini 판정
- `reviewed` 또는 `approved`

배포 완료:

- 승인 데이터만 Registry 포함
- 기존 승인 데이터 회귀 0
- build·Desktop·Tablet·Mobile 통과
- Pages 성공·Live SHA=main SHA
- 박 목사님 화면 확인 전 최대 95%, 확인 후 100%
