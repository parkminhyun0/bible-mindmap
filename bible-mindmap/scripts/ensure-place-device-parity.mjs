import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/components/Sidebar.jsx');
let source = fs.readFileSync(target, 'utf8');

const DESKTOP_MARKER = 'PLACE_DESKTOP_DB_V2';
const MOBILE_MARKER = 'BACKGROUND_DEVICE_PARITY_V2';
const LEGACY_MOBILE_MARKER = 'PLACE_DEVICE_PARITY_V2';

// 데스크톱 장소 상세 카드도 full DB 필드를 읽도록 확장한다.
if (!source.includes(DESKTOP_MARKER)) {
  const oldDetail = `                  <div style={detailRow}><b>이름</b> {d.name}</div>
                   {d.region && <div style={detailRow}><b>성경 지역</b> {d.region}</div>}
                   {d.lat != null && <div style={detailRow}><b>좌표</b> {d.lat}°N {d.lon}°E</div>}
                   {d.description && <div style={{ ...detailRow, color: '#6b7280' }}>{d.description}</div>}
                   {d.locationBasis && (
                     <div style={{
                       margin: '5px 0', padding: '6px 8px', borderRadius: 6,
                       background: d.certainty === 'disputed' ? '#fff7ed' : '#f0fdf4',
                       color: d.certainty === 'disputed' ? '#9a3412' : '#166534', fontSize: 10,
                     }}>
                       <b>위치 검증:</b> {d.certainty === 'confirmed' ? '확정적' : d.certainty === 'probable' ? '유력' : '논쟁 중'}
                       <div style={{ marginTop: 2 }}>{d.locationBasis}</div>
                     </div>
                   )}
                   <BibleEvidence detail={d} />`;

  const newDetail = `                  {/* ${DESKTOP_MARKER}: full biblical places DB metadata */}
                   <div style={detailRow}><b>이름</b> {d.name}</div>
                   {d.nameEn && d.nameEn !== d.name && <div style={detailRow}><b>영문</b> {d.nameEn}</div>}
                   {d.isHomonym && (
                     <div style={{ margin:'5px 0', padding:'7px 8px', borderRadius:7, background:'#fff7ed', color:'#9a3412', fontSize:10.5, fontWeight:700 }}>
                       ⚠️ 동명이소{d.duplicateIndex ? ' #' + d.duplicateIndex : ''} · 동일 이름의 다른 장소와 구분
                     </div>
                   )}
                   {d.aliases?.length > 0 && <div style={detailRow}><b>이명</b> {d.aliases.slice(0,6).join(' · ')}{d.aliases.length > 6 ? ' 외' : ''}</div>}
                   {d.region && <div style={detailRow}><b>등장 권</b> {d.region}</div>}
                   {d.firstRef && <div style={detailRow}><b>첫 참조</b> {d.firstRef}</div>}
                   {d.occurrenceCount > 0 && <div style={detailRow}><b>참조 수</b> {d.occurrenceCount}</div>}
                   {d.lat != null && <div style={detailRow}><b>대표 좌표</b> {d.lat}°N {d.lon}°E</div>}
                   {d.lat == null && <div style={{ ...detailRow, color:'#92400e' }}><b>좌표</b> 미확정 · 본문 지명은 DB에 보존</div>}
                   {d.samePlaceAs?.length > 0 && <div style={detailRow}><b>동일 장소명</b> {d.samePlaceAs.map(x => x.nameEn || x.id).join(' · ')}</div>}
                   {d.description && <div style={{ ...detailRow, color:'#6b7280' }}>{d.description}</div>}
                   {d.locationBasis && (
                     <div style={{
                       margin:'5px 0', padding:'7px 8px', borderRadius:7,
                       background:d.certainty === 'disputed' ? '#fff7ed' : '#f0fdf4',
                       color:d.certainty === 'disputed' ? '#9a3412' : '#166534', fontSize:10.5,
                     }}>
                       <b>위치 검증:</b> {d.certainty === 'confirmed' ? '확정적' : d.certainty === 'probable' ? '유력' : '미확정/논쟁 가능'}
                       <div style={{ marginTop:2 }}>{d.locationBasis}</div>
                     </div>
                   )}
                   <BibleEvidence detail={d} />`;

  if (!source.includes(oldDetail)) {
    throw new Error('Sidebar 데스크톱 장소 상세 카드 지점을 찾지 못했습니다. parity 스크립트 갱신 필요');
  }
  source = source.replace(oldDetail, newDetail);
}

const anchor = '          {/* 노트 탭 */}';
if (!source.includes(anchor)) {
  throw new Error('Sidebar 모바일 삽입 지점을 찾지 못했습니다. BACKGROUND_DEVICE_PARITY 패치 갱신 필요');
}

// 장소 전용 V2가 이미 적용된 작업공간이면 해당 블록을 제거하고 배경 전체 V2로 승격한다.
if (!source.includes(MOBILE_MARKER) && source.includes(LEGACY_MOBILE_MARKER)) {
  const markerIndex = source.indexOf(LEGACY_MOBILE_MARKER);
  const start = source.lastIndexOf('          {/*', markerIndex);
  const end = source.indexOf(anchor, markerIndex);
  if (start >= 0 && end > start) source = source.slice(0, start) + source.slice(end);
}

if (!source.includes(MOBILE_MARKER)) {
  const block = `          {/* ${MOBILE_MARKER}: PC 배경 도구 인물·장소·시대를 모바일·태블릿 compact UI에도 동일 제공 */}
          <div style={{ padding: '0 16px 10px' }}>
            <div style={{ padding:'10px 12px', borderRadius:10, background:'#fff', border:'1px solid #dbeafe', boxShadow:['person','place','period'].includes(tab) ? '0 2px 10px rgba(30,64,175,.10)' : 'none' }}>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:800, color:'#475569', letterSpacing:1 }}>배경 연구</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>인물 · 장소 · 시대를 PC와 동일한 데이터로 탐색합니다.</div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:8 }}>
                {[
                  ['person','👤','인물','#059669'],
                  ['place','📍','장소','#d97706'],
                  ['period','🕰','시대','#6d28d9'],
                ].map(([key,icon,label,activeColor]) => (
                  <button key={key} type="button" onClick={() => setTab(tab === key ? 'verse' : key)} aria-pressed={tab === key} style={{ minHeight:42, padding:'8px 6px', borderRadius:8, cursor:'pointer', fontWeight:800, fontSize:12, border:'1px solid #e2e8f0', background:tab === key ? activeColor : '#f8fafc', color:tab === key ? '#fff' : '#475569' }}>{icon} {label}</button>
                ))}
              </div>

              {['person','place','period'].includes(tab) && (
                <div style={{ display:'flex', gap:5, marginBottom:8 }}>
                  {[['all','전체'],['ot','구약'],['nt','신약']].map(([key,label]) => (
                    <button key={key} type="button" onClick={() => setBgTestament(key)} style={{ flex:1, minHeight:38, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700, border:'1px solid #e2e8f0', background:bgTestament === key ? '#334155' : '#f8fafc', color:bgTestament === key ? '#fff' : '#64748b' }}>{label}</button>
                  ))}
                </div>
              )}

              {tab === 'person' && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <WikidataSearchUI query={bgQuery} setQuery={setBgQuery} results={bgResults} selected={bgSelected} onSelect={setBgSelected} detail={bgDetail} loading={bgLoading} error={bgError} placeholder="인물 이름 (예: 다윗, 모세, 바울)" renderDetail={(d) => (
                    <>
                      <div style={detailRow}><b>이름</b> {d.name}</div>
                      {d.category === 'historical' && <div style={{ ...detailRow, color:'#92400e', fontWeight:700 }}>🏛️ 역사 인물 · 성경 본문 직접 등장 인물 아님</div>}
                      {d.nameChangeNote && <div style={{ margin:'5px 0', padding:'7px 8px', borderRadius:7, background:'#eef2ff', color:'#3730a3', fontSize:10.5 }}><b>이름 변경:</b> {d.matchedName && d.matchedName !== d.name ? d.matchedName + ' → ' + d.name : d.nameChangeNote}{d.nameChangeReference && <div style={{ marginTop:2 }}>{d.nameChangeReference}</div>}</div>}
                      {d.originalName && <div style={{ margin:'5px 0', padding:'7px 8px', borderRadius:7, background:d.testament === 'nt' ? '#f5f3ff' : '#fffbeb', color:d.testament === 'nt' ? '#5b21b6' : '#92400e', fontSize:10.5 }}><div><b>{d.originalLanguage || '원어'}:</b> <span dir={d.testament === 'ot' ? 'rtl' : 'ltr'}>{d.originalName}</span></div>{d.transliteration && <div><b>음역:</b> {d.transliteration}</div>}{d.nameMeaning && <div><b>뜻:</b> {d.nameMeaning}</div>}</div>}
                      {d.description && <div style={{ ...detailRow, color:'#6b7280' }}>{d.description}</div>}
                      <BibleEvidence detail={d} />
                    </>
                  )} />
                  <button onClick={() => { handleAdd(); onMobileClose(); }} disabled={!bgDetail} style={{ ...btnStyle, minHeight:44, background:'#059669', opacity:bgDetail ? 1 : .4 }}>+ 선택 인물 추가</button>
                </div>
              )}

              {tab === 'place' && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <WikidataSearchUI query={bgQuery} setQuery={setBgQuery} results={bgResults} selected={bgSelected} onSelect={setBgSelected} detail={bgDetail} loading={bgLoading} error={bgError} placeholder="장소·이명·본문 참조 검색 (예: 베다니, 여호수아)" renderDetail={(d) => (
                    <>
                      <div style={detailRow}><b>이름</b> {d.name}</div>
                      {d.nameEn && d.nameEn !== d.name && <div style={detailRow}><b>영문</b> {d.nameEn}</div>}
                      {d.isHomonym && <div style={{ margin:'5px 0', padding:'7px 8px', borderRadius:7, background:'#fff7ed', color:'#9a3412', fontSize:11, fontWeight:700 }}>⚠️ 동명이소{d.duplicateIndex ? ' #' + d.duplicateIndex : ''} · 동일 이름의 다른 장소와 구분 필요</div>}
                      {d.aliases?.length > 0 && <div style={detailRow}><b>이명</b> {d.aliases.slice(0,6).join(' · ')}{d.aliases.length > 6 ? ' 외' : ''}</div>}
                      {d.region && <div style={detailRow}><b>등장 권</b> {d.region}</div>}
                      {d.firstRef && <div style={detailRow}><b>첫 참조</b> {d.firstRef}</div>}
                      {d.occurrenceCount > 0 && <div style={detailRow}><b>참조 수</b> {d.occurrenceCount}</div>}
                      {d.lat != null && <div style={detailRow}><b>대표 좌표</b> {d.lat}°N {d.lon}°E</div>}
                      {d.lat == null && <div style={{ ...detailRow, color:'#92400e' }}><b>좌표</b> 미확정 · 본문 지명은 DB에 보존</div>}
                      {d.samePlaceAs?.length > 0 && <div style={detailRow}><b>동일 장소명</b> {d.samePlaceAs.map(x => x.nameEn || x.id).join(' · ')}</div>}
                      {d.locationBasis && <div style={{ margin:'5px 0', padding:'7px 8px', borderRadius:7, background:d.certainty === 'disputed' ? '#fff7ed' : '#f0fdf4', color:d.certainty === 'disputed' ? '#9a3412' : '#166534', fontSize:10.5 }}><b>위치 검증:</b> {d.certainty === 'confirmed' ? '확정적' : d.certainty === 'probable' ? '유력' : '미확정/논쟁 가능'}<div style={{ marginTop:2 }}>{d.locationBasis}</div></div>}
                      <BibleEvidence detail={d} />
                    </>
                  )} />
                  <button onClick={() => { handleAdd(); onMobileClose(); }} disabled={!bgDetail} style={{ ...btnStyle, minHeight:44, background:'#d97706', opacity:bgDetail ? 1 : .4 }}>+ 선택 장소 추가</button>
                  {bgResults.length > 1 && <button onClick={() => { handleAddAllResults(); onMobileClose(); }} style={{ ...btnStyle, minHeight:44, background:'#0f766e' }}>🗺️ 검색 결과 {bgResults.length}곳 모두 추가</button>}
                  <div style={{ paddingTop:9, marginTop:2, borderTop:'1px dashed #e2e8f0' }}>
                    <div style={{ fontSize:11, fontWeight:800, color:'#475569', marginBottom:5 }}>본문·지역 지명 일괄 배치</div>
                    <div style={{ display:'flex', gap:6 }}><input value={bulkQuery} onChange={(e) => setBulkQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && bulkQuery.trim()) handleBulkAddByReference(); }} placeholder="여호수아 · 사도행전 · 갈릴리" style={{ ...inputStyle, minHeight:42, flex:1, minWidth:0 }} /><button onClick={handleBulkAddByReference} disabled={!bulkQuery.trim()} style={{ minWidth:58, minHeight:42, border:'none', borderRadius:8, cursor:'pointer', background:'#0369a1', color:'#fff', fontWeight:800, opacity:bulkQuery.trim() ? 1 : .4 }}>추가</button></div>
                    {bulkMsg && <div style={{ fontSize:10.5, color:'#0f766e', marginTop:5, lineHeight:1.45 }}>{bulkMsg}</div>}
                  </div>
                </div>
              )}

              {tab === 'period' && (() => {
                const visiblePeriods = BIBLICAL_PERIODS.filter((period) => bgTestament === 'all' || period.testament === 'both' || period.testament === bgTestament);
                const p = visiblePeriods.find((period) => period.id === selectedPeriodId) || visiblePeriods[0];
                return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <select value={p?.id || ''} onChange={(e) => setSelectedPeriodId(e.target.value)} style={{ ...inputStyle, minHeight:44 }}>{visiblePeriods.map((period) => <option key={period.id} value={period.id}>{period.name} · {period.range}</option>)}</select>
                  {p && <div style={{ padding:'9px 10px', borderRadius:8, background:'#faf5ff', border:'1px solid #e9d5ff', fontSize:11, color:'#581c87', lineHeight:1.55 }}><div><b>시대</b> {p.name}</div><div><b>범위</b> {p.range}</div>{p.events?.length > 0 && <div style={{ marginTop:5 }}><b>핵심 사건</b><div>{p.events.slice(0,6).join(' · ')}</div></div>}{p.certainty && <div style={{ marginTop:5 }}><b>연대 성격</b> {p.certainty}</div>}</div>}
                  <button onClick={() => { handleAdd(); onMobileClose(); }} disabled={!p} style={{ ...btnStyle, minHeight:44, background:'#6d28d9', opacity:p ? 1 : .4 }}>+ 선택 시대 추가</button>
                </div>;
              })()}
            </div>
          </div>

`;
  source = source.replace(anchor, block + anchor);
}

fs.writeFileSync(target, source);
console.log('✓ 배경 연구 인물·장소·시대 PC·모바일·태블릿 parity 적용');
