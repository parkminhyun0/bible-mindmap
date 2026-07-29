import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/components/Sidebar.jsx');
let source = fs.readFileSync(target, 'utf8');

const DESKTOP_MARKER = 'PLACE_DESKTOP_DB_V2';
const MOBILE_MARKER = 'PLACE_DEVICE_PARITY_V2';

// 데스크톱 상세 카드도 full DB 필드를 읽도록 확장한다.
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

// compact 레이아웃(휴대폰 + 태블릿 + 좁은 뷰포트)에 장소 DB 진입/검색/일괄 배치를 추가한다.
if (!source.includes(MOBILE_MARKER)) {
  const anchor = '          {/* 노트 탭 */}';
  if (!source.includes(anchor)) {
    throw new Error('Sidebar 모바일 삽입 지점을 찾지 못했습니다. parity 스크립트 갱신 필요');
  }

  const block = `          {/* ${MOBILE_MARKER}: PC 장소 DB 기능을 모바일·태블릿 compact UI에도 동일 제공 */}
          <div style={{ padding: '0 16px 10px' }}>
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: '#fff', border: '1px solid #fed7aa',
              boxShadow: tab === 'place' ? '0 2px 10px rgba(217,119,6,.12)' : 'none',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:'#9a3412', letterSpacing:1 }}>배경 · 장소 DB</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>66권 지명 · 이명 · 동명이소 · 본문 참조</div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab(tab === 'place' ? 'verse' : 'place')}
                  aria-expanded={tab === 'place'}
                  style={{
                    minWidth:72, minHeight:40, padding:'7px 10px', borderRadius:8,
                    border:'1px solid #fdba74', cursor:'pointer', fontWeight:800, fontSize:12,
                    background: tab === 'place' ? '#d97706' : '#fff7ed',
                    color: tab === 'place' ? '#fff' : '#9a3412',
                  }}
                >📍 {tab === 'place' ? '닫기' : '장소'}</button>
              </div>

              {tab === 'place' && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'flex', gap:5 }}>
                    {[['all','전체'],['ot','구약'],['nt','신약']].map(([key,label]) => (
                      <button key={key} type="button" onClick={() => setBgTestament(key)} style={{
                        flex:1, minHeight:38, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
                        border:'1px solid #e2e8f0',
                        background:bgTestament === key ? '#334155' : '#f8fafc',
                        color:bgTestament === key ? '#fff' : '#64748b',
                      }}>{label}</button>
                    ))}
                  </div>

                  <WikidataSearchUI
                    query={bgQuery}
                    setQuery={setBgQuery}
                    results={bgResults}
                    selected={bgSelected}
                    onSelect={setBgSelected}
                    detail={bgDetail}
                    loading={bgLoading}
                    error={bgError}
                    placeholder="장소·이명·본문 참조 검색 (예: 베다니, 여호수아)"
                    renderDetail={(d) => (
                      <>
                        <div style={detailRow}><b>이름</b> {d.name}</div>
                        {d.nameEn && d.nameEn !== d.name && <div style={detailRow}><b>영문</b> {d.nameEn}</div>}
                        {d.isHomonym && (
                          <div style={{ margin:'5px 0', padding:'7px 8px', borderRadius:7, background:'#fff7ed', color:'#9a3412', fontSize:11, fontWeight:700 }}>
                            ⚠️ 동명이소{d.duplicateIndex ? ' #' + d.duplicateIndex : ''} · 동일 이름의 다른 장소와 구분 필요
                          </div>
                        )}
                        {d.aliases?.length > 0 && <div style={detailRow}><b>이명</b> {d.aliases.slice(0,6).join(' · ')}{d.aliases.length > 6 ? ' 외' : ''}</div>}
                        {d.region && <div style={detailRow}><b>등장 권</b> {d.region}</div>}
                        {d.firstRef && <div style={detailRow}><b>첫 참조</b> {d.firstRef}</div>}
                        {d.occurrenceCount > 0 && <div style={detailRow}><b>참조 수</b> {d.occurrenceCount}</div>}
                        {d.lat != null && <div style={detailRow}><b>대표 좌표</b> {d.lat}°N {d.lon}°E</div>}
                        {d.lat == null && <div style={{ ...detailRow, color:'#92400e' }}><b>좌표</b> 미확정 · 본문 지명은 DB에 보존</div>}
                        {d.samePlaceAs?.length > 0 && <div style={detailRow}><b>동일 장소명</b> {d.samePlaceAs.map(x => x.nameEn || x.id).join(' · ')}</div>}
                        {d.locationBasis && (
                          <div style={{ margin:'5px 0', padding:'7px 8px', borderRadius:7, background:d.certainty === 'disputed' ? '#fff7ed' : '#f0fdf4', color:d.certainty === 'disputed' ? '#9a3412' : '#166534', fontSize:10.5 }}>
                            <b>위치 검증:</b> {d.certainty === 'confirmed' ? '확정적' : d.certainty === 'probable' ? '유력' : '미확정/논쟁 가능'}
                            <div style={{ marginTop:2 }}>{d.locationBasis}</div>
                          </div>
                        )}
                        <BibleEvidence detail={d} />
                      </>
                    )}
                  />

                  <button onClick={() => { handleAdd(); onMobileClose(); }} disabled={!bgDetail} style={{
                    ...btnStyle, minHeight:44, background:'#d97706', opacity:bgDetail ? 1 : .4,
                  }}>+ 선택 장소 추가</button>

                  {bgResults.length > 1 && (
                    <button onClick={() => { handleAddAllResults(); onMobileClose(); }} style={{
                      ...btnStyle, minHeight:44, background:'#0f766e',
                    }}>🗺️ 검색 결과 {bgResults.length}곳 모두 추가</button>
                  )}

                  <div style={{ paddingTop:9, marginTop:2, borderTop:'1px dashed #e2e8f0' }}>
                    <div style={{ fontSize:11, fontWeight:800, color:'#475569', marginBottom:5 }}>본문·지역 지명 일괄 배치</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <input value={bulkQuery} onChange={(e) => setBulkQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && bulkQuery.trim()) handleBulkAddByReference(); }}
                        placeholder="여호수아 · 사도행전 · 갈릴리"
                        style={{ ...inputStyle, minHeight:42, flex:1, minWidth:0 }} />
                      <button onClick={handleBulkAddByReference} disabled={!bulkQuery.trim()} style={{
                        minWidth:58, minHeight:42, border:'none', borderRadius:8, cursor:'pointer',
                        background:'#0369a1', color:'#fff', fontWeight:800, opacity:bulkQuery.trim() ? 1 : .4,
                      }}>추가</button>
                    </div>
                    {bulkMsg && <div style={{ fontSize:10.5, color:'#0f766e', marginTop:5, lineHeight:1.45 }}>{bulkMsg}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>

`;
  source = source.replace(anchor, block + anchor);
}

fs.writeFileSync(target, source);
console.log('✓ 장소 DB PC·모바일·태블릿 parity 적용');
