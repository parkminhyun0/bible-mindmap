# 파이프라인 규칙
- 0-lead (Claude): 계획 수립·최종 통합. 산출물: .pipeline/01-plan.md
- 1-run (Codex): 01-plan.md대로만 구현. 산출물: src/ + .pipeline/02-impl.md
- 2-review (Antigravity): 01과 src/를 대조 검증. 산출물: .pipeline/03-review.md (판정: PASS/FAIL + 근거)
- 모든 통신은 .pipeline/ 파일로만. 다른 역할의 산출물을 임의 수정 금지.

# 권한 정책 (headless 위임 실행)
- 2-review(agy) 검증자는 headless(`-p`/print) 실행 시 도구 확인이 자동 거부(soft-deny)되므로, node 등 테스트 실행을 위해 `--dangerously-skip-permissions`가 필요하다.
- 이 플래그는 반드시 **git 커밋된 격리 폴더에서만** 호출한다. 호출 직전 작업 트리를 커밋해 복구 지점을 확보한 뒤 실행한다.
- 이 플래그는 2-review(agy) 호출에 한정한다. 1-run(codex) 호출에는 사용하지 않는다.

# 폴백 규칙 (특정 에이전트 사용량 소진 시)
- Claude 부재: Codex가 0-lead 겸 1-run 수행, agy가 2-review 유지
- Codex 부재: Claude가 0-lead 겸 1-run, agy가 2-review 유지
- agy 부재: Claude가 0-lead, Codex가 1-run, 리뷰는 0-lead가 새 대화(컨텍스트 없는 상태)에서 수행
- 공통 원칙: 구현한 모델이 자기 구현을 검증하지 않는다.
