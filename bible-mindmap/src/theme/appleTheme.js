// ════════════════════════════════════════════════════════════════════
//  Apple 디자인 파운데이션 (2025 · Liquid Glass / iOS 26 · macOS Tahoe 감성)
//  성경 마인드맵 전체 UI 통일용 단일 토큰 소스.
//
//  베이스 컬러 밸런스는 '사용자 매뉴얼' 팝업(네이비 헤더 + 블루 액센트 +
//  클린 화이트/라이트그레이)을 계승하고, 그 위에 Apple 시스템 컬러·
//  머티리얼(반투명)·라운드·타이포·소프트 섀도우를 얹는다.
//
//  ★ 다크 모드: 테마 컬러는 모두 CSS 변수 var(--at-*) 를 가리킨다.
//     인라인 style 에 넣어도 시스템 라이트/다크 전환 시 자동 반영된다.
//     실제 값 정의는 src/index.css 의 :root / prefers-color-scheme:dark.
//     원시 hex 가 필요하면 AT.raw.* 사용.
// ════════════════════════════════════════════════════════════════════

export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', " +
  "'Pretendard', 'Noto Sans KR', system-ui, 'Segoe UI', Roboto, sans-serif";

export const FONT_MONO =
  "'SF Mono', ui-monospace, 'JetBrains Mono', 'Menlo', monospace";

const v = (name) => `var(--at-${name})`;

// ── 테마 컬러 (CSS 변수 참조 · 라이트/다크 자동) ────────────────
const color = {
  bg:            v('bg'),
  bgElevated:    v('surface'),
  surface:       v('surface'),
  surface2:      v('surface-2'),
  surface3:      v('surface-3'),

  label:         v('label'),
  label2:        v('label-2'),
  label3:        v('label-3'),
  label4:        v('label-4'),

  separator:     v('separator'),
  separatorHard: v('separator-hard'),
  fill:          v('fill'),
  fill2:         v('fill-2'),

  accent:        v('accent'),
  accentDeep:    v('accent-deep'),
  accentSoft:    v('accent-soft'),
  accentText:    v('accent-text'),

  navyTop:       v('navy-top'),
  navyBottom:    v('navy-bottom'),
  onNavy:        v('on-navy'),

  red:    v('red'),
  orange: v('orange'),
  green:  v('green'),
  yellow: v('yellow'),
  teal:   v('teal'),
  purple: v('purple'),
  white:  '#ffffff',
};

// 원시 hex (라이트 기준 · 그라디언트 계산 등 var 불가한 곳)
const raw = {
  accent: '#0a84ff', accentDeep: '#0060df', accentSoft: '#eaf3ff',
  navyTop: '#1e3a8a', navyBottom: '#0f172a',
  label: '#1c1c1e', surface: '#ffffff', bg: '#f2f2f7',
  separator: 'rgba(60,60,67,0.16)',
  red: '#ff3b30', orange: '#ff9f0a', green: '#34c759', yellow: '#ffcc00',
  teal: '#30b0c7', purple: '#af52de',
};

// ── 머티리얼 (반투명 · Liquid Glass · 라이트/다크 자동) ─────────
const material = {
  glass:      v('glass'),
  glassThin:  v('glass-thin'),
  glassThick: v('glass-thick'),
  dark:       'rgba(28,28,30,0.72)',
  blur:       'saturate(180%) blur(20px)',
  blurThin:   'saturate(160%) blur(12px)',
  scrim:      v('scrim'),
};

const radius = { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, xxl: 26, pill: 999 };

const shadow = {
  xs:    v('shadow-xs'),
  sm:    v('shadow-sm'),
  md:    v('shadow-md'),
  lg:    v('shadow-lg'),
  xl:    v('shadow-xl'),
  focus: '0 0 0 3.5px rgba(10,132,255,0.30)',
};

const motion = {
  fast:   '.16s cubic-bezier(0.32, 0.72, 0, 1)',
  base:   '.28s cubic-bezier(0.32, 0.72, 0, 1)',
  spring: '.42s cubic-bezier(0.34, 1.4, 0.42, 1)',
  ease:   'cubic-bezier(0.32, 0.72, 0, 1)',
};

const control = {
  height: 34, heightSm: 28, heightLg: 44,
  padX: 14, radius: radius.md, radiusPill: radius.pill,
  fontSize: 13.5, fontWeight: 600,
};

export const AT = { color, raw, material, radius, shadow, motion, control, FONT_STACK, FONT_MONO };

// ── 인라인 스타일 헬퍼 (통일 컨트롤) ───────────────────────────
export const controls = {
  button: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: control.height, padding: `0 ${control.padX}px`,
    borderRadius: control.radiusPill, border: 'none', cursor: 'pointer',
    fontFamily: FONT_STACK, fontSize: control.fontSize, fontWeight: control.fontWeight,
    color: color.label, background: color.fill,
    transition: `background ${motion.fast}, transform ${motion.fast}, box-shadow ${motion.fast}`,
    WebkitTapHighlightColor: 'transparent', userSelect: 'none',
  },
  buttonPrimary: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: control.height, padding: `0 ${control.padX + 2}px`,
    borderRadius: control.radiusPill, border: 'none', cursor: 'pointer',
    fontFamily: FONT_STACK, fontSize: control.fontSize, fontWeight: 700,
    color: '#fff', background: color.accent, boxShadow: '0 1px 2px rgba(10,132,255,.35)',
    transition: `background ${motion.fast}, transform ${motion.fast}, box-shadow ${motion.fast}`,
    WebkitTapHighlightColor: 'transparent', userSelect: 'none',
  },
  buttonGhost: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: control.height, padding: `0 ${control.padX}px`,
    borderRadius: control.radiusPill, border: 'none', cursor: 'pointer',
    fontFamily: FONT_STACK, fontSize: control.fontSize, fontWeight: 600,
    color: color.accentText, background: 'transparent',
    transition: `background ${motion.fast}`,
    WebkitTapHighlightColor: 'transparent', userSelect: 'none',
  },
  card: {
    background: color.surface, borderRadius: radius.lg,
    border: `0.5px solid ${color.separator}`, boxShadow: shadow.sm,
  },
  glass: {
    background: material.glass,
    WebkitBackdropFilter: material.blur, backdropFilter: material.blur,
    borderBottom: `0.5px solid ${color.separator}`,
  },
};
