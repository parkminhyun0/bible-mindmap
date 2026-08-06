# bible-mindmap · data-dist

GitHub Pages 아티팩트 경량화를 위해 대용량 정적 성경 데이터(lex·strongs·strongs-def·variants·places DB)를 이 브랜치로 분리한다.

- 앱은 jsDelivr CDN 경유로 이 데이터를 fetch한다: `https://cdn.jsdelivr.net/gh/parkminhyun0/bible-mindmap@<commit-sha>/data/...`
- 이 브랜치는 스크립트/CI가 생성한다. **손으로 편집하지 말 것.**
- 앱 코드의 `src/config/dataBase.js` (`VITE_DATA_BASE_URL`)가 이 경로를 가리킨다.
