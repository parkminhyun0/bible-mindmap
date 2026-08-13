# 성경 66권 원어 한글사전 · Public-First 공통 운영 시스템

- 버전: 4.0
- 상태: ACTIVE
- 프로젝트: Bible Mind Map
- Source of Truth: GitHub `parkminhyun0/bible-mindmap`
- Rights/Full-Fidelity SSOT: `docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md`
- AI 실행/판정 SSOT: `docs/lexicon-workflow/FOUR_LLM_ONLY_POLICY.md`
- Golden Reference: `GEN-1-1-H776`

## 1. 프로젝트 내 위치

원어 한글사전 66권 구축은 `<성경 마인드맵>` 전체 작업의 장기 트랙 중 하나다. 책별 Lane은 별도 상태·브랜치·PR을 사용하며 서로의 콘텐츠 작업을 섞지 않는다.

## 2. 최종 운영 원칙

1. 공개·재사용 가능한 원문·형태론·사전을 먼저 수집하고 C0 Rights/License를 통과시킨다.
2. 사전의 node/parent/depth/order는 결정론적 parser가 만든다.
3. LLM은 구조를 발명하지 않고 Evidence Packet의 한국어 후보·감사·쟁점 판정만 수행한다.
4. 의미 권위는 AI 합의가 아니라 `원문 → 직접 문맥/형태론/용례 → Rights-PASS 공개 사전/신학 자료 → AI 분석` 순서다.
5. AI 역할은 GPT·자비스·Claude·Gemini 네 개로 고정한다.
6. 추가 LLM, 로컬 모델, 임시 tie-breaker를 의미 판단 경로에 넣지 않는다.
7. 후보는 `candidate → verified → audited → adjudicated → approved → released` 순서를 건너뛰지 않는다.
8. 사용자는 정상 Strong의 의미를 일일이 중계하지 않는다. 의미 최종 판정은 GPT가 공개 Evidence를 대조해 자동 처리하고 미해결 항목은 HOLD/DISPUTE로 격리한다.
9. 보호된 Registry PR 승인·정책 변경·배포/화면 확인은 semantic 의미 판정과 별개의 governance Gate다.

## 3. 모든 AI의 필수 체크인

GPT·자비스·Claude·Gemini는 다음 순서를 지킨다.

1. `AGENTS.md`
2. 최신 GitHub `main`, open PR, exact head, CI/Pages
3. `TRACK_STATE.json`
4. `v4-EVIDENCE_FIRST_AUTONOMOUS.md`
5. `FOUR_LLM_ONLY_POLICY.md`
6. `LLM_CHECKIN.md`
7. `memory/RESUME.json` (checkpoint/cache)
8. 관련 Notion 관제 및 대상 책 카드

충돌 시 `GitHub code/state → CI/Pages → policy SSOT → Notion → checkpoint → chat` 순서다.

## 4. 권위 계층

1. 히브리어·아람어·헬라어 원문과 직접 문맥
2. 형태론·품사·구문·실제 용례 분포
3. Rights-PASS 공개·재사용 가능한 원어 사전
4. Rights-PASS 공개 신학·어휘 참고자료와 한국어 번역 용례
5. 성경 전체의 유비와 점진적 계시
6. 개혁주의·역사문법적 안전 기준
7. GPT·자비스·Claude·Gemini 분석

개혁주의 신학은 사전 뜻을 덧칠하는 도구가 아니라 원문에 없는 교리 삽입, 어원 과잉, 의미 소급, lexical definition과 조직신학의 혼동을 차단하는 안전 규칙이다.

## 5. 역할 분담

- **GPT**: 한국어 후보 + 공개 Evidence 최종 adjudication
- **자비스**: source/context/governance 독립 감사 + CI/PR/Pages checkpoint
- **Claude**: blind lexical audit
- **Gemini**: dispute/theology boundary audit
- **사용자**: 정책·권한·보호 PR governance·배포/화면 확인

## 6. 데이터 계층

```text
Source Registry
→ deterministic source nodes
→ Evidence Packet
→ GPT candidate
→ Jarvis / Claude / Gemini independent evidence
→ deterministic verifier
→ GPT public-evidence final adjudication
→ Approval Registry governance
→ public Strong dictionary
→ book Usage Layer
→ token-sense links
```

## 7. 자동 상태 기계

```text
PLANNED
→ SOURCE_REGISTERING
→ SOURCE_READY
→ EVIDENCE_READY
→ FOUR_LLM_INDEPENDENT_REVIEW
→ VERIFIED
→ GPT_PUBLIC_EVIDENCE_ADJUDICATION
→ PASS | HOLD | DISPUTE
→ PROTECTED_APPROVAL_READY
→ APPROVED
→ RELEASED
```

`PASS`는 material unresolved=0일 때만 가능하다. HOLD/DISPUTE는 다음 safe item 진행을 막지 않는다.

## 8. 사용자 Gate

사용자에게 Strong별 의미를 묻지 않는다. 사람 Gate는 rights/license 정책 결정, theology/translation policy 자체 변경, protected approved-data PR의 repository approval, production deployment 및 실제 화면 확인에 한정한다.

## 9. Golden Reference / Full-Fidelity

H776 `אֶרֶץ`는 license-safe full-fidelity 회귀 기준이다. 새 항목은 H776의 node 수를 흉내 내는 것이 아니라 각 Rights-PASS source가 실제로 가진 의미·qualifier·morphology·provenance를 손실 없이 보존한다.

## 10. 위험도와 자동 판정

- R0–R2: 필요한 deterministic Evidence + 네 역할 독립 검증 + GPT final adjudication으로 자동 semantic PASS 가능
- R3: 네 역할 전수 독립 검증 + 공개 신학/어휘 Evidence 필수; unresolved=0이면 자동 semantic PASS
- R4: extended public research 필수. 해결되면 GPT final adjudication, 해결되지 않으면 HOLD/DISPUTE. 사용자에게 단어별 최종 문구 선택을 요구하지 않는다.

Protected Registry mutation은 위험도와 무관하게 저장소 governance Gate를 따른다.

## 11. 금지

- 제5 LLM 추가
- 로컬 호스팅 모델을 보조 판정자로 사용
- 모델 다수결을 Evidence보다 우선
- 권리 미확인 웹 자료 ingest
- unresolved를 억지 PASS
- semantic PASS 직후 protected Registry 직접 overwrite

## 12. 완료 정의

Strong semantic 완료:
- C0 Rights PASS
- source identity/structure/full-fidelity PASS
- 문맥/형태론/용례 PASS
- 필요한 공개 lexical/theological Evidence PASS
- GPT·자비스·Claude·Gemini 독립 Evidence 존재
- deterministic verifier PASS
- GPT final public-evidence adjudication
- unresolved=0

배포 완료:
- protected Registry governance 통과
- regression 0
- build + desktop/tablet/mobile green
- Pages success + Live SHA=main
- 사용자 화면 확인 전 최대 95%, 확인 후 100%
