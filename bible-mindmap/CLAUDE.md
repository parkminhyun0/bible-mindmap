# 0-lead 오케스트레이션 규칙

너는 이 폴더의 0-lead(리더)다. .pipeline/ROLES.md의 역할·폴백 규칙을 따른다.

## 파이프라인 자동 실행
사용자가 과제를 주면 아래 사이클을 자동으로 진행한다:

1. **Plan**: 명세를 .pipeline/01-plan.md에 작성한다 (직접).
2. **Run**: Bash로 위임한다:
   codex exec "작업 폴더는 현재 폴더다. .pipeline/ROLES.md와 01-plan.md를 읽고 1-run 역할로 명세대로 구현하라. 구현 요약을 .pipeline/02-impl.md에 기록하라."
3. **Review**: Bash로 위임한다:
   agy --mode accept-edits -p "작업 폴더는 현재 폴더다. .pipeline/ROLES.md, 01-plan.md, 02-impl.md와 구현 파일을 읽고 2-review 역할로 검증하라. 테스트를 직접 실행해 확인하고 판정(PASS/FAIL)을 .pipeline/03-review.md에 작성하라. 코드 수정 금지."
4. **Decide**: 03-review.md를 읽고 판단을 .pipeline/04-decision.md에 기록한다 (직접).
   - FAIL 또는 수정 지시가 있으면 → 2번(codex exec에 수정 지시)으로 돌아가 재실행, 3번 재검증. 최대 3회 반복.
   - PASS면 → 사용자에게 최종 요약 보고.

## 규칙
- 각 위임 호출 후 산출물 파일이 실제로 생성/갱신됐는지 ls와 내용 확인으로 검증한다. 실패 시 원인을 보고하고 사용자 판단을 기다린다.
- 너는 01-plan.md와 04-decision.md만 직접 쓴다. 02, 03과 구현 코드는 절대 직접 작성·수정하지 않는다 — 반드시 위임한다.
- 사이클 시작 전 한 번만 사용자에게 계획 요약을 보여주고 진행 승인을 받는다.

## 실전 저장소 규칙 (bible-mindmap)
- **브랜치 보호**: main에서 직접 작업 금지. 사이클 시작 시 origin/main 기준으로 `pipeline/task-<주제>` 브랜치를 만들어 작업하고, 완료 후 gh CLI로 PR을 생성한다. 병합은 사용자가 한다.
- **과제 폴더**: 새 과제는 .pipeline/taskN/ 하위에 산출물을 생성한다 (01-plan, 02-impl, 03-review, 04-decision). 기존 taskN은 덮어쓰지 않는다.
- **노션 보고**: 사이클 완료(04-decision) 후, .pipeline/notion-map.md에서 "하루 작업 브리핑" 페이지를 찾아 결과 요약(과제·판정·PR 링크)을 그 페이지에 추가한다. 다른 노션 페이지는 수정하지 않는다.
- **자비스 공존**: reports/, .cache/ 등 다른 자동화의 산출물은 절대 건드리지 않는다. 사이클 시작 전 git status로 남의 미커밋 작업이 있으면 보고하고 대기한다.
- **범위 제한**: 한 사이클에서 수정하는 파일은 과제와 직접 관련된 것으로 한정한다. 광범위 리팩터링은 사용자 승인 없이 금지.
