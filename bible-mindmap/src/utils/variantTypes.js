// 비평장치(Apparatus) 유형 5종 · 컬러 · 라벨
// 학문적 관례: Metzger *A Textual Commentary on the Greek New Testament* 카테고리 참조

export const VARIANT_TYPES = {
  omission:     { key: 'omission',     label: '누락',     desc: '일부 사본에서 빠진 본문',       color: '#2563eb', bg: 'rgba(37,99,235,.14)',  emoji: '🔵' },
  addition:     { key: 'addition',     label: '삽입',     desc: '일부 사본에만 있는 본문',       color: '#eab308', bg: 'rgba(234,179,8,.14)',  emoji: '🟡' },
  substitution: { key: 'substitution', label: '대체',     desc: '단어·구절이 다른 사본',         color: '#dc2626', bg: 'rgba(220,38,38,.14)',  emoji: '🔴' },
  order:        { key: 'order',        label: '순서',     desc: '어순·절 순서 차이',             color: '#f97316', bg: 'rgba(249,115,22,.14)', emoji: '🟠' },
  translation:  { key: 'translation',  label: '번역',     desc: '원어 해석 차이 (역본 간)',      color: '#a855f7', bg: 'rgba(168,85,247,.14)', emoji: '🟣' },
}

export function getVariantType(key) {
  return VARIANT_TYPES[key] || VARIANT_TYPES.substitution
}

export const VARIANT_TYPE_LEGEND = Object.values(VARIANT_TYPES)

// Metzger 등급 배지 색상
export function metzgerColor(grade) {
  return { A: '#059669', B: '#eab308', C: '#f97316', D: '#dc2626' }[grade] || '#64748b'
}
