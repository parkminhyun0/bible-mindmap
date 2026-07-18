import { useState, useMemo } from 'react';
import { OT_BOOKS, NT_BOOKS, isOT } from '../data/bibleBooks';
import { TRANSLATIONS, fetchVerse } from '../api/bibleApi';

const STEPS = { BOOK: 0, CHAPTER: 1, VERSE: 2, RESULT: 3 };

export default function BibleSearch({ onSelect }) {
  const [testament, setTestament] = useState('ot');
  const [translation, setTranslation] = useState('krv');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [verseStart, setVerseStart] = useState(1);
  const [verseEnd, setVerseEnd] = useState(1);
  const [step, setStep] = useState(STEPS.BOOK);
  const [fetchedText, setFetchedText] = useState('');
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
    setStep(STEPS.VERSE);
    setFetchedText('');
    setError('');
  };

  const handleFetch = async () => {
    if (!selectedBook || !selectedChapter) return;
    setLoading(true);
    setError('');
    setFetchedText('');
    try {
      const text = await fetchVerse(
        selectedBook.id,
        selectedChapter,
        verseStart,
        verseEnd,
        translation,
      );
      setFetchedText(text);
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
      text: fetchedText,
      color,
      translation: trans?.label || '',
      translationId: translation,
      bookId: selectedBook.id,
      chapter: selectedChapter,
      verseStart,
      verseEnd,
    });
  };

  const handleReset = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
    setVerseStart(1);
    setVerseEnd(1);
    setStep(STEPS.BOOK);
    setFetchedText('');
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
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 3,
            maxHeight: 420,
            overflowY: 'auto',
          }}
        >
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => handleBookSelect(book)}
              style={{
                ...bookBtnStyle,
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
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            장 선택 ({selectedBook.chapters}장)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 3,
              maxHeight: 360,
              overflowY: 'auto',
            }}
          >
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(
              (ch) => (
                <button
                  key={ch}
                  onClick={() => handleChapterSelect(ch)}
                  style={{
                    ...numBtnStyle,
                    background: selectedChapter === ch ? '#6366f1' : '#fff',
                    color: selectedChapter === ch ? '#fff' : '#334155',
                  }}
                >
                  {ch}
                </button>
              ),
            )}
          </div>
          <button onClick={() => setStep(STEPS.BOOK)} style={backBtnStyle}>
            ← 책 목록
          </button>
        </>
      )}

      {/* Step 3: Verse selection */}
      {step === STEPS.VERSE && (
        <>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            절 범위
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              min={1}
              value={verseStart}
              onChange={(e) => {
                const v = Math.max(1, +e.target.value);
                setVerseStart(v);
                if (verseEnd < v) setVerseEnd(v);
              }}
              style={{ ...numInputStyle, width: 56 }}
            />
            <span style={{ color: '#94a3b8', fontSize: 13 }}>~</span>
            <input
              type="number"
              min={verseStart}
              value={verseEnd}
              onChange={(e) => setVerseEnd(Math.max(verseStart, +e.target.value))}
              style={{ ...numInputStyle, width: 56 }}
            />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>절</span>
          </div>

          <button
            onClick={handleFetch}
            disabled={loading}
            style={{
              ...fetchBtnStyle,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '불러오는 중...' : '📖 본문 불러오기'}
          </button>

          {error && (
            <div style={{ fontSize: 11, color: '#ef4444', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          <button
            onClick={() => setStep(STEPS.CHAPTER)}
            style={backBtnStyle}
          >
            ← 장 선택
          </button>
        </>
      )}

      {/* Step 4: Result */}
      {step === STEPS.RESULT && fetchedText && (
        <>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 10,
              fontSize: 13,
              lineHeight: 1.6,
              maxHeight: 160,
              overflowY: 'auto',
              color: '#1e293b',
              whiteSpace: 'pre-wrap',
            }}
          >
            {fetchedText}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={handleAddToMap} style={addBtnStyle}>
              + 캔버스에 추가
            </button>
            <button onClick={() => setStep(STEPS.VERSE)} style={backBtnStyle}>
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
