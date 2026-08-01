---
name: feedback_github_push_policy
description: 모든 코드 작업은 로컬 먼저, GitHub 푸시는 명시적 지시 후에만 — 매번 푸시 전 한 번 더 확인
metadata:
  type: feedback
---

모든 업데이트는 로컬에서 먼저 작업·테스트한 뒤, 사용자의 명시적 지시가 있을 때만 GitHub에 푸시한다.

**Why:** 사용자가 로컬 테스트를 먼저 확인하고 싶어함. 작업 완료 후 바로 push하면 안 됨.

**How to apply:**
- 코드 수정/추가 후 → 로컬 완료 보고만
- 푸시 전 반드시 "GitHub에 올려도 될까요?" 한 번 더 확인
- 사용자가 "깃허브로 올려줘" / "push해줘" 등 명시적으로 말할 때만 푸시
