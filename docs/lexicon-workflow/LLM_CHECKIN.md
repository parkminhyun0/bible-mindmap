# 원어 한글사전 트랙 · LLM 공통 체크인 계약

원어 한글사전 작업에 허용되는 AI 역할은 **GPT · 자비스 · Claude · Gemini 네 개뿐**이다. Rights/License·Full-Fidelity 정책 SSOT는 `v4-EVIDENCE_FIRST_AUTONOMOUS.md`, AI 실행자/의미 판정 SSOT는 `FOUR_LLM_ONLY_POLICY.md`다.

## 시작/재개 순서

1. `AGENTS.md`
2. 최신 GitHub `main` + 관련 open PR + exact head + CI/review/Pages 상태
3. `docs/lexicon-workflow/TRACK_STATE.json`
4. `docs/lexicon-workflow/v4-EVIDENCE_FIRST_AUTONOMOUS.md`
5. `docs/lexicon-workflow/FOUR_LLM_ONLY_POLICY.md`
6. `memory/RESUME.json`은 checkpoint/cache로만 사용
7. `docs/lexicon-workflow/EXECUTOR_HANDOFF_STATE.json`
8. 관련 Notion 관제/책·배치 카드

우선순위는 `GitHub code/state → CI/Pages → policy SSOT → Notion → checkpoint/cache → chat history`다.

## 고정 역할

- **GPT**: Evidence Packet 기반 한국어 후보 생성 + 공개 Evidence 최종 semantic adjudication
- **자비스**: 동일 pinned baseline에서 source/context/governance 독립 감사 + CI/PR/Pages checkpoint
- **Claude**: GPT 결과를 보기 전 independent blind lexical audit
- **Gemini**: 다의어·신학 민감어·모델/사전 충돌의 independent boundary audit

그 밖의 LLM, 로컬 모델, 임시 tie-breaker는 원어사전 의미 판정 경로에 추가하지 않는다.

## 정상 자동 진행

정상 항목은 아래가 충족되면 사용자에게 Strong별 의미를 묻지 않고 진행한다.

- C0 Rights/License PASS
- pinned source + 직접 문맥/형태론/용례 Evidence
- 필요한 Rights-PASS 공개 원어 사전 및 공개 신학·어휘 Evidence
- GPT·자비스·Claude·Gemini 독립 결과
- schema/fingerprint/corpus/regression verifier
- GPT public-evidence-first 최종 판정
- material unresolved=0

미해결 semantic 충돌은 사용자에게 단어별 선택으로 넘기지 않고 `HOLD/DISPUTE`로 격리한다.

## 사용자 역할

사용자는 정상 Strong 개별 의미 검토자가 아니다. 직접 개입은 라이선스/권리 정책 결정, 신학·번역 정책 자체 변경, 보호된 승인 데이터 PR의 저장소 approval, Production/Pages 및 실제 화면 최종 확인에 한정한다.

보호된 PR approval은 semantic 의미 재판정과 별개의 저장소 governance다.

## 충돌/중복 방지

- 같은 active task/branch에 open PR이 있으면 새 PR을 만들지 않는다.
- executor가 바뀌어도 same branch/PR/Evidence baseline을 유지한다.
- current head·diff·CI는 인계 때마다 GitHub에서 새로 조회한다.
- retrieval 실패, duplicate PR, head divergence, fingerprint drift는 fail-closed.
- 책별 콘텐츠·브랜치·PR은 서로 섞지 않는다.

## Human Exception

사람에게 올리는 것은 의미 단어별 선택이 아니라 governance 예외다: rights/license 정책, theology/translation policy 자체 변경, protected approved-data repository approval, security/cost/permission, Golden regression, 배포/화면 확인.

추가 연구 후에도 semantic Evidence가 충돌하면 `HOLD/DISPUTE`; 제5 모델이나 로컬 모델로 tie-break하지 않는다.
