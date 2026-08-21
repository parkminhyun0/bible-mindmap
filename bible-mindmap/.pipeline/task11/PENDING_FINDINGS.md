# batch 07 감사 지적 — 처리 대기 (0-lead 판단 필요)

감사 4건 중 3건에서 7개 지적. 재감사(Codex)는 아직 진행 중.
audit-codex.json 은 checked=0 이라 다시 돌려야 한다.

## high 1건 — 채택 권고

- **G3900 παράπτωμα 파라프토마 → 파랍토마**
  근거: 배포된 `G4098 πίπτω→핍토` · `G907 βαπτίζω→밥티조`.
  π 앞에서 앞 음절이 받침으로 닫히는 자리다. 확인 후 override 로 처리.

## medium 6건

- **H5944 ʿălîyâ → ʿăliyyâ** · **H3595 kîyôr → kiyyôr**
  요드에 다게쉬가 있어 라틴에서 yy 로 겹쳐 적는 자리. 배포 선례 `ṣiyyôn`·`ʾiyyôb`.
  batch 04 의 H1841 dānîyyēʾl 과 같은 규칙이므로 **규칙화 검토** 대상.
- **H511 엘카나 · H385 이타마르 · H397 아키쉬** — 관용 표기(엘가나·이다말·아기스)와
  갈리는데 note 에 이유가 없다. override 로 설명 추가.
- **H3895 레히** — note 가 "관용 표기는 레이"라고 하는데 배포된 사사기 15장 카드는
  '레히'다. note 가 사실과 다르다. 확인 후 수정.

## 다음 실행자에게

1. `node .pipeline/task7/tools/apply-rules.mjs task11` 로 override 반영
2. `node .pipeline/task11/tools/build-batch.mjs task11 07 R S T`
3. `node scripts/build-korean-gloss-registry.mjs` → predev → lint → Draft PR
