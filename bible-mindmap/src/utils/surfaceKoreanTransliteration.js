import { normalizeHebrewSurfaceForm } from './hebrewLexicalForm.js';

const GREEK_SURFACE_KO = Object.freeze({
  'ἦν': '엔',
  'τὴν': '텐',
});

const HEBREW_SURFACE_KO = Object.freeze({
  'וְהָאָרֶץ': '베하아레츠',
  'הָיְתָה': '하예타',
  'תֹהוּ': '토후',
  'וָבֹהוּ': '바보후',
  'וְחֹשֶׁךְ': '베호셰크',
  'עַל': '알',
  'פְּנֵי': '프네',
  'תְהוֹם': '테홈',
  'וְרוּחַ': '베루아흐',
  'אֱלֹהִים': '엘로힘',
  'מְרַחֶפֶת': '메라헤페트',
  'הַמָּיִם': '하마임',
});

function normalizeGreekSurface(value) {
  return String(value || '').normalize('NFC').replace(/[\s.,;··]+$/u, '');
}

export function resolveSurfaceKoreanTransliteration(surface, isHebrew = false) {
  const key = isHebrew
    ? normalizeHebrewSurfaceForm(surface)
    : normalizeGreekSurface(surface);
  return (isHebrew ? HEBREW_SURFACE_KO : GREEK_SURFACE_KO)[key] || null;
}
