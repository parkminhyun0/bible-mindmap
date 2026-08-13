# 누가복음 G2 · 4-LLM Public-Evidence 자동 판정 Runbook

## 고정 실행자 집합

누가복음 원어 한글사전의 의미 생성·감사·쟁점 판정에 허용되는 AI 역할은 **GPT · 자비스 · Claude · Gemini 네 개뿐**이다. 추가 모델, 임시 tie-breaker, 로컬 호스팅 모델은 운영 경로에 포함하지 않는다.

- **GPT**: 한국어 후보 생성 + 최종 Public-Evidence 판정자
- **자비스**: 동일 pinned baseline에서 source/context/governance 독립 감사
- **Claude**: GPT 결과를 보지 않은 lexical blind audit
- **Gemini**: 다의어·신학 민감어·모델 간 충돌의 독립 boundary audit

각 역할의 독립 결과가 완료되기 전에는 다른 결과를 보여주지 않는다. 모델 다수결은 권위가 아니다.

## 의미 판단 권위 순서

1. Rights-PASS pinned 헬라어 원자료
2. 누가복음 직접 문맥·형태론·실제 용례
3. Rights-PASS 공개 Greek lexicon 자료
4. Rights-PASS 공개 신학·어휘 참고자료
5. GPT/자비스/Claude/Gemini 분석

신학 자료는 lexical 의미에 교리를 덧칠하는 용도가 아니라 의미 경계·오해 가능성·본문 전체 용례를 교차검증하는 Evidence로 사용한다.

## 자동 판정 흐름

`source/context packet`
→ `public lexical/theological Evidence intake + C0 Rights PASS`
→ `GPT independent candidate`
→ `Jarvis independent audit`
→ `Claude independent blind audit`
→ `Gemini independent dispute/theology audit`
→ `deterministic schema/fingerprint verifier`
→ `GPT public-evidence-first final adjudication`
→ `PASS | HOLD | DISPUTE`
→ `unresolved=0 인 PASS만 semantic promotion-ready`
→ `protected Registry PR governance`
→ `Pages / Live SHA / 화면 확인`.

GPT 최종 판정은 네 모델의 합의율로 결정하지 않는다. 공개 Evidence와 pinned source가 지지하는 의미만 채택한다. 자료 충돌이 남으면 사용자에게 Strong 하나씩 선택시키지 않고 `HOLD` 또는 `DISPUTE`로 격리하고 다음 안전 항목을 계속 진행한다.

## 사용자 역할

사용자는 정상 Strong의 의미를 일일이 검수하지 않는다. 사용자의 직접 개입은 다음 governance 예외에 한정한다.

- 라이선스/권리 정책 결정
- 신학·번역 정책 자체 변경
- 보호된 Approval Registry / approved-data PR의 저장소 승인
- 서비스 배포 및 실제 화면 최종 확인

Strong별 의미 최종 문구는 Rights-PASS 공개 자료와 검증된 원문 Evidence를 GPT가 대조해 자동 판정한다. Evidence가 부족하면 자동 승인하지 않고 HOLD/DISPUTE로 남긴다.

## 현재 10 Strong canary

기존 `luke-g2-canary-preparation.json`의 **10 Strong · 70 representative contexts는 source/context 원자료로만 재사용**한다. 그 파일에 포함된 과거 execution/model-boundary 메타데이터는 새 4-LLM 계약의 실행 권위가 아니다.

다음 실제 단계는 10 Strong 각각에 대해 Rights-PASS 공개 Greek lexicon 및 필요한 공개 신학·어휘 Evidence를 pinned packet으로 확정한 뒤 네 독립 job을 배포하는 것이다.

## 안전 경계

- repository에서 모델 프로세스를 직접 실행하지 않는다.
- 모델 secret을 저장소에 저장하지 않는다.
- SBLGNT text는 기존 C0 결정대로 admitted model input에서 제외한다.
- candidate 단계에서 production write 금지.
- Approval Registry/approved meaning 자동 mutation 금지.
- unresolved Evidence가 있으면 PASS 금지.
- 보호된 Registry 병합 approval은 semantic 의미 판정과 별개의 저장소 governance다.
