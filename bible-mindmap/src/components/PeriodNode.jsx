import BackgroundNodeFrame from './BackgroundNodeFrame';
import BibleReferenceTags from './BibleReferenceTags';
import { BIBLICAL_PERIODS, getBiblicalPeriodGroup } from '../data/biblicalPeriods';

const CERTAINTY_STYLE = {
  confirmed: { label: '★확정', color: '#1d4ed8', bg: '#dbeafe' },
  estimated: { label: '추정', color: '#6d28d9', bg: '#ede9fe' },
  debated: { label: '논쟁', color: '#b45309', bg: '#fef3c7' },
};

function enrichPeriodData(data) {
  const source = BIBLICAL_PERIODS.find((period) => (
    (data.periodId && period.id === data.periodId)
    || period.name === data.name
  ));
  return source ? { ...source, ...data } : data;
}

export default function PeriodNode({ id, data, selected }) {
  const fontSize = data.fontSize || 14;
  const period = enrichPeriodData(data);
  const group = getBiblicalPeriodGroup(period.group);
  const cert = CERTAINTY_STYLE[period.certainty] || CERTAINTY_STYLE.estimated;

  return (
    <BackgroundNodeFrame
      id={id}
      selected={selected}
      title="시대"
      icon="🕰️"
      accent="#6d28d9"
      headerBackground="#ede9fe"
      minWidth={220}
      minHeight={96}
    >
      {group && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          marginBottom: 5, padding: '2px 6px', borderRadius: 999,
          fontSize: Math.max(9, fontSize - 4), fontWeight: 700,
          color: '#5b21b6', background: '#faf5ff', border: '1px solid #e9d5ff',
        }}>
          <span>{group.icon}</span>
          <span>{group.label}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{period.icon || '🕰️'}</span>
        <span style={{ fontWeight: 700, fontSize, color: '#3730a3', flex: 1 }}>
          {period.name || '시대'}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: cert.color, background: cert.bg,
          padding: '2px 5px', borderRadius: 4,
        }}>
          {cert.label}
        </span>
      </div>

      {period.range && (
        <div style={{ fontSize: Math.max(9, fontSize - 3), color: '#4338ca', fontWeight: 600, marginBottom: 5 }}>
          {period.range}
        </div>
      )}

      {period.summary && (
        <div style={{
          marginBottom: 6, padding: '6px 7px', borderRadius: 6,
          background: '#f8fafc', border: '1px solid #e2e8f0',
          fontSize: Math.max(9, fontSize - 3), color: '#334155', lineHeight: 1.5,
        }}>
          {period.summary}
        </div>
      )}

      {period.events && period.events.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 14, fontSize: Math.max(9, fontSize - 3), color: '#374151', lineHeight: 1.55 }}>
          {period.events.map((ev, i) => (
            <li key={i}>{ev}</li>
          ))}
        </ul>
      )}

      {(period.politicalContext || period.transition) && (
        <div style={{
          marginTop: 7, paddingTop: 6, borderTop: '1px dashed #c4b5fd',
          fontSize: Math.max(9, fontSize - 3), color: '#475569', lineHeight: 1.5,
        }}>
          {period.politicalContext && (
            <div><b style={{ color: '#5b21b6' }}>시대 배경</b> · {period.politicalContext}</div>
          )}
          {period.transition && (
            <div style={{ marginTop: period.politicalContext ? 4 : 0 }}>
              <b style={{ color: '#5b21b6' }}>다음 전환</b> · {period.transition}
            </div>
          )}
        </div>
      )}

      <BibleReferenceTags
        tags={period.bibleTags}
        fontSize={fontSize}
        palette={{ background: '#ede9fe', color: '#3730a3', border: '#c4b5fd' }}
      />

      {period.notes && (
        <div style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px dashed #c4b5fd',
          fontSize: Math.max(9, fontSize - 3),
          color: '#1f2937',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          ✏️ {period.notes}
        </div>
      )}
    </BackgroundNodeFrame>
  );
}
