# TASK-34-A · 범용 alignment loader

## 목적

창세기 1:1 H430 한 건을 정적으로 import하던 경로를 제거하고, 장·절·tokenId·원천 버전을 기준으로 정렬 데이터를 읽는 공통 loader를 도입한다.

## 포함 범위

- `loadVerseAlignment({ bookId, chapter, verse, tokenId, sourceVersions })`
- lex token에서 결정적으로 tokenId를 복원하는 resolver
- manifest 기반 장별 alignment 경로와 token별 override
- token checksum 불일치 차단
- sourceVersions stale 차단
- 파일·레코드·target 부재의 안전 fallback
- `verified`·`auto` 레코드의 저장 span만 렌더
- H430 정적 JSON import와 전용 lookup 제거

## 안전 경계

- 기존 원어 `w/tr/s/m/l/g` 데이터 변경 없음
- KRV·WEB 본문 변경 없음
- 사용자 저장 데이터 변경 없음
- NVIDIA·OpenAI API 호출 없음
- alignment 데이터가 없거나 검증되지 않으면 기존 화면을 유지

## 후속 TASK-34-B

정렬 레코드가 존재하는 행에서는 `findKoreanWord`, `pickEnglishHl` 등 legacy 문자열 추정을 제거한다. `review`·`uncertain`은 임의 하이라이트 없이 검수 대기로 표시한다.
