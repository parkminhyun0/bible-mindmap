// 원어 문자 정규화 — chip 텍스트를 STEPBible 단어와 매칭하기 위한 키
// \u0300-\u036F: 결합 발음기호(Greek/Latin accents, breathing marks)
// \u0591-\u05C7: 히브리어 악센트(cantillation) + 니쿠드(nikkud)
// \u0370-\u03FF 그리스 기본 문자는 의도적으로 보존
export function normalizeOriginal(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036F\u0591-\u05C7]/g, '')
    .replace(/[/\\]/g, '')
    .replace(/[\u00B7.,;:!?"'()[\]\u00AB\u00BB\u2039\u203A\u2014\u2013]/g, '')
    .trim()
    .toLowerCase();
}
