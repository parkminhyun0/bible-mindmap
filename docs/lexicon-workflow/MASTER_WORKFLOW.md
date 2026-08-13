# 성경 66권 원어 한글사전 · Public-First 공통 운영 시스템

- 버전: 5.0
- 상태: ACTIVE
- Source of Truth: GitHub `parkminhyun0/bible-mindmap`
- **단일 정책 SSOT**: `docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md`
- Golden Reference: `GEN-1-1-H776`

## 1. 공통 원칙

책별 Lane은 콘텐츠·브랜치·PR을 분리하지만 검증 기준은 동일하다. 모든 책은 단일 SSOT의 C0 Rights, Full-Fidelity, corpus/morphology, Fixed Four, GPT final adjudication, unresolved-zero, protected approval, regression, Pages/Live 계약을 상속한다.

## 2. 시작 순서

1. `AGENTS.md`
2. 최신 GitHub `main` + 관련 open PR + exact head + CI/Pages
3. `docs/lexicon-workflow/TRACK_STATE.json`
4. `docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md`
5. `docs/lexicon-workflow/LLM_CHECKIN.md`
6. `memory/RESUME.json`은 checkpoint/cache로만 사용
7. relevant Notion control record

과거 `v4-EVIDENCE_FIRST_AUTONOMOUS.md` 또는 `FOUR_LLM_ONLY_POLICY.md`는 참조하지 않는다.

## 3. 권위 계층

`원문 → 직접 문맥/형태론/용례 → Rights-PASS 공개 원어사전 → Rights-PASS 공개 신학·어휘자료 → GPT·자비스·Claude·Gemini 독립 분석`.

AI 역할은 GPT·자비스·Claude·Gemini로 고정한다. 추가 LLM·로컬 모델·임시 tie-breaker는 금지한다. 사용자는 정상 Strong의 의미를 일일이 검수하지 않는다.

## 4. 데이터 흐름

`Source Registry → deterministic source structure → Full-Fidelity Evidence Packet → GPT candidate → Jarvis/Claude/Gemini independent evidence → deterministic verifier → GPT public-evidence adjudication → PASS|HOLD|DISPUTE → protected repository approval when required → Approval Registry → public dictionary → book Usage Layer → app → Pages/Live`.

## 5. 공통 Full-Fidelity 완료 조건

Strong semantic 완료는 모두 필요하다.
- C0 Rights PASS
- source identity/structure/full-fidelity PASS
- source completeness + qualifier preservation PASS
- book context/morphology/corpus PASS
- 필요한 public lexical/theological Evidence PASS
- required Fixed Four independent Evidence 존재
- deterministic verifier PASS
- GPT final public-evidence adjudication
- unresolved=0

H776은 Golden regression control이지 node-count template가 아니다.

## 6. 위험도

- R0–R2: 공통 AND gate + 위험도별 추가 deterministic gate
- R3: 네 역할 전수 독립검증 + 공개 lexical/theological Evidence
- R4: extended public research 추가. 해결되면 GPT final adjudication, 미해결은 HOLD/DISPUTE. 사용자에게 Strong별 human-final-wording을 요구하지 않는다.

Protected Registry/approved meaning 변경은 semantic 판정과 별개의 repository governance를 따른다.

## 7. 상태 기계

`PLANNED → SOURCE_REGISTERING → SOURCE_READY → FULL_FIDELITY_EVIDENCE_READY → FOUR_LLM_INDEPENDENT_REVIEW → VERIFIED → GPT_PUBLIC_EVIDENCE_ADJUDICATION → PASS|HOLD|DISPUTE → PROTECTED_APPROVAL_READY → APPROVED → RELEASED`.

## 8. 배포 완료

protected governance 통과, regression 0, build + desktop/tablet/mobile green, Pages success, Live SHA=main, shipped provenance/content verification PASS가 필요하다. 사용자 화면 확인 전 UI-visible 완료는 최대 95%, 확인 후 100%다.
