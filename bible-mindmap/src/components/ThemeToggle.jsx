import { useState } from 'react';

const THEME_STORAGE_KEY = 'bible-mindmap-theme';

function readInitialTheme() {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function persistTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 저장소가 제한된 환경에서도 현재 세션의 테마 전환은 유지한다.
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readInitialTheme);
  const isDark = theme === 'dark';

  const handleToggle = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    persistTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="at-theme-toggle"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? '화이트 모드로 전환' : '다크 모드로 전환'}
      title={isDark ? '화이트 모드로 전환' : '다크 모드로 전환'}
      onClick={handleToggle}
    >
      <span className={`at-theme-toggle__option${!isDark ? ' is-active' : ''}`}>
        <span aria-hidden="true">☀︎</span>
        화이트 모드
      </span>
      <span className={`at-theme-toggle__option${isDark ? ' is-active' : ''}`}>
        <span aria-hidden="true">☾</span>
        다크 모드
      </span>
    </button>
  );
}
