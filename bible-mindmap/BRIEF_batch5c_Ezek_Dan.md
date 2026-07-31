# 배치 5c 브리프 — 에스겔·다니엘 관찰 카드

**대상**: ChatGPT (콘텐츠 담당) · **후속 통합**: 자비스 (검증·병합·배포·노션)
**기준 LIVE**: `acbc4f3` (main) · **작업일 기준일**: 2026-08-01

---

## 1) 목적
문맥 성경 「장별 관찰 카드」 배치 5c로 **대예언서 마지막 두 권**을 완성한다.

- 에스겔 48장 + 다니엘 12장 = **총 60장**
- 완료 시: 대예언서 4권(사·렘·애·겔·단) 모두 확보 → 남은 것은 소예언서 12권(호세아 ~ 말라기)

## 2) 산출물 (스키마 고정 · PR #48과 동일 형식)
- **신규 파일 1개만**: `bible-mindmap/src/data/contextChapterCardsEzekDan.js`
- **export**: `CONTEXT_CHAPTER_CARDS_EZEK_DAN`
- **기존 tracked 파일 수정·삭제 0** (자비스가 `contextChapterCards.js`에 import/spread 연결)
- **키 형식**: `'Ezek:1'` … `'Ezek:48'`, `'Dan:1'` … `'Dan:12'` (콜론 · 대소문자 정확)

### 카드 스키마 (기존 헬퍼 재사용)
```js
const C=(coverEmoji,genre,observeThis,discourseMarkers,theologicalImplications,nextChapterPreview)=>({coverEmoji,genre,observeThis,discourseMarkers,theologicalImplications,nextChapterPreview});
const M=(marker,role,example)=>({marker,role,example});
```
- `coverEmoji`: 1자
- `genre`: "예언 · 부제" 형식
- `observeThis`: **정확히 3개** (해당 장의 실제 절 범위·인물·사건 직접 지목)
- `discourseMarkers`: **정확히 2개** (M(...) 사용 · marker는 히브리/아람어 원어 + 한글음, `example`은 해당 장의 실제 절)
- `theologicalImplications`: **정확히 3개** (첫 30자 고유율 95%+ · "겔 N장 N:N–N의 …" 형태로 시작 권장)
- `nextChapterPreview`: 1문장, 다음 장 pivot 예고

## 3) 절 범위·본문 정합성 (verifier가 자동 대조)
- 히브리어 자음 골격이 실제 lex 데이터(`public/data/lex/hot`)에 존재해야 함
- 다니엘 2:4–7:28은 **아람어** 구간 → marker에 아람어(예: `יְהוָה` 대신 상황에 맞는 어휘) 사용 시 example 절이 실제 아람어 구간인지 확인
- 확신 안 서면 `יְהוָה (아도나이)` 대신 해당 장에서 실제 명확한 인명·지명·핵심 사물어(예: 겔 1장 `כְּבוֹד יְהוָה`, 단 7장 `בַּר אֱנָשׁ (바르 에나쉬)`) 사용

## 4) 해석 원칙 (개혁주의 · 필수)
공통 (SESSION_STATE.md 「✝️ 신학 기준」 참조):
- WCF·대소요리문답·언약신학·구속사적 해석 기준
- 이단(여호와의증인·몰몬·신천지·통일교·JMS·안상홍 등) signature 절대 배제
- 성경 본문 전문·장문 직접 인용 없음 (참조·요약·해설만)
- 세대주의 도식적 날짜 계산, 현대 뉴스·국가와의 직접 예언 성취 동일시 **금지**

### 에스겔 고유
- 하나님의 영광(카보드)·이동성·성전 신학·"내가 여호와인 줄 알리라" 공식(약 70회) 강조
- 개인 책임(18장)·목자 비판(34장)·마른 뼈 골짜기(37장)·새 성전(40–48장)은 각 장 자체 문맥 우선
- **곡·마곡(38–39장)** — 특정 현대 국가와 동일시하지 말 것. 하나님의 열방 심판·주권 프레임 유지
- **새 성전(40–48장)** — 문자적 재건 도식 강요 X, 종말론적 임재·회복 이미지로 해석. 예수 그리스도 안에서의 성취 방향은 조심스럽게 암시(직접 알레고리 강요 X)

### 다니엘 고유
- 왕궁 이야기(1–6장)와 환상(7–12장) 문학 구조 존중
- 네 왕국(2·7장)의 역사적 정황(바벨·메대바사·헬라·로마 다수설) 언급 가능, 그러나 **현대 국가 대입 금지**
- 다니엘 7장 인자·옛적부터 계신 이 — 신약 기독론적 성취 방향은 신중히
- 다니엘 9장 70이레 — **날짜 계산·현대 사건 매칭 절대 금지**. 메시아 오심과 성전 파괴라는 구속사적 성취 관점 유지
- 다니엘 11–12장 — 시리아·이집트 왕들의 역사적 정황과 종말론적 초점(부활·심판) 병존, 특정 현대 지도자 동일시 X

## 5) 자체 점검 체크리스트 (PR 본문에 자체집계 표시)
- [ ] Ezek 48/48 · Dan 12/12 · 총 60/60
- [ ] 각 카드 스키마 6필드 · observeThis 3개 · markers 2개 · implications 3개
- [ ] implications 첫 30자 고유율 95%+ (책 단위 템플릿 반복 없음)
- [ ] discourseMarkers example 절이 해당 장 범위 내
- [ ] 개혁주의·저작권 자체점검 통과
- [ ] 신규 파일 1개만 추가 · 다른 파일 수정 0

## 6) PR 규약
- **브랜치명**: `chatgpt/chaptercards-ezek-dan`
- **base**: 원격 최신 `main` (현재 `acbc4f3` · PR 직전에 반드시 재확인 · `ahead 1 / behind 0`)
- **PR 제목**: `content(context): add Ezekiel and Daniel observation cards`
- **PR 본문**: PR #48 템플릿 그대로 (목적·범위·자체집계·스키마·장별 고유성·해석 원칙·원어 마커·신학·저작권 자체점검·범위검증·후속 통합)

## 7) 후속 통합 (자비스 담당 — GPT는 여기 신경 X)
1. 파일 추출 (병합 X · stale base 회피)
2. `contextChapterCards.js` import/spread 2줄 추가
3. `verify-chapter-card-markers.mjs` + `verify-doctrinal-safety.mjs` 실행
4. `npm run build` → 통과 확인
5. 커밋 · 푸시 · CI 배포 대기 · `verify:deploy`
6. 노션 🔴 LIVE 콜아웃 + SESSION_STATE 갱신

---

## 참고 컨텍스트
- 이전 PR: #48 (Jer·Lam 57장) — 이 방식 그대로 반복
- 유사 파일 참조: `contextChapterCardsIsa.js`(대예언서 배치5a) · `contextChapterCardsJerLam.js`(배치5b)
- 신학 verifier signature: 이단 57종 자동 차단 (자비스가 자동 실행)
- verifier 위치: `bible-mindmap/scripts/verify-chapter-card-markers.mjs`, `verify-doctrinal-safety.mjs`
