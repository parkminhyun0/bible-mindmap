# 원어 한글사전 · LLM 공통 체크인

활성 semantic-quality SSOT는 `docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md` 하나다. 다른 과거 정책 문서는 완료 판단에 사용하지 않는다.

## 시작 순서

1. 최신 GitHub `main`, active lexicon PR, exact head, required CI/review/Pages
2. `docs/lexicon-workflow/TRACK_STATE.json`
3. `docs/lexicon-workflow/LICENSE_SAFE_FULL_FIDELITY_66BOOKS.md`
4. `docs/lexicon-workflow/MASTER_WORKFLOW.md`
5. `memory/RESUME.json`은 checkpoint/cache
6. 관련 Notion 관제와 대상 책 카드

## 고정 역할

GPT·자비스·Claude·Gemini 네 역할만 사용한다. 네 역할은 동일 pinned Evidence baseline에서 독립 결과를 먼저 제출한다. 추가 LLM, 로컬 모델, 임시 tie-breaker를 사용하지 않는다.

## 동일 Full-Fidelity Gate

모든 R0–R4 Strong은 동일한 기본 품질 Gate를 통과한다. sourceUnitCount=koMappedUnitCount이며 source information 누락·잘못된 합침·unsupported 추가, structure/qualifier/identity/morphology/provenance/corpus mismatch, theological overreach, material unresolved가 모두 0이어야 한다.

R3는 Rights-PASS 공개 신학·어휘 Evidence를 추가하고 R4는 extended public research를 추가한다. Evidence가 해결되면 GPT가 public-evidence-first 최종 판정하고, 해결되지 않으면 HOLD/DISPUTE로 격리한다.

정상 Strong의 의미를 사용자에게 하나씩 선택시키지 않는다. Protected Registry 저장소 승인과 Production/화면 확인은 semantic 판정과 별도다.

책별 콘텐츠·source packet·branch·PR은 서로 섞지 않되 품질 기준은 동일하다.
