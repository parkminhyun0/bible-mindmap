import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getVariants } from '../data/textualVariants'
import { getVariantType, VARIANT_TYPE_LEGEND, metzgerColor } from '../utils/variantTypes'
import useMobile from '../hooks/useMobile'

/**
 * 비평장치(Apparatus) 팝업
 * Props:
 *   bookId, chapter, verse, sourceRef
 *   anchor    - {x, y}  데스크톱 초기 위치
 *   onClose
 */
export default function VariantPopup({
  bookId, chapter, verse, sourceRef, anchor, onClose, apparatusMode = 'standard',
}) {
  const isMobile = useMobile()
  const variants = getVariants(bookId, chapter, verse, apparatusMode)

  // 데스크톱 드래그
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const width = isMobile ? vw : 420
  const maxHeight = isMobile ? Math.round(vh * 0.8) : Math.min(560, vh - 40)
  const margin = 12
  const initLeft = isMobile ? 0 : Math.max(margin, Math.min((anchor?.x ?? vw / 2) - width / 2, vw - width - margin))
  const initTop  = isMobile ? (vh - maxHeight) : Math.max(margin, Math.min((anchor?.y ?? vh / 2) + 10, vh - maxHeight - margin))

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
        x: Math.max(0, Math.min(w - 220, dragStart.current.px + dx)),
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

  const left = isMobile ? 0 : pos.x
  const top  = isMobile ? (vh - maxHeight) : pos.y

  return createPortal(
    <>
      {isMobile && (
        <div onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 2400 }} />
      )}
      <div
        role="dialog"
        aria-modal={isMobile ? 'true' : 'false'}
        aria-label={`비평장치 · ${sourceRef}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', left, top, width, maxHeight,
          zIndex: 2401,
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
      >
        {/* 헤더 · 드래그 핸들 */}
        <div
          onMouseDown={onHeaderMouseDown}
          title={isMobile ? undefined : '드래그로 이동'}
          style={{
            padding: isMobile ? '14px 16px 10px' : '10px 14px',
            background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
            borderBottom: '1px solid #f59e0b33',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            cursor: isMobile ? 'default' : 'grab', userSelect: 'none',
          }}>
          <span style={{ fontSize: 15 }}>✎</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>비평장치 (Apparatus)</div>
            <div style={{ fontSize: 11, color: '#78350f', marginTop: 1 }}>
              {sourceRef} <span style={{ color: '#a16207' }}>· {variants.length}건</span>
            </div>
            {variants[0]?.refs?.some(r => r.includes('SBLGNT')) && (
              <div style={{ fontSize: 9, color: '#a16207', marginTop: 2, opacity: 0.75 }}>
                출처: SBLGNT Apparatus (CC BY 4.0, SBL × Faithlife)
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="비평장치 닫기"
            style={{ background: 'none', border: 'none',
              fontSize: isMobile ? 22 : 18, color: '#78350f', cursor: 'pointer',
              minWidth: isMobile ? 44 : 32, minHeight: isMobile ? 44 : 32 }}>✕</button>
        </div>

        {/* 유형 범례 리본 */}
        <div className="momentum-scroll" style={{
          display: 'flex', gap: 6, padding: '6px 14px',
          borderBottom: '1px solid #f1f5f9',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          flexShrink: 0, background: '#fafbfc',
        }}>
          {VARIANT_TYPE_LEGEND.map(t => (
            <span key={t.key} title={t.desc}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9.5, color: '#64748b', flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
              {t.label}
            </span>
          ))}
        </div>

        {/* 이문 목록 */}
        <div className="momentum-scroll" style={{
          flex: 1, overflowY: 'auto', padding: '10px 12px',
          WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
        }}>
          {variants.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              이 절에 등록된 비평장치 정보가 없습니다.
            </div>
          )}
          {variants.map((v, idx) => {
            const t = getVariantType(v.type)
            const grade = v.metzger
            return (
              <div key={idx} style={{
                padding: 12, borderRadius: 8, marginBottom: 8,
                background: t.bg,
                border: `1px solid ${t.color}44`,
                borderLeft: `4px solid ${t.color}`,
              }}>
                {/* 헤더 · 유형 · Metzger 등급 · 출처 (자동/수동 구분) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%',
                    background: t.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: t.color,
                    padding: '2px 6px', background: 'rgba(255,255,255,.6)', borderRadius: 4 }}>
                    {t.label}
                  </span>
                  {grade && (
                    <span title={`Metzger 신뢰도 등급 ${grade}`}
                      style={{ fontSize: 10, fontWeight: 800, color: '#fff',
                        padding: '2px 6px', background: metzgerColor(grade), borderRadius: 4 }}>
                      {grade}
                    </span>
                  )}
                  {/* 출처 배지 · 자동 감지(SBLGNT·OSHB) vs 수동 큐레이션 시각 구분 */}
                  {v.source === 'oshb' && (
                    <span title="OSHB (Open Scriptures Hebrew Bible · CC BY 4.0) 마소라 Ketiv/Qere 자동 파싱"
                      style={{ fontSize: 9, fontWeight: 800, color: '#0f766e',
                        padding: '2px 6px', background: '#ccfbf1', border: '1px solid #5eead4', borderRadius: 4 }}>
                      🤖 자동 (OSHB K/Q)
                    </span>
                  )}
                  {v.source === 'sp-mt' && (
                    <span title="DT-UCPH Samaritan Pentateuch (CC BY-NC 4.0) vs WLC MT 자음 텍스트 자동 대조. Tal (1994) · Florentin (2005) 학술 기준. 학술 검증 권장."
                      style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed',
                        padding: '2px 6px', background: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: 4 }}>
                      🤖 자동 (SP-MT 대조)
                    </span>
                  )}
                  {v.source === 'lxx-mt' && (
                    <span title="LXX (Rahlfs Septuagint · openscriptures/GreekResources) vs WLC MT 구조 대조. 절 누락·추가·단어 수 큰 차이 자동 감지. Tov (2012) 학술 검증 권장. 언어 차이로 노이즈 존재."
                      style={{ fontSize: 9, fontWeight: 800, color: '#c2410c',
                        padding: '2px 6px', background: '#ffedd5', border: '1px solid #fdba74', borderRadius: 4 }}>
                      🤖 자동 (LXX-MT 대조)
                    </span>
                  )}
                  {v.source === 'sblgnt' && (
                    <span title="SBLGNT Apparatus (Faithlife/SBL · CC BY 4.0) 자동 파싱"
                      style={{ fontSize: 9, fontWeight: 800, color: '#0369a1',
                        padding: '2px 6px', background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 4 }}>
                      🤖 자동 (SBLGNT)
                    </span>
                  )}
                  {!v.source && (
                    <span title="학술 큐레이션 (Metzger · NET Bible · BHS/BHQ 참조 · 수동 등록)"
                      style={{ fontSize: 9, fontWeight: 800, color: '#b45309',
                        padding: '2px 6px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 4 }}>
                      ✍️ 큐레이션
                    </span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                    {v.title}
                  </span>
                </div>

                {/* 요약 */}
                <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, marginBottom: 8 }}>
                  {v.summary}
                </div>

                {/* 사본 증거 */}
                {v.witnesses && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', marginBottom: 2 }}>사본 증거</div>
                    {v.witnesses.omit && (
                      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                        <b style={{ color: '#2563eb' }}>누락:</b> {v.witnesses.omit.join(', ')}
                      </div>
                    )}
                    {v.witnesses.include && (
                      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                        <b style={{ color: '#eab308' }}>포함:</b> {v.witnesses.include.join(', ')}
                      </div>
                    )}
                    {v.witnesses.variants && Object.entries(v.witnesses.variants).map(([k, val]) => (
                      <div key={k} style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                        <b style={{ color: t.color }}>{k}:</b> {val}
                      </div>
                    ))}
                  </div>
                )}

                {/* 역본 처리 */}
                {v.translations && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', marginBottom: 2 }}>역본별 처리</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(v.translations).map(([k, val]) => (
                        <span key={k} style={{ fontSize: 10, padding: '2px 6px',
                          background: 'rgba(15,23,42,.05)', borderRadius: 4, color: '#475569' }}>
                          <b style={{ color: '#0f172a' }}>{k.toUpperCase()}:</b> {val}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 신학적 의미 */}
                {v.significance && (
                  <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.6,
                    background: 'rgba(255,255,255,.5)', padding: '6px 8px',
                    borderRadius: 6, borderLeft: `2px solid ${t.color}88` }}>
                    <b style={{ color: '#0f172a' }}>의미:</b> {v.significance}
                  </div>
                )}

                {/* 참고 */}
                {v.refs && v.refs.length > 0 && (
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>
                    참고: {v.refs.join(' · ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>,
    document.body
  )
}
