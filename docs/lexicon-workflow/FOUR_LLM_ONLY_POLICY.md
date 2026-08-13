# 원어 한글사전 · Fixed Four-LLM / Public-Evidence Adjudication Policy

**Status: ACTIVE execution/adjudication SSOT**

이 문서는 Rights/License·Full-Fidelity 정책을 변경하지 않고 AI 실행자 집합과 의미 최종 판정 방식을 고정한다.

## 허용 AI 집합

원어 한글사전 의미 생성·감사·쟁점 판정은 **GPT · 자비스 · Claude · Gemini** 네 역할만 사용한다. 추가 LLM, 임시 tie-breaker, 로컬 호스팅 모델은 사용하지 않는다.

## 독립성

- 네 역할은 동일 pinned Evidence baseline에서 독립 결과를 먼저 생성한다.
- 독립 제출 전 다른 역할의 결과를 보지 않는다.
- 모델 다수결은 의미 권위가 아니다.

## 의미 권위와 GPT 최종 자동 판정

권위 순서는 `원문 → 직접 문맥/형태론/용례 → Rights-PASS 공개 원어 사전 → Rights-PASS 공개 신학·어휘 참고자료 → 네 AI 분석`이다.

GPT는 공개 Evidence를 직접 대조하여 Evidence가 지지하는 의미만 최종 문구로 채택한다. 자동 semantic promotion은 source/rights/fingerprint verifier PASS, 네 독립 결과 존재, deterministic comparison PASS, GPT public-evidence adjudication, material unresolved=0을 모두 요구한다.

충돌이 남으면 `HOLD` 또는 `DISPUTE`로 격리하며 정상 항목 진행을 막지 않는다.

## 사용자 Gate

사용자는 정상 Strong의 사전 의미를 항목마다 확인하지 않는다. 직접 개입은 라이선스/권리 정책 변경, 신학·번역 정책 자체 변경, 보호된 승인 데이터 PR의 저장소 governance approval, Production/Pages 및 실제 화면 최종 확인에 한정한다.

보호된 PR approval은 의미를 사람이 다시 번역·판정하는 단계가 아니라 저장소 변경 승인이다.

## 금지

- 네 역할 외 모델 추가
- 로컬 모델을 보조 판정자로 사용
- 미해결 Evidence를 사용자에게 단어별 선택지로 전가
- 모델 다수결로 공개 Evidence를 덮어쓰기
- Rights-PASS 없는 공개 웹 자료를 Evidence로 ingest
- semantic PASS 직후 보호된 Registry/approved meaning 직접 overwrite

## 적용 범위

이 정책은 66권 원어 한글사전 공통 AI 역할/판정 계약이다. 책별 source·rights·Evidence packet은 각 Lane에서 별도로 유지하며 창세기와 누가복음의 콘텐츠/브랜치 작업은 섞지 않는다.
