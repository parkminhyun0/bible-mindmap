import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { fetchCrossRefs } from '../api/crossrefApi'
import { getCanonCategory, CANON_LEGEND } from '../utils/canon'
import useMobile from '../hooks/useMobile'

/**
 * 관주 팝업 (인용·참조 구절 목록)
 * Props:
 *   sourceBookId, sourceChapter, sourceVerse, sourceRef
 *   anchor    - {x, y}  데스크톱 팝업 위치
 *   onClose
 *   onOpenPreview(item, anchor)  - 참조 항목 클릭 시 본문 미리보기 팝업 오픈 (다중)
 */
export default function CrossrefPopup({
  sourceBookId, sourceChapter, sourceVerse, sourceRef,
  anchor, onClose, onOpenPreview,
}) {
  const isMobile = useMobile()
  const [items, setItems] = useState(null)   // null=로딩, []=없음
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sourceBookId) return
    let cancelled = false
    setItems(null); setError(null)
    fetchCrossRefs(sourceBookId, sourceChapter, sourceVerse, 5)
      .then((list) => { if (!cancelled) setItems(list) })
      .catch((e) => { if (!cancelled) setError(e.message || '조회 실패') })
    return () => { cancelled = true }
  }, [sourceBookId, sourceChapter, sourceVerse])

  // 데스크톱 앵커 위치 · 모바일 하단 시트
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const width = isMobile ? vw : 360
  const maxHeight = isMobile ? Math.round(vh * 0.7) : Math.min(480, vh - 40)
  const margin = 12
  const initLeft = isMobile ? 0 : Math.max(margin, Math.min((anchor?.x ?? vw / 2) - width / 2, vw - width - margin))
  const initTop  = isMobile ? (vh - maxHeight) : Math.max(margin, Math.min((anchor?.y ?? vh / 2) + 10, vh - maxHeight - margin))

  // 데스크톱 드래그 이동 (헤더 잡고)
  const [pos, setPos] = useState({ x: initLeft, y: initTop })
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const onHeaderMouseDown = useCallback((e) => {
    if (isMobile || e.button !== 0) return
    if (e.target.closest('button')) return
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    e.preventDefault()
  }, [isMobile, pos])
  useEffect(() => {
    if (isMobile) return
    const onMove = (e) => {
      if (!dragging.current) return
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      const w = window.innerWidth, h = window.innerHeight
      setPos({
        x: Math.max(0, Math.min(w - 200, dragStart.current.px + dx)),
        y: Math.max(0, Math.min(h - 80, dragStart.current.py + dy)),
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
  const left = isMobile ? 0 : pos.x
  const top  = isMobile ? (vh - maxHeight) : pos.y

  return createPortal(
    <>
      {isMobile && (
        <div onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 2500 }} />
      )}
      <div
        role="dialog"
        aria-modal={isMobile ? 'true' : 'false'}
        aria-label={`관주 · ${sourceRef}`}
        style={{
          position: 'fixed', left, top, width, maxHeight,
          zIndex: 2501,
          background: '#fff',
          borderRadius: isMobile ? '16px 16px 0 0' : 10,
          boxShadow: isMobile ? '0 -8px 32px rgba(15,23,42,.24)' : '0 12px 40px rgba(0,0,0,0.22)',
          border: isMobile ? 'none' : '1px solid #e2e8f0',
          overflow: 'hidden',
          fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
          display: 'flex', flexDirection: 'column',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 0,
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* 헤더 (데스크톱: 드래그 핸들) */}
        <div
          onMouseDown={onHeaderMouseDown}
          title={isMobile ? undefined : '드래그로 이동'}
          style={{
            padding: isMobile ? '14px 16px 10px' : '10px 14px',
            background: 'linear-gradient(135deg,#f8fafc,#e2e8f0)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            cursor: isMobile ? 'default' : 'grab',
            userSelect: 'none',
        }}>
          {isMobile && (
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1',
              position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)' }} />
          )}
          <span style={{ fontSize: 15 }}>🔗</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>관주 · 인용·참조 구절</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {sourceRef} <span style={{ color: '#cbd5e1' }}>· 상위 5</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="관주 닫기"
            style={{ background: 'none', border: 'none', fontSize: isMobile ? 22 : 18,
              color: '#94a3b8', cursor: 'pointer',
              minWidth: isMobile ? 44 : 32, minHeight: isMobile ? 44 : 32 }}>✕</button>
        </div>

        {/* 카테고리 범례 (상단 얇은 리본) */}
        <div className="momentum-scroll" style={{
          display: 'flex', gap: 6, padding: '6px 14px',
          borderBottom: '1px solid #f1f5f9',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 0,
          background: '#fafbfc',
        }}>
          {CANON_LEGEND.map(c => (
            <span key={c.key}
              title={c.label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9.5, color: '#64748b', flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%',
                background: c.color, display: 'inline-block' }} />
              {c.label}
            </span>
          ))}
        </div>

        {/* 목록 */}
        <div className="momentum-scroll" style={{
          flex: 1, overflowY: 'auto', padding: '8px 6px',
          WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
        }}>
          {items === null && !error && (
            <div role="status" aria-live="polite" style={{
              padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              관주 조회 중…
            </div>
          )}
          {error && (
            <div role="alert" aria-live="assertive" style={{
              padding: 20, textAlign: 'center', color: '#dc2626', fontSize: 12 }}>
              {error}
            </div>
          )}
          {items !== null && items.length === 0 && !error && (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              이 절에 등록된 관주가 없습니다.
            </div>
          )}
          {items?.map((item, idx) => {
            const cat = getCanonCategory(item.bookId)
            return (
              <button
                key={idx}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  onOpenPreview?.(item, { x: rect.left + rect.width / 2, y: rect.bottom })
                }}
                aria-label={`${item.reference} 본문 미리보기 열기`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%',
                  padding: '10px 10px', borderRadius: 8,
                  marginBottom: 4,
                  background: cat.bg,
                  border: `1px solid ${cat.color}33`,
                  borderLeft: `4px solid ${cat.color}`,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background .12s, transform .1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = cat.color + '22' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = cat.bg }}
              >
                {/* 카테고리 dot */}
                <span aria-hidden="true"
                  title={cat.label}
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: cat.color, flexShrink: 0,
                    boxShadow: `0 0 0 2px ${cat.color}22`,
                  }} />

                {/* 참조 텍스트 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.reference}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                    {cat.label} · votes {item.votes}
                  </div>
                </div>

                {/* 본문 열기 힌트 */}
                <span style={{ fontSize: 11, color: cat.color, fontWeight: 700, flexShrink: 0,
                  padding: '4px 10px', border: `1px solid ${cat.color}55`, borderRadius: 6,
                  background: 'rgba(255,255,255,.6)' }}>
                  본문 ↗
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>,
    document.body
  )
}
