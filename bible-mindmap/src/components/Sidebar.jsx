import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import BibleSearch from './BibleSearch';
import useMobile from '../hooks/useMobile';
import { searchBiblicalPerson } from '../api/wikidataApi';
import { BIBLICAL_PERIOD_GROUPS, BIBLICAL_PERIODS } from '../data/biblicalPeriods';
import { getBibleTags } from '../data/bibleReferences';
import { searchPlacesCombined, getPlacesByReferenceCombined, loadPlacesIndex } from '../data/placesIndex';
import { detectInputMode } from '../utils/wordSearch';

const ManualModal = lazy(() => import('./ManualModal'));
const WordSearchModal = lazy(() => import('./WordSearchModal'));
const ContextBibleModal = lazy(() => import('./ContextBibleModal'));
import ParallelStudyLauncher from './ParallelStudyLauncher';
import CanonicalConceptLauncher from './CanonicalConceptLauncher';

export default function Sidebar({ onAddNode, onAddNodes, mobileOpen, onMobileClose, onOpenSyntax, contextBibleInitialRef }) {
  const isMobile = useMobile();
  const [tab, setTab] = useState('verse');
  const [showManual, setShowManual] = useState(false);
  const [showContextBible, setShowContextBible] = useState(false);

  // 원어 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('original');
  const [showWordSearch, setShowWordSearch] = useState(false);
  const [wordSearchKey, setWordSearchKey] = useState(0);
  const [pendingSearch, setPendingSearch] = useState(null);

  const handleWordSearch = (q, m) => {
    if (!q.trim()) return;
    setPendingSearch({ q, m });
    setShowWordSearch(false);
    setTimeout(() => {
      setShowWordSearch(true);
      setWordSearchKey((k) => k + 1);
    }, 0);
  };
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [verseMode, setVerseMode] = useState('search');
  const [contentOpen, setContentOpen] = useState(true);

  // 배경 노드 (person/place) 공통 상태
  const [bgQuery, setBgQuery] = useState('');
  const [bgResults, setBgResults] = useState([]);
  const [bgSelected, setBgSelected] = useState(null); // 선택된 후보 QID
  const [bgDetail, setBgDetail] = useState(null);    // 상세 데이터
  const [bulkQuery, setBulkQuery] = useState('');    // 지명 일괄 추가 (본문·지역·키워드)
  const [bulkMsg, setBulkMsg] = useState('');
  const [bgLoading, setBgLoading] = useState(false);
  const [bgError, setBgError] = useState('');
  const [bgTestament, setBgTestament] = useState('all');
  const debounceRef = useRef(null);

  // 시대 3단계 분류 상태: 대분류(구약·신약) → 중분류(역사 구간) → 소분류(개별 시대)
  const [selectedPeriodGroupId, setSelectedPeriodGroupId] = useState(BIBLICAL_PERIOD_GROUPS[0].id);
  const [selectedPeriodId, setSelectedPeriodId] = useState(BIBLICAL_PERIODS[0].id);

  useEffect(() => {
    if (tab !== 'period') return;
    const visibleGroups = BIBLICAL_PERIOD_GROUPS.filter(
      (group) => bgTestament === 'all'
        || group.testament === 'both'
        || group.testament === bgTestament,
    );
    const selectedPeriod = BIBLICAL_PERIODS.find((period) => period.id === selectedPeriodId);
    const periodGroupIsVisible = visibleGroups.some((group) => group.id === selectedPeriod?.group);
    const nextGroupId = visibleGroups.some((group) => group.id === selectedPeriodGroupId)
      ? selectedPeriodGroupId
      : periodGroupIsVisible
        ? selectedPeriod.group
        : visibleGroups[0]?.id;

    if (nextGroupId && nextGroupId !== selectedPeriodGroupId) {
      setSelectedPeriodGroupId(nextGroupId);
      return;
    }

    const visiblePeriods = BIBLICAL_PERIODS.filter(
      (period) => period.group === nextGroupId
        && (bgTestament === 'all'
          || period.testament === 'both'
          || period.testament === bgTestament),
    );
    if (!visiblePeriods.some((period) => period.id === selectedPeriodId)) {
      setSelectedPeriodId(visiblePeriods[0]?.id || BIBLICAL_PERIODS[0].id);
    }
  }, [bgTestament, selectedPeriodGroupId, selectedPeriodId, tab]);

  const handlePeriodGroupChange = (groupId) => {
    setSelectedPeriodGroupId(groupId);
    const firstPeriod = BIBLICAL_PERIODS.find(
      (period) => period.group === groupId
        && (bgTestament === 'all'
          || period.testament === 'both'
          || period.testament === bgTestament),
    );
    if (firstPeriod) setSelectedPeriodId(firstPeriod.id);
  };

  // 탭 전환 시 배경 노드 상태 초기화
  useEffect(() => {
    setBgQuery(''); setBgResults([]); setBgSelected(null); setBgDetail(null); setBgError('');
    setBulkQuery(''); setBulkMsg('');
    if (tab === 'place') loadPlacesIndex(); // 지명 색인 미리 로드
  }, [tab]);

  // 검색어 변경 시 SPARQL 자동 검색 (디바운스 600ms)
  // 결과 자체에 날짜·좌표 포함 → 별도 상세 fetch 불필요
  useEffect(() => {
    if (tab !== 'person' && tab !== 'place') return;
    if (!bgQuery.trim()) { setBgResults([]); setBgSelected(null); setBgDetail(null); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBgLoading(true); setBgError(''); setBgResults([]); setBgDetail(null);
      try {
        const search = tab === 'person' ? searchBiblicalPerson : searchPlacesCombined;
        const results = await search(bgQuery, bgTestament);
        setBgResults(results);
        if (results.length > 0) {
          setBgSelected(results[0].id);
          setBgDetail(results[0]);
        } else {
          setBgSelected(null);
        }
      } catch {
        setBgError('검색 오류 — 잠시 후 다시 시도해 주세요');
      } finally {
        setBgLoading(false);
      }
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [bgQuery, bgTestament, tab]);

  // 후보 선택 시 해당 결과 데이터로 즉시 교체 (추가 fetch 없음)
  useEffect(() => {
    if (!bgSelected || bgResults.length === 0) return;
    const found = bgResults.find((r) => r.id === bgSelected);
    if (found) setBgDetail(found);
  }, [bgSelected, bgResults]);

  const colors = [
    { value: '#3b82f6', label: '파랑 (신약)' },
    { value: '#f59e0b', label: '주황 (구약)' },
    { value: '#10b981', label: '초록 (평행)' },
    { value: '#ef4444', label: '빨강 (강조)' },
    { value: '#8b5cf6', label: '보라 (예언)' },
  ];

  const handleAdd = () => {
    if (tab === 'verse' && reference && text) {
      onAddNode({ type: 'verse', data: { reference, text, color } });
      setReference('');
      setText('');
    } else if (tab === 'note' && text) {
      onAddNode({ type: 'note', data: { title, text } });
      setTitle('');
      setText('');
    } else if (tab === 'topic' && title) {
      onAddNode({
        type: 'topic',
        data: { title, keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean) },
      });
      setTitle('');
      setKeywords('');
    } else if (tab === 'person' && bgDetail) {
      onAddNode({ type: 'person', data: { ...bgDetail, bibleTags: bgDetail.bibleTags || getBibleTags(bgDetail.wikidataId) } });
      setBgQuery(''); setBgResults([]); setBgSelected(null); setBgDetail(null);
    } else if (tab === 'place' && bgDetail) {
      onAddNode({ type: 'place', data: { ...bgDetail, bibleTags: bgDetail.bibleTags || getBibleTags(bgDetail.wikidataId) } });
      setBgQuery(''); setBgResults([]); setBgSelected(null); setBgDetail(null);
    } else if (tab === 'period') {
      const p = BIBLICAL_PERIODS.find((p) => p.id === selectedPeriodId);
      if (p) onAddNode({ type: 'period', data: { name: p.name, range: p.range, events: p.events, certainty: p.certainty, bibleTags: p.bibleTags || [] } });
    }
  };

  const handleAddArcing = ({ bookId, chapter, verseStart, verseEnd, title }) => {
    onAddNode({
      type: 'arcing',
      data: {
        title: title || `${bookId} ${chapter}:${verseStart}-${verseEnd}`,
        color: '#6d28d9',
        bookId,
        chapter,
        verseStart,
        verseEnd,
      },
    });
  };

  const handleBibleSelect = ({ reference: ref, text: txt, color: c, translationId, bookId, chapter, verseStart, verseEnd, translations, activeTab }) => {
    const structuredExtra = bookId
      ? {
          bookId,
          chapter,
          verseStart,
          verseEnd,
          translations: translations || { [translationId || 'krv']: txt },
          activeTab: activeTab || translationId || 'krv',
        }
      : {};
    onAddNode({
      type: 'verse',
      data: { reference: ref, text: txt, color: c, ...structuredExtra },
    });
  };

  // 여러 장소 결과를 캔버스에 한 번에 배치 (격자 자동 배치)
  const addPlaceNodes = (places) => {
    if (!onAddNodes || !places?.length) return 0;
    onAddNodes(places.map((p) => ({
      type: 'place',
      data: { ...p, bibleTags: p.bibleTags || getBibleTags(p.wikidataId) },
    })));
    return places.length;
  };

  const handleAddAllResults = () => {
    const n = addPlaceNodes(bgResults);
    setBulkMsg(n ? `${n}곳을 캔버스에 추가했습니다.` : '');
  };

  const BULK_MAX = 60;
  const handleBulkAddByReference = async () => {
    if (!bulkQuery.trim()) return;
    setBulkMsg('불러오는 중…');
    const all = await getPlacesByReferenceCombined(bulkQuery, bgTestament);
    if (!all.length) { setBulkMsg(`‘${bulkQuery}’에 해당하는 지명이 없습니다.`); return; }
    const picked = all.slice(0, BULK_MAX);
    const n = addPlaceNodes(picked);
    setBulkMsg(all.length > BULK_MAX
      ? `‘${bulkQuery}’ 관련 총 ${all.length}곳 중 핵심 ${n}곳을 추가했습니다. (더 좁히려면 책·지역명을 구체적으로)`
      : `‘${bulkQuery}’ 관련 ${n}곳을 캔버스에 추가했습니다.`);
  };

  const deferredOverlays = (
    <Suspense fallback={<div className="deferred-feature-loading">연구 도구를 불러오는 중…</div>}>
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}
      {showContextBible && (
        <ContextBibleModal
          initialRef={contextBibleInitialRef}
          onClose={() => setShowContextBible(false)}
        />
      )}
      {showWordSearch && pendingSearch && (
        <WordSearchModal
          key={wordSearchKey}
          initialQuery={pendingSearch.q}
          initialMode={pendingSearch.m}
          onClose={() => setShowWordSearch(false)}
        />
      )}
    </Suspense>
  );

  // ─── 모바일: 드로어 래퍼 ───
  if (isMobile) {
    if (!mobileOpen) return null;
    return (
      <section className="momentum-scroll h-screen-safe mobile-workspace-sheet mobile-add-sheet" style={{
          position: 'fixed', inset: 0, zIndex: 1201,
          background: 'var(--at-surface-2)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex', flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}>
          <div className="mobile-workspace-sheet__header">
            <div>
              <strong>자료 추가</strong>
              <span>구절·노트·주제·배경을 선택하세요</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setShowManual(true)} title="사용자 매뉴얼" style={manualBtnStyle}>📘 매뉴얼</button>
              <button onClick={onMobileClose} aria-label="자료 추가 닫기">✕</button>
            </div>
          </div>

          {/* 문맥 성경 (모바일)
              ⚠️ 모달 열기 버튼은 절대 onMobileClose를 호출하면 안 됨.
              App.jsx가 (!isMobile || mobileSidebarOpen) 조건으로 Sidebar를 마운트하므로,
              시트를 닫으면 Sidebar 전체가 언마운트되어 이 안의 모달 상태·렌더가 파괴됨.
              모달은 시트 위에 겹쳐서 뜨도록 두고 시트는 열린 채로 유지한다. [[mobile-modal-unmount-rule]] */}
          <div style={{ padding: '0 16px 8px' }}>
            <button
              onClick={() => setShowContextBible(true)}
              style={{
                ...MENU_BTN_BASE,
                background: 'linear-gradient(135deg,#78350f,#b45309)',
                boxShadow: '0 2px 8px rgba(180,83,9,.35)',
              }}
            >
              📖 문맥 성경
            </button>
            <div style={{ marginTop: MENU_BTN_GAP }}>
              <ParallelStudyLauncher />
            </div>
            <div style={{ marginTop: MENU_BTN_GAP }}>
              <CanonicalConceptLauncher />
            </div>
          </div>

          {/* 원어 다언어 검색 (모바일) */}
          <div style={{ padding: '0 16px 10px' }}>
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--at-surface)', border: '1px solid var(--at-separator)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--at-label-3)',
                letterSpacing: 1, marginBottom: 6 }}>원어 다언어 검색</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {[['original','원문'],['english','영어'],['korean','한글']].map(([k,l]) => (
                  <button key={k} onClick={() => setSearchMode(k)}
                    style={{
                      flex: 1, fontSize: 12, padding: '7px 0', border: 'none', borderRadius: 6,
                      cursor: 'pointer', fontWeight: searchMode === k ? 700 : 500,
                      background: searchMode === k
                        ? (k === 'original' ? '#1d4ed8' : k === 'english' ? '#059669' : '#d97706')
                        : 'var(--at-separator)',
                      color: searchMode === k ? '#fff' : 'var(--at-label-2)',
                      minHeight: 34,
                    }}>{l}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    const det = detectInputMode(e.target.value);
                    if (det) setSearchMode(det);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleWordSearch(searchQuery, searchMode);
                    }
                  }}
                  placeholder="원어·영어·한글 검색..."
                  style={{
                    flex: 1, padding: '9px 10px', borderRadius: 8,
                    border: '1px solid var(--at-separator-hard)', fontSize: 13, outline: 'none',
                    fontFamily: searchMode === 'original'
                      ? '"Ezra SIL","SBL BibLit","Noto Serif Hebrew",serif'
                      : 'inherit',
                    minHeight: 38,
                  }}
                />
                <button
                  onClick={() => handleWordSearch(searchQuery, searchMode)}
                  style={{
                    padding: '9px 14px', border: 'none', borderRadius: 8,
                    background: '#1d4ed8', color: '#fff', fontSize: 15, cursor: 'pointer',
                    minWidth: 44, minHeight: 38,
                  }}
                >🔍</button>
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', gap: 4, padding: '0 16px 10px' }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, padding: '7px 0', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: tab === t.key ? '#3b82f6' : 'var(--at-separator)',
                color: tab === t.key ? '#fff' : 'var(--at-label-2)', fontWeight: tab === t.key ? 700 : 400,
              }}>{t.icon} {t.label}</button>
            ))}
          </div>

          {/* BACKGROUND_DEVICE_PARITY_V2: PC 배경 도구 인물·장소·시대를 모바일·태블릿 compact UI에도 동일 제공 */}
          <div style={{ padding: '0 16px 10px' }}>
            <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--at-surface)', border:'1px solid var(--at-separator)', boxShadow:['person','place','period'].includes(tab) ? '0 2px 10px rgba(30,64,175,.10)' : 'none' }}>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:800, color:'var(--at-label-2)', letterSpacing:1 }}>배경 연구</div>
                <div style={{ fontSize:11, color:'var(--at-label-2)', marginTop:2 }}>인물 · 장소 · 시대를 PC와 동일한 데이터로 탐색합니다.</div>
              </div>

              <div data-testid="mobile-background-tabs" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:8 }}>
                {[
                  ['person','👤','인물','#059669'],
                  ['place','📍','장소','#d97706'],
                  ['period','🕰','시대','#6d28d9'],
                ].map(([key,icon,label,activeColor]) => (
                  <button key={key} type="button" data-background-tab={key} onClick={() => setTab(tab === key ? 'verse' : key)} aria-pressed={tab === key} style={{ minHeight:44, padding:'8px 6px', borderRadius:8, cursor:'pointer', fontWeight:800, fontSize:12, border:'1px solid var(--at-separator)', background:tab === key ? activeColor : 'var(--at-surface-2)', color:tab === key ? '#fff' : 'var(--at-label-2)', touchAction:'manipulation' }}>{icon} {label}</button>
                ))}
              </div>

              {['person','place','period'].includes(tab) && (
                <div style={{ display:'flex', gap:5, marginBottom:8 }}>
                  {[['all','전체'],['ot','구약'],['nt','신약']].map(([key,label]) => (
                    <button key={key} type="button" onClick={() => setBgTestament(key)} style={{ flex:1, minHeight:40, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700, border:'1px solid var(--at-separator)', background:bgTestament === key ? 'var(--at-accent)' : 'var(--at-surface-2)', color:bgTestament === key ? '#fff' : 'var(--at-label-2)', touchAction:'manipulation' }}>{label}</button>
                  ))}
                </div>
              )}

              {tab === 'person' && (
                <div data-background-panel="person" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <WikidataSearchUI query={bgQuery} setQuery={setBgQuery} results={bgResults} selected={bgSelected} onSelect={setBgSelected} detail={bgDetail} loading={bgLoading} error={bgError} placeholder="인물 이름 (예: 다윗, 모세, 바울)" renderDetail={(d) => (
                    <>
                      <div style={detailRow}><b>이름</b> {d.name}</div>
                      {d.category === 'historical' && <div style={{ ...detailRow, color:'#92400e', fontWeight:700 }}>🏛️ 역사 인물 · 성경 본문 직접 등장 인물 아님</div>}
                      {d.nameChangeNote && <div style={{ margin:'5px 0', padding:'7px 8px', borderRadius:7, background:'#eef2ff', color:'#3730a3', fontSize:10.5 }}><b>이름 변경:</b> {d.matchedName && d.matchedName !== d.name ? d.matchedName + ' → ' + d.name : d.nameChangeNote}{d.nameChangeReference && <div style={{ marginTop:2 }}>{d.nameChangeReference}</div>}</div>}
                      {d.originalName && <div style={{ margin:'5px 0', padding:'7px 8px', borderRadius:7, background:d.testament === 'nt' ? '#f5f3ff' : '#fffbeb', color:d.testament === 'nt' ? '#5b21b6' : '#92400e', fontSize:10.5 }}><div><b>{d.originalLanguage || '원어'}:</b> <span dir={d.testament === 'ot' ? 'rtl' : 'ltr'}>{d.originalName}</span></div>{d.transliteration && <div><b>음역:</b> {d.transliteration}</div>}{d.nameMeaning && <div><b>뜻:</b> {d.nameMeaning}</div>}</div>}
                      {d.description && <div style={{ ...detailRow, color:'var(--at-label-2)' }}>{d.description}</div>}
                      <BibleEvidence detail={d} />
                    </>
                  )} />
                  <button onClick={() => { handleAdd(); onMobileClose(); }} disabled={!bgDetail} style={{ ...btnStyle, minHeight:44, background:'#059669', opacity:bgDetail ? 1 : .4 }}>+ 선택 인물 추가</button>
                </div>
              )}

              {tab === 'place' && (
                <div data-background-panel="place" style={{ display:'flex', flexDirection:'column', gap:8 }}>
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
                    <div style={{ fontSize:11, fontWeight:800, color:'var(--at-label-2)', marginBottom:5 }}>본문·지역 지명 일괄 배치</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <input value={bulkQuery} onChange={(e) => setBulkQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && bulkQuery.trim()) handleBulkAddByReference(); }} placeholder="여호수아 · 사도행전 · 갈릴리" style={{ ...inputStyle, minHeight:42, flex:1, minWidth:0 }} />
                      <button onClick={handleBulkAddByReference} disabled={!bulkQuery.trim()} style={{ minWidth:58, minHeight:42, border:'none', borderRadius:8, cursor:'pointer', background:'#0369a1', color:'#fff', fontWeight:800, opacity:bulkQuery.trim() ? 1 : .4 }}>추가</button>
                    </div>
                    {bulkMsg && <div style={{ fontSize:10.5, color:'#0f766e', marginTop:5, lineHeight:1.45 }}>{bulkMsg}</div>}
                  </div>
                </div>
              )}

              {tab === 'period' && (
                <PeriodHierarchySelector
                  testament={bgTestament}
                  onTestamentChange={setBgTestament}
                  groupId={selectedPeriodGroupId}
                  onGroupChange={handlePeriodGroupChange}
                  periodId={selectedPeriodId}
                  onPeriodChange={setSelectedPeriodId}
                  compact
                />
              )}
            </div>
          </div>

          {/* 노트 탭 */}
          {tab === 'note' && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="노트 제목" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="노트 내용" value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              <button onClick={() => { handleAdd(); onMobileClose(); }} style={btnStyle}>+ 노트 추가</button>
            </div>
          )}

          {/* 주제 탭 */}
          {tab === 'topic' && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="주제 이름" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              <input placeholder="키워드 (쉼표 구분)" value={keywords} onChange={(e) => setKeywords(e.target.value)} style={inputStyle} />
              <button onClick={() => { handleAdd(); onMobileClose(); }} style={btnStyle}>+ 주제 추가</button>
            </div>
          )}

          {/* 구절 탭 */}
          {tab === 'verse' && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                <button onClick={() => setVerseMode('search')} style={{ ...modeTabStyle, background: verseMode === 'search' ? '#6366f1' : 'var(--at-separator)', color: verseMode === 'search' ? '#fff' : 'var(--at-label-2)' }}>🔍 검색</button>
                <button onClick={() => setVerseMode('manual')} style={{ ...modeTabStyle, background: verseMode === 'manual' ? '#6366f1' : 'var(--at-separator)', color: verseMode === 'manual' ? '#fff' : 'var(--at-label-2)' }}>✏️ 직접입력</button>
              </div>
              {verseMode === 'search' ? (
                <BibleSearch
                  onSelect={(sel) => { handleBibleSelect(sel); onMobileClose(); }}
                  onAddArcing={(p) => { handleAddArcing(p); onMobileClose(); }}
                  onOpenSyntax={(p) => { onOpenSyntax?.(p); onMobileClose(); }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input placeholder="구절 참조 (예: 창세기 1:1)" value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />
                  <textarea placeholder="본문 내용" value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                  <button onClick={() => { handleAdd(); onMobileClose(); }} style={btnStyle}>+ 추가</button>
                </div>
              )}
            </div>
          )}
        {deferredOverlays}
      </section>
    );
  }

  // ─── 접힌 상태 (얇은 세로 rail) ───────────────────────────────────
  if (!contentOpen) {
    const ALL_TABS = [...TABS, ...BG_TABS];
    const openWithTab = (key) => { setTab(key); setContentOpen(true); };

    return (
      <>
        <div className="at-sidebar-rail" style={{
          width: 56,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--at-separator)',
          background: 'linear-gradient(180deg, #eff6ff, #f0f9ff)',
          flexShrink: 0,
        }}>
          {/* 상단: 로고 + 매뉴얼 아이콘 */}
          <div style={{
            padding: '10px 0', borderBottom: '1px solid var(--at-separator)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'linear-gradient(180deg, #ffffff, #f0f9ff)',
          }}>
            <span style={{ fontSize: 22, filter: 'drop-shadow(0 1px 1px rgba(30,58,138,0.15))' }} title="성경 마인드맵">✝️</span>
            <button
              onClick={() => setShowManual(true)}
              title="사용자 매뉴얼"
              style={{
                ...railIconBtn('linear-gradient(135deg,#1e3a8a,#2563eb)', '#fff'),
                width: 36, height: 28, fontSize: 13, boxShadow: '0 2px 6px rgba(37,99,235,0.35)',
              }}
            >📘</button>
            <button
              onClick={() => setShowContextBible(true)}
              title="문맥 성경"
              style={{
                ...railIconBtn('linear-gradient(135deg,#d97706,#f59e0b)', '#fff'),
                width: 36, height: 28, fontSize: 13,
                boxShadow: '0 2px 6px rgba(217,119,6,0.4)',
              }}
            >📖</button>
            <ParallelStudyLauncher variant="rail" />
            <CanonicalConceptLauncher variant="rail" />
          </div>

          {/* 노드 타입 rail — 아이콘 + 미니 라벨 */}
          <div style={{
            padding: '8px 0', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3,
          }}>
            {ALL_TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => openWithTab(t.key)}
                  title={`${t.label} — 패널 열기`}
                  style={{
                    width: 48, padding: '5px 0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                    background: active ? 'var(--at-separator)' : 'transparent',
                    color: active ? '#1e40af' : 'var(--at-label-2)',
                    border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                    borderRadius: 7, cursor: 'pointer',
                    transition: 'background .15s, border-color .15s',
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{t.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* 하단: 세로 라벨 (열기 트리거) */}
          <div
            onClick={() => setContentOpen(true)}
            title="입력 패널 열기"
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              background: 'linear-gradient(180deg, transparent, rgba(37,99,235,0.08))',
              transition: 'background 0.2s',
              borderTop: '1px solid var(--at-separator)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37,99,235,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(180deg, transparent, rgba(37,99,235,0.08))')}
          >
            <span style={{
              writingMode: 'vertical-lr',
              fontSize: 11, fontWeight: 700, color: '#1e40af',
              letterSpacing: '.05em', userSelect: 'none',
            }}>
              ▶ 입력 패널 열기
            </span>
          </div>
        </div>

        {deferredOverlays}
      </>
    );
  }

  // ─── 열린 상태 ───
  return (
    <>
    <div className="at-sidebar-panel" style={containerStyle}>
      {/* ═══ 섹션 1: 타이틀 ═══ */}
      <div className="at-sidebar-titlebar" style={{ ...titleBarStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <h2 style={{ ...titleStyle, flex: 1, minWidth: 0 }}>✝️ 성경 마인드맵</h2>
        <button onClick={() => setShowManual(true)} title="사용자 매뉴얼" style={manualBtnStyle}>📘 매뉴얼</button>
        {/* 좌측 패널 전체 접기 (레일로) */}
        <button onClick={() => setContentOpen(false)} title="왼쪽 패널 접기" aria-label="왼쪽 패널 접기"
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 9, border: '1px solid rgba(255,255,255,.22)',
            background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: 14, cursor: 'pointer' }}>◀</button>
      </div>

      {/* ═══ 섹션 1b: 원어 검색 바 ═══ */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--at-separator)', background: 'var(--at-surface-2)' }}>
        {/* 모드 토글 */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
          {[['original','원문'],['english','영어'],['korean','한글']].map(([k,l]) => (
            <button key={k} onClick={() => setSearchMode(k)}
              style={{
                flex: 1, fontSize: 10, padding: '3px 0', border: 'none', borderRadius: 4,
                cursor: 'pointer', fontWeight: searchMode === k ? 700 : 400,
                background: searchMode === k
                  ? (k === 'original' ? '#1d4ed8' : k === 'english' ? '#059669' : '#d97706')
                  : 'var(--at-separator)',
                color: searchMode === k ? '#fff' : 'var(--at-label-2)',
              }}>{l}</button>
          ))}
        </div>
        {/* 검색 입력 */}
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              const det = detectInputMode(e.target.value);
              if (det) setSearchMode(det);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleWordSearch(searchQuery, searchMode)}
            placeholder="원어·영어·한글 검색..."
            style={{
              flex: 1, padding: '6px 8px', borderRadius: 6,
              border: '1px solid var(--at-separator-hard)', fontSize: 11.5, outline: 'none',
              fontFamily: searchMode === 'original'
                ? '"Ezra SIL","SBL BibLit","Noto Serif Hebrew",serif'
                : 'inherit',
            }}
          />
          <button
            onClick={() => handleWordSearch(searchQuery, searchMode)}
            style={{
              padding: '6px 10px', border: 'none', borderRadius: 6,
              background: '#1d4ed8', color: '#fff', fontSize: 13, cursor: 'pointer',
            }}
          >🔍</button>
        </div>
      </div>

      {/* ═══ 섹션 2: 본문 탭 (구절/노트/주제) ═══ */}
      <div style={tabBarStyle}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--at-label-3)', marginBottom: 2, letterSpacing: 1 }}>본문</div>
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...tabBtnStyle,
                flex: 1,
                background: tab === t.key ? '#3b82f6' : 'var(--at-separator)',
                color: tab === t.key ? '#fff' : 'var(--at-label-2)',
                fontWeight: tab === t.key ? 700 : 400,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'note' && (
          <div style={tabInputArea}>
            <input placeholder="노트 제목" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            <textarea placeholder="노트 내용" value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            <button onClick={handleAdd} style={btnStyle}>+ 노트 추가</button>
          </div>
        )}

        {tab === 'topic' && (
          <div style={tabInputArea}>
            <input placeholder="주제 이름" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            <input placeholder="키워드 (쉼표 구분)" value={keywords} onChange={(e) => setKeywords(e.target.value)} style={inputStyle} />
            <button onClick={handleAdd} style={btnStyle}>+ 주제 추가</button>
          </div>
        )}
      </div>

      {/* ═══ 섹션 2c: 문맥 성경 버튼 ═══ */}
      <div style={{ ...tabBarStyle, borderTop: '1px solid var(--at-separator)', paddingTop: 10 }}>
        <button
          onClick={() => setShowContextBible(true)}
          style={{
            ...MENU_BTN_BASE,
            background: 'linear-gradient(135deg,#78350f,#b45309)',
            boxShadow: '0 2px 8px rgba(180,83,9,.35)',
            transition: 'filter .18s, box-shadow .18s',
          }}
          onMouseOver={e => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
          onMouseOut={e => { e.currentTarget.style.filter = 'none'; }}
        >
          📖 문맥 성경
        </button>
        <div style={{ marginTop: MENU_BTN_GAP }}>
          <ParallelStudyLauncher />
        </div>
        <div style={{ marginTop: MENU_BTN_GAP }}>
          <CanonicalConceptLauncher />
        </div>
      </div>

      {/* ═══ 섹션 2b: 배경 탭 (인물/장소/시대) ═══ */}
      <div style={{ ...tabBarStyle, borderTop: '1px solid var(--at-separator)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--at-label-3)', marginBottom: 2, letterSpacing: 1 }}>배경</div>
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {[
            { key: 'all', label: '전체' },
            { key: 'ot', label: '구약' },
            { key: 'nt', label: '신약' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setBgTestament(item.key)}
              style={{
                ...testamentBtnStyle,
                background: bgTestament === item.key ? 'var(--at-accent)' : 'var(--at-surface-3)',
                color: bgTestament === item.key ? '#fff' : 'var(--at-label-2)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {BG_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...tabBtnStyle,
                flex: 1,
                background: tab === t.key
                  ? (t.key === 'person' ? '#059669' : t.key === 'place' ? '#d97706' : '#6d28d9')
                  : 'var(--at-separator)',
                color: tab === t.key ? '#fff' : 'var(--at-label-2)',
                fontWeight: tab === t.key ? 700 : 400,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* 인물 검색 인라인 입력 */}
        {tab === 'person' && (
          <div style={tabInputArea}>
            <WikidataSearchUI
              query={bgQuery}
              setQuery={setBgQuery}
              results={bgResults}
              selected={bgSelected}
              onSelect={setBgSelected}
              detail={bgDetail}
              loading={bgLoading}
              error={bgError}
              placeholder="인물 이름 (예: 다윗, 모세, 바울)"
              renderDetail={(d) => (
                <>
                  <div style={detailRow}><b>이름</b> {d.name}</div>
                  {d.category === 'historical' && (
                    <div style={{ ...detailRow, color: '#92400e', fontWeight: 700 }}>
                      🏛️ 역사 인물 · 연대 추정 (성경 본문 직접 등장 인물 아님)
                    </div>
                  )}
                  {d.nameChangeNote && (
                    <div style={{
                      margin: '5px 0', padding: '6px 8px', borderRadius: 6,
                      background: '#eef2ff', color: '#3730a3', fontSize: 10,
                    }}>
                      <b>이름 변경:</b> {d.matchedName && d.matchedName !== d.name ? `${d.matchedName} → ${d.name}` : d.nameChangeNote}
                      <div style={{ marginTop: 2 }}>{d.nameChangeNote} · {d.nameChangeReference}</div>
                    </div>
                  )}
                  {d.originalName && (
                    <div style={{
                      margin: '5px 0', padding: '6px 8px', borderRadius: 6,
                      background: d.testament === 'nt' ? '#f5f3ff' : '#fffbeb',
                      color: d.testament === 'nt' ? '#5b21b6' : '#92400e', fontSize: 10,
                    }}>
                        <div><b>{d.originalLanguage}:</b> <span dir={d.testament === 'ot' ? 'rtl' : 'ltr'}>{d.originalName}</span></div>
                        <div><b>음역:</b> {d.transliteration}</div>
                        <div><b>뜻:</b> {d.nameMeaning}</div>
                        {d.nameMeaningBasis && <div><b>뜻 근거:</b> {d.nameMeaningBasis}</div>}
                      </div>
                    )}
                  {d.birthDate && <div style={detailRow}><b>출생</b> {d.birthDate}</div>}
                  {d.deathDate && <div style={detailRow}><b>사망</b> {d.deathDate}</div>}
                  {d.description && <div style={{ ...detailRow, color: 'var(--at-label-2)' }}>{d.description}</div>}
                  <BibleEvidence detail={d} />
                </>
              )}
            />
            <button onClick={handleAdd} disabled={!bgDetail} style={{ ...btnStyle, background: '#059669', opacity: bgDetail ? 1 : 0.4 }}>
              + {bgDetail?.category === 'historical' ? '역사 인물' : '성경 인물'} 추가
            </button>
          </div>
        )}

        {/* 장소 검색 인라인 입력 */}
        {tab === 'place' && (
          <div style={tabInputArea}>
            <WikidataSearchUI
              query={bgQuery}
              setQuery={setBgQuery}
              results={bgResults}
              selected={bgSelected}
              onSelect={setBgSelected}
              detail={bgDetail}
              loading={bgLoading}
              error={bgError}
              placeholder="장소 이름 (예: 베들레헴, 예루살렘)"
              renderDetail={(d) => (
                <>
                  {/* PLACE_DESKTOP_DB_V2: full biblical places DB metadata */}
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
                  {d.description && <div style={{ ...detailRow, color:'var(--at-label-2)' }}>{d.description}</div>}
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
                  <BibleEvidence detail={d} />
                </>
              )}
            />
            <button onClick={handleAdd} disabled={!bgDetail} style={{ ...btnStyle, background: '#d97706', opacity: bgDetail ? 1 : 0.4 }}>
              + 장소 추가
            </button>

            {bgResults.length > 1 && (
              <button
                onClick={handleAddAllResults}
                style={{ ...btnStyle, background: '#0f766e', marginTop: 6 }}
                title="현재 검색 결과의 모든 장소를 캔버스에 한 번에 배치"
              >
                🗺️ 검색 결과 {bgResults.length}곳 모두 캔버스에 추가
              </button>
            )}

            {/* 본문·지역 기준 지명 일괄 배치 */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--at-label-2)', marginBottom: 4 }}>
                지명 일괄 배치 (본문·지역)
              </div>
              <input
                value={bulkQuery}
                onChange={(e) => setBulkQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && bulkQuery.trim()) handleBulkAddByReference(); }}
                placeholder="예: 여호수아, 사도행전, 블레셋, 갈릴리"
                style={inputStyle}
              />
              <button
                onClick={handleBulkAddByReference}
                disabled={!bulkQuery.trim()}
                style={{ ...btnStyle, background: '#0369a1', marginTop: 6, opacity: bulkQuery.trim() ? 1 : 0.4 }}
                title="책 이름·지역·키워드에 해당하는 모든 지명을 캔버스에 배치"
              >
                📍 ‘{bulkQuery || '…'}’ 지명 모두 캔버스에 추가
              </button>
              {bulkMsg && (
                <div style={{ fontSize: 10, color: '#0f766e', marginTop: 5 }}>{bulkMsg}</div>
              )}
            </div>
          </div>
        )}

        {/* 시대 선택: 대분류 → 중분류 → 소분류 */}
        {tab === 'period' && (
          <PeriodHierarchySelector
            testament={bgTestament}
            onTestamentChange={setBgTestament}
            groupId={selectedPeriodGroupId}
            onGroupChange={handlePeriodGroupChange}
            periodId={selectedPeriodId}
            onPeriodChange={setSelectedPeriodId}
          />
        )}
      </div>

      {/* ═══ 섹션 3: 검색/입력 콘텐츠 (접기 가능) ═══ */}
      <div style={contentAreaStyle}>
        {/* 접기 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--at-label-2)' }}>
            {tab === 'verse' ? '📖 구절 입력' : tab === 'note' ? '📝 노트' : tab === 'topic' ? '🏷️ 주제'
              : tab === 'person' ? '👤 인물' : tab === 'place' ? '📍 장소' : '🕰️ 시대'}
          </span>
          <button
            onClick={() => setContentOpen(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--at-label-3)', padding: '2px 4px',
            }}
            title="패널 접기"
          >
            ◀ 접기
          </button>
        </div>

        {tab === 'verse' && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <button
                onClick={() => setVerseMode('search')}
                style={{
                  ...modeTabStyle,
                  background: verseMode === 'search' ? '#6366f1' : 'var(--at-separator)',
                  color: verseMode === 'search' ? '#fff' : 'var(--at-label-2)',
                }}
              >
                🔍 검색
              </button>
              <button
                onClick={() => setVerseMode('manual')}
                style={{
                  ...modeTabStyle,
                  background: verseMode === 'manual' ? '#6366f1' : 'var(--at-separator)',
                  color: verseMode === 'manual' ? '#fff' : 'var(--at-label-2)',
                }}
              >
                ✏️ 직접입력
              </button>
            </div>

            {verseMode === 'search' ? (
              <BibleSearch onSelect={handleBibleSelect} onAddArcing={handleAddArcing} onOpenSyntax={onOpenSyntax} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input placeholder="구절 참조 (예: 창세기 1:1)" value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />
                <textarea placeholder="본문 내용" value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                <select value={color} onChange={(e) => setColor(e.target.value)} style={inputStyle}>
                  {colors.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <button onClick={handleAdd} style={btnStyle}>+ 추가</button>
              </div>
            )}
          </>
        )}

        {/* 범례 */}
        <div style={legendStyle}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>연결선 범례:</div>
          <div><span style={{ color: '#ef4444' }}>- - →</span> 인용</div>
          <div><span style={{ color: '#3b82f6' }}>———</span> 평행</div>
          <div><span style={{ color: '#a78bfa' }}>· · ·</span> 주제</div>
          <div><span style={{ color: '#eab308' }}>- - -</span> 반향</div>
          <div><span style={{ color: 'var(--at-label)' }}>———</span> 관계</div>
        </div>

        {/* Attribution */}
        <div style={attributionStyle}>
          원어 데이터:{' '}
          <a href="https://github.com/STEPBible/STEPBible-Data" target="_blank" rel="noreferrer" style={{ color: 'var(--at-label-2)' }}>
            STEPBible.data
          </a>{' '}
          (CC BY 4.0)
        </div>
      </div>
    </div>

    {deferredOverlays}
    </>
  );
}


function PeriodHierarchySelector({
  testament,
  onTestamentChange,
  groupId,
  onGroupChange,
  periodId,
  onPeriodChange,
  compact = false,
}) {
  const visibleGroups = BIBLICAL_PERIOD_GROUPS.filter(
    (group) => testament === 'all'
      || group.testament === 'both'
      || group.testament === testament,
  );
  const activeGroup = visibleGroups.find((group) => group.id === groupId) || visibleGroups[0];
  const visiblePeriods = BIBLICAL_PERIODS.filter(
    (period) => period.group === activeGroup?.id
      && (testament === 'all'
        || period.testament === 'both'
        || period.testament === testament),
  );
  const activePeriod = visiblePeriods.find((period) => period.id === periodId) || visiblePeriods[0];
  const certaintyLabel = {
    confirmed: '역사 확인',
    estimated: '연대 추정',
    debated: '연대 논쟁',
  };

  return (
    <div data-background-panel="period" style={{
      display: 'flex', flexDirection: 'column', gap: compact ? 8 : 9,
      padding: compact ? 0 : '4px 0',
    }}>
      <div style={periodStepHeaderStyle}>
        <span style={periodStepNumberStyle}>1</span>
        <span><b>대분류</b> · 성경 구분</span>
      </div>
      <div role="group" aria-label="시대 대분류" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
        {[
          ['all', '전체'],
          ['ot', '구약'],
          ['nt', '신약'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onTestamentChange(key)}
            aria-pressed={testament === key}
            style={{
              minHeight: 40, padding: '7px 4px', borderRadius: 8,
              border: '1px solid var(--at-separator)', cursor: 'pointer',
              background: testament === key ? '#6d28d9' : 'var(--at-surface-2)',
              color: testament === key ? '#fff' : 'var(--at-label-2)',
              fontSize: 12, fontWeight: 750, touchAction: 'manipulation',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={periodStepHeaderStyle}>
        <span style={periodStepNumberStyle}>2</span>
        <span><b>중분류</b> · 주요 역사 구간</span>
      </div>
      <div role="group" aria-label="시대 중분류" style={{
        display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr',
        gap: 5, maxHeight: compact ? '30vh' : 224, overflowY: 'auto',
        overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
        paddingRight: 2,
      }}>
        {visibleGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => onGroupChange(group.id)}
            aria-pressed={activeGroup?.id === group.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              width: '100%', minHeight: 42, padding: '8px 10px',
              borderRadius: 8, border: '1px solid',
              borderColor: activeGroup?.id === group.id ? '#8b5cf6' : 'var(--at-separator)',
              background: activeGroup?.id === group.id ? '#f3e8ff' : 'var(--at-surface-2)',
              color: activeGroup?.id === group.id ? '#581c87' : 'var(--at-label-2)',
              cursor: 'pointer', textAlign: 'left', fontSize: 11.5,
              fontWeight: activeGroup?.id === group.id ? 800 : 650,
              touchAction: 'manipulation',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>{group.icon}</span>
            <span>{group.label}</span>
          </button>
        ))}
      </div>

      <div style={periodStepHeaderStyle}>
        <span style={periodStepNumberStyle}>3</span>
        <span><b>소분류</b> · 세부 시대</span>
      </div>
      <select
        aria-label="세부 시대 선택"
        value={activePeriod?.id || ''}
        onChange={(event) => onPeriodChange(event.target.value)}
        style={{ ...inputStyle, minHeight: 44, fontWeight: 700 }}
      >
        {visiblePeriods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.icon} {period.name} — {period.range}
          </option>
        ))}
      </select>

      {activePeriod && (
        <div style={{
          padding: '10px 11px', borderRadius: 9,
          background: '#faf5ff', border: '1px solid #e9d5ff',
          fontSize: 11, color: '#581c87', lineHeight: 1.55,
          userSelect: 'text',
        }}>
          <div style={{ fontWeight: 850, marginBottom: 3 }}>
            {activePeriod.icon} {activePeriod.name}
          </div>
          <div><b>연대</b> · {activePeriod.range}</div>
          {activePeriod.summary && <div style={{ marginTop: 5 }}>{activePeriod.summary}</div>}
          {activePeriod.events?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <b>핵심 사건</b>
              <div>{activePeriod.events.slice(0, 6).join(' · ')}</div>
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <b>연대 성격</b> · {certaintyLabel[activePeriod.certainty] || activePeriod.certainty}
          </div>
          {activePeriod.bibleTags?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <b>근거 본문</b>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                {activePeriod.bibleTags.map((tag) => (
                  <span key={tag} style={{
                    padding: '2px 6px', borderRadius: 8, fontSize: 9,
                    background: '#eef2ff', color: '#4338ca',
                    border: '1px solid #c7d2fe',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (!activePeriod) return;
          onPeriodChange(activePeriod.id);
        }}
        disabled={!activePeriod}
        aria-label={activePeriod ? `${activePeriod.name} 선택 완료` : '선택 가능한 시대 없음'}
        style={{ display: 'none' }}
      />
    </div>
  );
}

const periodStepHeaderStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  marginTop: 1, color: 'var(--at-label-2)',
  fontSize: 10.5, letterSpacing: '.01em',
};

const periodStepNumberStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 20, height: 20, borderRadius: 999,
  background: '#6d28d9', color: '#fff',
  fontSize: 10, fontWeight: 850, flexShrink: 0,
};

const TABS = [
  { key: 'verse',  label: '구절', icon: '📖' },
  { key: 'note',   label: '노트', icon: '📝' },
  { key: 'topic',  label: '주제', icon: '🏷️' },
];

const BG_TABS = [
  { key: 'person', label: '인물', icon: '👤' },
  { key: 'place',  label: '장소', icon: '📍' },
  { key: 'period', label: '시대', icon: '🕰️' },
];

const containerStyle = {
  width: 300,
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid var(--at-separator)',
  background: 'var(--at-surface-2)',
};

const manualBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', fontSize: 11, fontWeight: 700,
  background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
  color: '#fff', border: 'none', borderRadius: 7,
  cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
  boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
};

// 메뉴얼 버튼과 동일한 그라데이션 감성의 사이드바 메뉴 버튼 (크기·텍스트·간격 통일)
export const MENU_BTN_BASE = {
  width: '100%', minHeight: 44, padding: '10px 12px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  border: 'none', borderRadius: 8, color: '#fff',
  fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
  fontSize: 13, fontWeight: 700, letterSpacing: '.02em',
  cursor: 'pointer', touchAction: 'manipulation', whiteSpace: 'nowrap',
};
export const MENU_BTN_GAP = 8; // 버튼 간 세로 간격

// 접힘 상태 rail 의 아이콘 버튼
function railIconBtn(bg, color, active) {
  return {
    width: 32, height: 32, padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color, fontSize: 16,
    border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
    borderRadius: 7, cursor: 'pointer',
    transition: 'background .15s, border-color .15s',
  };
}

// 섹션 1: 타이틀
const titleBarStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--at-separator)',
  background: 'var(--at-surface)',
};

const titleStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--at-label)',
  margin: 0,
};

// 섹션 2: 탭 영역
const tabBarStyle = {
  padding: '10px 16px',
  borderBottom: '1px solid var(--at-separator)',
  background: 'var(--at-surface)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const tabBtnStyle = {
  padding: '6px 0',
  fontSize: 12,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const testamentBtnStyle = {
  flex: 1,
  padding: '4px 0',
  fontSize: 10,
  fontWeight: 700,
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
};

const tabInputArea = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  paddingTop: 4,
};

// 섹션 3: 콘텐츠 영역
const contentAreaStyle = {
  flex: 1,
  padding: 16,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid var(--at-separator-hard)',
  borderRadius: 6,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const btnStyle = {
  padding: '8px 0',
  fontSize: 14,
  fontWeight: 600,
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const modeTabStyle = {
  flex: 1,
  padding: '4px 0',
  fontSize: 11,
  fontWeight: 600,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

const legendStyle = {
  marginTop: 'auto',
  paddingTop: 12,
  borderTop: '1px solid var(--at-separator)',
  fontSize: 12,
  color: 'var(--at-label-2)',
  lineHeight: 1.8,
};

const attributionStyle = {
  marginTop: 8,
  paddingTop: 8,
  borderTop: '1px solid var(--at-separator)',
  fontSize: 10,
  color: 'var(--at-label-3)',
  lineHeight: 1.5,
};

const detailRow = {
  fontSize: 11, color: 'var(--at-label-2)', marginBottom: 2,
};

// Wikidata 검색 + 후보 선택 + 상세 프리뷰 UI
function WikidataSearchUI({ query, setQuery, results, selected, onSelect, detail, loading, error, placeholder, renderDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--at-label-3)' }}>
            검색 중…
          </span>
        )}
      </div>

      {error && <div style={{ fontSize: 11, color: '#ef4444' }}>{error}</div>}

      {results.length > 1 && (
        <select
          value={selected || ''}
          onChange={(e) => onSelect(e.target.value)}
          style={{ ...inputStyle, fontSize: 11 }}
        >
          {results.map((r) => (
            <option key={r.id} value={r.id}>
              {r.category === 'biblical' ? '[성경]' : r.category === 'historical' ? '[역사·추정]' : ''} {r.label} {r.description ? `— ${r.description.slice(0, 40)}` : ''}
            </option>
          ))}
        </select>
      )}

      {detail && (
        <div style={{
          background: 'var(--at-surface-2)', border: '1px solid var(--at-separator)',
          borderRadius: 6, padding: '8px 10px', fontSize: 11,
        }}>
          {renderDetail(detail)}
          <div style={{ fontSize: 9, color: 'var(--at-label-3)', marginTop: 4 }}>
            출처: {detail.source || '성경 본문 검증'} · {detail.wikidataId}
          </div>
        </div>
      )}

      {query && !loading && results.length === 0 && !error && (
        <div style={{ fontSize: 11, color: 'var(--at-label-3)' }}>결과 없음 — 다른 이름으로 검색해 보세요</div>
      )}
    </div>
  );
}

function BibleEvidence({ detail }) {
  const tags = detail?.bibleTags || [];
  if (tags.length === 0) return null;
  const testamentLabel = detail.testament === 'both'
    ? '구약·신약'
    : detail.testament === 'nt' ? '신약' : '구약';

  return (
    <div style={{
      marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--at-separator)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--at-label)' }}>
        ✓ 성경 본문 확인 · {testamentLabel}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {tags.map((tag) => (
          <span key={tag} style={{
            padding: '2px 6px', borderRadius: 8, fontSize: 9,
            background: 'var(--at-accent-soft)', color: '#1d4ed8', border: '1px solid var(--at-separator)',
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
