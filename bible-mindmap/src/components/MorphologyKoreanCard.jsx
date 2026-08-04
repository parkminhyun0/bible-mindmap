import { explainMorphologyKorean } from '../utils/morphologyKorean';

export default function MorphologyKoreanCard({ code, isHebrew = false }) {
  const detail = explainMorphologyKorean(code);
  if (!detail) return null;

  const accent = isHebrew ? '#92400e' : '#1d4ed8';
  const surface = isHebrew ? '#fffbeb' : '#eff6ff';
  const border = isHebrew ? '#fde68a' : '#bfdbfe';

  return (
    <section
      aria-label="형태론 한국어 해설"
      data-testid="morphology-korean-card"
      style={{
        marginTop: 10,
        padding: '11px 12px',
        borderRadius: 10,
        border: `1px solid ${border}`,
        background: surface,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ color: accent, fontSize: 12 }}>형태론 한국어 해설</strong>
        <code style={{ color: '#64748b', fontSize: 10 }}>{detail.code}</code>
      </div>

      <p style={{ margin: '7px 0 0', color: '#1e293b', fontSize: 13, fontWeight: 700, lineHeight: 1.55 }}>
        {detail.summary}
      </p>

      <p style={{ margin: '7px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.65 }}>
        {detail.explanation}
      </p>

      <p style={{ margin: '8px 0 0', paddingTop: 7, borderTop: `1px solid ${border}`, color: '#64748b', fontSize: 10, lineHeight: 1.55 }}>
        {detail.caution}
      </p>
    </section>
  );
}
