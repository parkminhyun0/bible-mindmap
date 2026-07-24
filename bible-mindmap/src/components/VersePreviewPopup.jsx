import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { fetchVerse } from '../api/bibleApi'
import { getCanonCategory } from '../utils/canon'
import useMobile from '../hooks/useMobile'

// bolls.life 본문 텍스트 파싱 · 절 번호 span 을 우리 스타일로 재렌더
// 규칙: 첫 절만 "장:절", 이후 같은 장은 "절"만 (crossref 는 항상 한 장 내라 장 변경 없음)
function renderVerses(rawText, chapter, verseStart, accentColor) {
  const stripTags = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

  // bolls.life 다중 절 반환 시 <span ...>N</span> 형태로 절 번호 삽입됨
  // split 정규식으로 [pre, verseNum, text, verseNum, text, ...] 배열 생성
  const parts = rawText.split(/<span[^>]*>(\d+)<\/span>/)

  // 단일 절 (span 없음): parts.length === 1, parts[0] = 전체 텍스트
  if (parts.length === 1) {
    return (
      <>
        <VerseLabel n={verseStart} chapter={chapter} first accent={accentColor} />
        <span>{stripTags(parts[0])}</span>
      </>
    )
  }

  // 다중 절: 첫 항목은 span 앞 텍스트(보통 빈 문자열), 이후 [verseNum, text] 쌍
  const nodes = []
  // 선두 텍스트 (드물게 존재)
  if (parts[0] && stripTags(parts[0])) {
    nodes.push(<span key="lead">{stripTags(parts[0])} </span>)
  }
  for (let i = 1; i < parts.length; i += 2) {
    const vn = parseInt(parts[i], 10)
    const body = stripTags(parts[i + 1] || '')
    const isFirst = i === 1
    nodes.push(
      <span key={i}>
        <VerseLabel n={vn} chapter={chapter} first={isFirst} accent={accentColor} />
        {body}{i + 2 < parts.length ? ' ' : ''}
      </span>
    )
  }
  return nodes
}

// 절 번호 라벨 · 첫 절만 "장:절", 이후 "절" 만
function VerseLabel({ n, chapter, first, accent }) {
  return (
    <sup style={{
      display: 'inline-block',
      marginRight: 4,
      padding: '1px 5px',
      borderRadius: 4,
      background: accent + '22',
      color: accent,
      fontSize: '0.72em',
      fontWeight: 800,
      letterSpacing: '.02em',
      verticalAlign: 'baseline',
    }}>
      {first ? `${chapter}:${n}` : n}
    </sup>
  )
}

/**
 * 참조 본문 미리보기 팝업 (관주 → 클릭 시 열림)
 * 다중 오픈 지원 · 각각 개별 닫기 · 데스크톱 드래그 이동
 *
 * Props:
 *   id, bookId, chapter, verseStart, verseEnd, reference
 *   initialX, initialY  - 초기 위치 (데스크톱)
 *   zIndex              - 다중 팝업 겹침 순서
 *   onClose, onFocus    - 콜백
 */
export default function VersePreviewPopup({
  id, bookId, chapter, verseStart, verseEnd, reference,
  initialX = 100, initialY = 100, zIndex = 3000,
  onClose, onFocus,
}) {
  const isMobile = useMobile()
  const [text, setText] = useState(null)
  const [error, setError] = useState(null)
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const cat = getCanonCategory(bookId)

  useEffect(() => {
    let cancelled = false
    setText(null); setError(null)
    fetchVerse(bookId, chapter, verseStart, verseEnd, 'krv')
      .then(t => { if (!cancelled) setText(t) })
      .catch(e => { if (!cancelled) setError(e.message || '본문 조회 실패') })
    return () => { cancelled = true }
  }, [bookId, chapter, verseStart, verseEnd])

  const onHeaderMouseDown = useCallback((e) => {
    if (isMobile || e.button !== 0) return
    if (e.target.closest('button')) return
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    onFocus?.(id)
    e.preventDefault()
  }, [isMobile, pos, id, onFocus])

  useEffect(() => {
    if (isMobile) return
    const onMove = (e) => {
      if (!dragging.current) return
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      const w = window.innerWidth, h = window.innerHeight
      setPos({
        x: Math.max(0, Math.min(w - 240, dragStart.current.px + dx)),
        y: Math.max(0, Math.min(h - 100, dragStart.current.py + dy)),
      })
    }
    const onUp = () => { dragging.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isMobile])

  // 모바일: 하단 시트 · 데스크톱: 드래그 팝업
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const width = isMobile ? vw : 380
  const maxHeight = isMobile ? Math.round(vh * 0.6) : 320
  const left = isMobile ? 0 : pos.x
  const top  = isMobile ? (vh - maxHeight) : pos.y

  return createPortal(
    <div
      role="dialog"
      aria-label={`참조 본문 · ${reference}`}
      onMouseDown={(e) => { e.stopPropagation(); onFocus?.(id) }}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', left, top, width, maxHeight,
        zIndex,
        background: '#fff',
        borderRadius: isMobile ? '14px 14px 0 0' : 10,
        boxShadow: isMobile ? '0 -8px 32px rgba(15,23,42,.22)' : '0 12px 40px rgba(0,0,0,0.22)',
        border: `1px solid ${cat.color}55`,
        borderTop: `4px solid ${cat.color}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      {/* 헤더 (드래그 핸들) */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          padding: isMobile ? '12px 14px 8px' : '10px 12px',
          background: cat.bg,
          borderBottom: `1px solid ${cat.color}33`,
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: isMobile ? 'default' : 'grab',
          userSelect: 'none', flexShrink: 0,
        }}>
        <span aria-hidden="true" style={{
          width: 10, height: 10, borderRadius: '50%',
          background: cat.color, flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reference}
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
            {cat.label} · KRV
          </div>
        </div>
        <button onClick={onClose} aria-label="본문 팝업 닫기"
          style={{
            background: 'rgba(255,255,255,.7)',
            border: `1px solid ${cat.color}55`,
            color: cat.color,
            fontSize: isMobile ? 18 : 15, fontWeight: 700,
            cursor: 'pointer', borderRadius: 8,
            minWidth: isMobile ? 40 : 30, minHeight: isMobile ? 40 : 30,
            padding: 0,
          }}>✕</button>
      </div>

      {/* 본문 */}
      <div className="momentum-scroll" style={{
        flex: 1, overflowY: 'auto',
        padding: isMobile ? '14px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)' : '12px 14px 14px',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        fontSize: isMobile ? 15 : 14,
        lineHeight: 1.75, color: '#1e293b',
        wordBreak: 'keep-all',
      }}>
        {text === null && !error && (
          <div role="status" aria-live="polite" style={{ color: '#94a3b8', fontSize: 12 }}>
            본문 조회 중…
          </div>
        )}
        {error && (
          <div role="alert" aria-live="assertive" style={{ color: '#dc2626', fontSize: 12 }}>
            {error}
          </div>
        )}
        {text && renderVerses(text, chapter, verseStart, cat.color)}
      </div>
    </div>,
    document.body
  )
}
