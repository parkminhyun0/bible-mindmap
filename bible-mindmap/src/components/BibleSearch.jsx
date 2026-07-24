import { useState, useMemo } from 'react';
import { OT_BOOKS, NT_BOOKS, isOT } from '../data/bibleBooks';
import { TRANSLATIONS, fetchAllTranslations, fetchVerseCount } from '../api/bibleApi';
import useMobile from '../hooks/useMobile';

const STEPS = { BOOK: 0, CHAPTER: 1, VERSE: 2, RESULT: 3 };

export default function BibleSearch({ onSelect, onAddArcing, onOpenSyntax }) {
  const isMobile = useMobile();
  // 모바일 tap-friendly 오버라이드 (Apple HIG 44px)
  const mBook   = isMobile ? { padding:'10px 4px', fontSize:13, minHeight:44 } : {};
  const mNum    = isMobile ? { padding:'12px 0',   fontSize:14, minHeight:44 } : {};
  const mChip   = isMobile ? { padding:'8px 12px', fontSize:13, minHeight:36, borderRadius:16 } : {};
  const mTab    = isMobile ? { padding:'12px 0',   fontSize:14, minHeight:44 } : {};
  const mInput  = isMobile ? { padding:'10px 8px', fontSize:15, minHeight:44 } : {};
  const mFetch  = isMobile ? { padding:'12px 0',   fontSize:14, minHeight:44 } : {};
  const mAdd    = isMobile ? { padding:'12px 0',   fontSize:14, minHeight:44 } : {};
  const mBack   = isMobile ? { padding:'10px 0',   fontSize:13, minHeight:40 } : {};
  const mGridBook = isMobile ? { gridTemplateColumns:'repeat(3, 1fr)', gap:6, maxHeight:'52vh' } : {};
  const mGridChap = isMobile ? { gridTemplateColumns:'repeat(5, 1fr)', gap:6, maxHeight:'50vh' } : {};
  const [testament, setTestament] = useState('ot');
  const [translation, setTranslation] = useState('krv');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [verseStart, setVerseStart] = useState(1);
  const [verseEnd, setVerseEnd] = useState(1);
  const [maxVerses, setMaxVerses] = useState(null);   // 현재 장의 총 절 수
  const [verseCountLoading, setVerseCountLoading] = useState(false);
  const [step, setStep] = useState(STEPS.BOOK);
  const [fetchedText, setFetchedText] = useState('');
  const [fetchedTranslations, setFetchedTranslations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const books = testament === 'ot' ? OT_BOOKS : NT_BOOKS;

  const availableTranslations = useMemo(() => {
    return TRANSLATIONS.filter((t) => {
      if (t.testament === 'ot' && testament === 'nt') return false;
      if (t.testament === 'nt' && testament === 'ot') return false;
      return true;
    });
  }, [testament]);

  const handleTestamentChange = (t) => {
    setTestament(t);
    setSelectedBook(null);
    setSelectedChapter(null);
    setStep(STEPS.BOOK);
    setFetchedText('');
    setError('');
    const current = TRANSLATIONS.find((tr) => tr.id === translation);
    if (current?.testament && current.testament !== t) {
      setTranslation('krv');
    }
  };

  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setStep(STEPS.CHAPTER);
    setFetchedText('');
    setError('');
  };

  const handleChapterSelect = (ch) => {
    setSelectedChapter(ch);
    setVerseStart(1);
    setVerseEnd(1);
    setMaxVerses(null);
    setStep(STEPS.VERSE);
    setFetchedText('');
    setError('');
    // 해당 장의 총 절 수를 비동기로 조회 (캐시 활용 — 이미 fetch된 장은 즉시 반환)
    if (selectedBook) {
      setVerseCountLoading(true);
      fetchVerseCount(selectedBook.id, ch)
        .then(count => setMaxVerses(count))
        .catch(() => {})
        .finally(() => setVerseCountLoading(false));
    }
  };

  const handleFetch = async () => {
    if (!selectedBook || !selectedChapter) return;
    setLoading(true);
    setError('');
    setFetchedText('');
    setFetchedTranslations(null);
    try {
      const translations = await fetchAllTranslations(
        selectedBook.id,
        selectedChapter,
        verseStart,
        verseEnd,
      );
      const preview = translations[translation] || translations.krv || '(본문 없음)';
      setFetchedText(preview);
      setFetchedTranslations(translations);
      setStep(STEPS.RESULT);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToMap = () => {
    if (!fetchedText || !selectedBook) return;
    const range =
      verseStart === verseEnd
        ? `${verseStart}`
        : `${verseStart}-${verseEnd}`;
    const reference = `${selectedBook.ko} ${selectedChapter}:${range}`;
    const color = isOT(selectedBook.id) ? '#f59e0b' : '#3b82f6';
    const trans = TRANSLATIONS.find((t) => t.id === translation);

    onSelect({
      reference,
      text: fetchedTranslations?.krv || fetchedText,
      color,
      translation: trans?.label || '',
      translationId: translation,
      bookId: selectedBook.id,
      chapter: selectedChapter,
      verseStart,
      verseEnd,
      translations: fetchedTranslations || { [translation]: fetchedText },
      activeTab: translation,
    });
  };

  const handleReset = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
    setVerseStart(1);
    setVerseEnd(1);
    setMaxVerses(null);
    setStep(STEPS.BOOK);
    setFetchedText('');
    setFetchedTranslations(null);
    setError('');
  };

  const breadcrumb = [
    selectedBook?.ko,
    selectedChapter && `${selectedChapter}장`,
    step >= STEPS.VERSE &&
      (verseStart === verseEnd
        ? `${verseStart}절`
        : `${verseStart}-${verseEnd}절`),
  ]
    .filter(Boolean)
    .join(' > ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Translation selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {availableTranslations.map((t) => (
          <button
            key={t.id}
            onClick={() => setTranslation(t.id)}
            style={{
              ...chipStyle,
              ...mChip,
              background: translation === t.id ? '#6366f1' : '#e2e8f0',
              color: translation === t.id ? '#fff' : '#475569',
              fontWeight: translation === t.id ? 700 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Testament tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={() => handleTestamentChange('ot')}
          style={{
            ...tabStyle,
            ...mTab,
            background: testament === 'ot' ? '#f59e0b' : '#e2e8f0',
            color: testament === 'ot' ? '#fff' : '#64748b',
          }}
        >
          구약 (39)
        </button>
        <button
          onClick={() => handleTestamentChange('nt')}
          style={{
            ...tabStyle,
            ...mTab,
            background: testament === 'nt' ? '#3b82f6' : '#e2e8f0',
            color: testament === 'nt' ? '#fff' : '#64748b',
          }}
        >
          신약 (27)
        </button>
      </div>

      {/* Breadcrumb */}
      {breadcrumb && (
        <div
          style={{
            fontSize: 11,
            color: '#6366f1',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{breadcrumb}</span>
          <button
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 11,
              padding: 0,
            }}
          >
            ✕ 초기화
          </button>
        </div>
      )}

      {/* Step 1: Book selection */}
      {step === STEPS.BOOK && (
        <div
          className="momentum-scroll"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 3,
            maxHeight: 420,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            ...mGridBook,
          }}
        >
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => handleBookSelect(book)}
              style={{
                ...bookBtnStyle,
                ...mBook,
                background:
                  selectedBook?.id === book.id ? '#6366f1' : '#fff',
                color: selectedBook?.id === book.id ? '#fff' : '#334155',
              }}
            >
              {book.ko}
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Chapter selection */}
      {step === STEPS.CHAPTER && selectedBook && (
        <>
          <div style={{ fontSize: isMobile ? 13 : 12, color: '#64748b', fontWeight: 600 }}>
            장 선택 ({selectedBook.chapters}장)
          </div>
          <div
            className="momentum-scroll"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 3,
              maxHeight: 360,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              ...mGridChap,
            }}
          >
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(
              (ch) => (
                <button
                  key={ch}
                  onClick={() => handleChapterSelect(ch)}
                  style={{
                    ...numBtnStyle,
                    ...mNum,
                    background: selectedChapter === ch ? '#6366f1' : '#fff',
                    color: selectedChapter === ch ? '#fff' : '#334155',
                  }}
                >
                  {ch}
                </button>
              ),
            )}
          </div>
          <button onClick={() => setStep(STEPS.BOOK)} style={{ ...backBtnStyle, ...mBack }}>
            ← 책 목록
          </button>
        </>
      )}

      {/* Step 3: Verse selection */}
      {step === STEPS.VERSE && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>절 범위</span>
            {verseCountLoading && (
              <span style={{ fontSize: 10, color: '#94a3b8' }}>절 수 조회 중…</span>
            )}
            {maxVerses && !verseCountLoading && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: '#eff6ff', color: '#1d4ed8',
                border: '1px solid #bfdbfe', borderRadius: 99,
                padding: '1px 8px',
              }}>
                총 {maxVerses}절
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={1}
              max={maxVerses ?? undefined}
              value={verseStart}
              onChange={(e) => {
                const v = Math.max(1, Math.min(+e.target.value, maxVerses ?? Infinity));
                setVerseStart(v);
                if (verseEnd < v) setVerseEnd(v);
              }}
              style={{ ...numInputStyle, ...mInput, width: isMobile ? 72 : 56 }}
            />
            <span style={{ color: '#94a3b8', fontSize: 13 }}>~</span>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={verseStart}
              max={maxVerses ?? undefined}
              value={verseEnd}
              onChange={(e) => setVerseEnd(Math.max(verseStart, Math.min(+e.target.value, maxVerses ?? Infinity)))}
              style={{ ...numInputStyle, ...mInput, width: isMobile ? 72 : 56 }}
            />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>절</span>
            {maxVerses && (
              <button
                onClick={() => { setVerseEnd(maxVerses); }}
                title="마지막 절로 설정"
                style={{
                  fontSize: isMobile ? 12 : 10,
                  padding: isMobile ? '6px 10px' : '3px 7px',
                  border: '1px solid #bfdbfe',
                  borderRadius: 4, background: '#eff6ff', color: '#1d4ed8',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600,
                  minHeight: isMobile ? 40 : undefined,
                }}
              >끝절</button>
            )}
          </div>

          <button
            onClick={handleFetch}
            disabled={loading}
            style={{
              ...fetchBtnStyle,
              ...mFetch,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '불러오는 중...' : '📖 본문 불러오기'}
          </button>

          {error && (
            <div style={{ fontSize: isMobile ? 12 : 11, color: '#ef4444', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          <button
            onClick={() => setStep(STEPS.CHAPTER)}
            style={{ ...backBtnStyle, ...mBack }}
          >
            ← 장 선택
          </button>
        </>
      )}

      {/* Step 4: Result */}
      {step === STEPS.RESULT && fetchedText && (
        <>
          <div
            className="momentum-scroll"
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: isMobile ? 14 : 10,
              fontSize: isMobile ? 15 : 13,
              lineHeight: 1.6,
              maxHeight: isMobile ? 240 : 160,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              color: '#1e293b',
              whiteSpace: 'pre-wrap',
            }}
          >
            {fetchedText}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <button onClick={handleAddToMap} style={{ ...addBtnStyle, ...mAdd }}>
                + 구절 추가
              </button>
              {onAddArcing && selectedBook && (
                <button
                  onClick={() => {
                    const range = verseStart === verseEnd ? `${verseStart}절` : `${verseStart}-${verseEnd}절`;
                    onAddArcing({
                      bookId: selectedBook.id,
                      chapter: selectedChapter,
                      verseStart,
                      verseEnd,
                      title: `${selectedBook.ko} ${selectedChapter}:${range}`,
                    });
                  }}
                  style={{ ...addBtnStyle, ...mAdd, background: '#6d28d9', flex: 1,
                    fontSize: isMobile ? 13 : 11.5, whiteSpace: 'nowrap',
                    padding: isMobile ? '12px 8px' : '8px 6px' }}
                >
                  📖 본문 흐름 분석
                </button>
              )}
              {onOpenSyntax && selectedBook && (
                <button
                  onClick={() => onOpenSyntax({
                    bookId: selectedBook.id,
                    chapter: selectedChapter,
                    verseStart,
                    verseEnd,
                  })}
                  style={{ ...addBtnStyle, ...mAdd, background: '#065f46', flex: 1,
                    whiteSpace: 'nowrap',
                    padding: isMobile ? '12px 8px' : '8px 6px' }}
                >
                  🔤 구문 분석
                </button>
              )}
            </div>
            <button onClick={() => setStep(STEPS.VERSE)} style={{ ...backBtnStyle, ...mBack }}>
              ← 다시
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const chipStyle = {
  padding: '4px 8px',
  fontSize: 11,
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
};

const tabStyle = {
  flex: 1,
  padding: '6px 0',
  fontSize: 13,
  fontWeight: 700,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const bookBtnStyle = {
  padding: '5px 2px',
  fontSize: 11,
  border: '1px solid #e2e8f0',
  borderRadius: 4,
  cursor: 'pointer',
  textAlign: 'center',
  lineHeight: 1.3,
};

const numBtnStyle = {
  padding: '5px 0',
  fontSize: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 4,
  cursor: 'pointer',
  textAlign: 'center',
};

const numInputStyle = {
  padding: '6px 8px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  outline: 'none',
  textAlign: 'center',
};

const fetchBtnStyle = {
  padding: '8px 0',
  fontSize: 13,
  fontWeight: 600,
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const addBtnStyle = {
  flex: 1,
  padding: '8px 0',
  fontSize: 13,
  fontWeight: 600,
  background: '#10b981',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const backBtnStyle = {
  padding: '4px 0',
  fontSize: 12,
  background: 'none',
  color: '#94a3b8',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
};
