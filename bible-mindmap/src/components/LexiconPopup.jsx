import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchStrongDefinition, fetchStrongConcordance, humanizeMorph, linkifyDefinition, evictStrongDefinitionCache } from '../utils/lexicon';
import { getBook } from '../data/bibleBooks';
import { useCanvas } from '../context/CanvasContext';
import useMobile from '../hooks/useMobile';
import OriginalLanguageResearchActions from './OriginalLanguageResearchActions';
import { KOREAN_GLOSS } from '../data/koreanGloss';
import LexiconDefinitionTree from './LexiconDefinitionTree';
import './LexiconPopup.css';

const POPUP_MIN_WIDTH = 340;
const POPUP_MIN_HEIGHT = 300;
const POPUP_VIEWPORT_MARGIN = 12;
const DEFAULT_DESKTOP_WIDTH = 760;
const DEFAULT_DESKTOP_HEIGHT = 620;
const THREE_COLUMN_MIN_WIDTH = 720;

function clampSize(width, height, vw, vh) {
  const maxW = Math.max(POPUP_MIN_WIDTH, vw - POPUP_VIEWPORT_MARGIN * 2);
  const maxH = Math.max(POPUP_MIN_HEIGHT, vh - POPUP_VIEWPORT_MARGIN * 2);
  return {
    width: Math.min(Math.max(POPUP_MIN_WIDTH, width), maxW),
    height: Math.min(Math.max(POPUP_MIN_HEIGHT, height), maxH),
  };
}

function resizeHandleStyle(side) {
  const thickness = 8;
  const corner = 14;
  const base = { position: 'absolute', zIndex: 50, background: 'transparent', userSelect: 'none' };
  switch (side) {
    case 'top': return { ...base, top: -4, left: 10, right: 10, height: thickness, cursor: 'ns-resize' };
    case 'bottom': return { ...base, bottom: -4, left: 10, right: 10, height: thickness, cursor: 'ns-resize' };
    case 'left': return { ...base, left: -4, top: 10, bottom: 10, width: thickness, cursor: 'ew-resize' };
    case 'right': return { ...base, right: -4, top: 10, bottom: 10, width: thickness, cursor: 'ew-resize' };
    case 'nw': return { ...base, top: -6, left: -6, width: corner, height: corner, cursor: 'nwse-resize' };
    case 'ne': return { ...base, top: -6, right: -6, width: corner, height: corner, cursor: 'nesw-resize' };
    case 'sw': return { ...base, bottom: -6, left: -6, width: corner, height: corner, cursor: 'nesw-resize' };
    case 'se': return { ...base, bottom: -6, right: -6, width: corner, height: corner, cursor: 'nwse-resize' };
    default: return base;
  }
}

function normalizedStrong(strong) {
  return strong ? strong.replace(/^([HG])0+(?=\d)/, '$1') : '';
}

function strongNumber(strong) {
  if (!strong) return '';
  return strong.replace(/^([GH])0*/, '');
}

function externalStrongHref(strong, isHebrew) {
  const num = strongNumber(strong);
  return num ? `https://biblehub.com/${isHebrew ? 'hebrew' : 'greek'}/${num}.htm` : null;
}

function morphologyFields(human) {
  if (!human) return [];
  if (human.includes(' | ')) return [{ label: 'í˜•íƒœ ë¶„ì„', value: human }];
  const parts = human.split(' Â· ').filter(Boolean);
  if (!parts.length) return [];
  const pos = parts[0];
  if (pos === 'ë™ì‚¬' && parts.length >= 4) {
    // Hebrew: ë™ì‚¬ Â· Binyan Â· aspect Â· person Â· gender Â· number
    // Greek:  ë™ì‚¬ Â· tense Â· voice Â· mood Â· person Â· number
    const looksHebrewStem = ['Qal', 'Niphal', 'Piel', 'Pual', 'Hiphil', 'Hophal', 'Hithpael'].includes(parts[1]);
    const labels = looksHebrewStem
      ? ['í’ˆì‚¬', 'ì–´ê°„ (Binyan)', 'ì‹œìƒ', 'ì¸ì¹­', 'ì„±', 'ìˆ˜']
      : ['í’ˆì‚¬', 'ì‹œì œ', 'íƒœ', 'ë²•', 'ì¸ì¹­', 'ìˆ˜'];
    return parts.map((value, index) => ({ label: labels[index] || `í˜•íƒœ ${index}`, value }));
  }
  if (pos === 'ëª…ì‚¬' && parts.length >= 3) {
    const stateLike = parts[parts.length - 1] === 'ë…ë¦½í˜•' || parts[parts.length - 1] === 'ì—°ê³„í˜•';
    const labels = stateLike ? ['í’ˆì‚¬', 'ì„±', 'ìˆ˜', 'ìƒíƒœ'] : ['í’ˆì‚¬', 'ê²©', 'ìˆ˜', 'ì„±'];
    return parts.map((value, index) => ({ label: labels[index] || `í˜•íƒœ ${index}`, value }));
  }
  return [{ label: 'm¢ºaç:í¡;!'IË˜[YNˆ[X[ˆWNÂŸB‚™[˜Ý[ÛˆÛÝ\˜ÙSX™[
\ÒXœ™]ÊHÂˆ™]\›ˆ\ÒXœ™]ÈÈ	Ð‘‰Èˆ‘Ü™YZÈÝ›Û™ÉÜÈŽÂŸB‚™^ÜY˜][[˜Ý[Ûˆ^XÛÛ”Ü\
È[žK[˜ÚÜ‹›ÛÚÒY\ÜØYÙKÛÛÜÙK’[™^JHÂˆÛÛœÝÈÛY™\œÙHHH\ÙPØ[˜\Ê
HßNÂˆÛÛœÝ\Ó[Øš[HH\ÙS[Øš[J
NÂˆÛÛœÝÝX‹Ù]X—HH\ÙTÝ]J	ÙY‰ÊNÂˆÛÛœÝÙY”™[ØY›Û˜ÙKÙ]Y”™[ØY›Û˜ÙWHH\ÙTÝ]J
NÂˆÛÛœÝÙYš[š][Û‹Ù]Yš[š][Û—HH\ÙTÝ]J[
NÂˆÛÛœÝÙY“ØY[™ËÙ]Y“ØY[™×HH\ÙTÝ]J˜[ÙJNÂˆÛÛœÝÙY‘\œ›Ü‹Ù]Y‘\œ›Ü—HH\ÙTÝ]J[
NÂˆÛÛœÝÜ™\ÙX\˜ÚXÝ]™KÙ]™\ÙX\˜ÚXÝ]™WHH\ÙTÝ]J˜[ÙJNÂˆÛÛœÝÝ\ØYÙ\ËÙ]\ØYÙ\×HH\ÙTÝ]J[
NÂˆÛÛœÝÝ\ØYÙSØY[™ËÙ]\ØYÙSØY[™×HH\ÙTÝ]J˜[ÙJNÂˆÛÛœÝÝ\ØYÙQ\œ›Ü‹Ù]\ØYÙQ\œ›Ü—HH\ÙTÝ]J	ÉÊNÂ‚ˆ\ÙQY™™XÝ


HOˆÂˆYˆ
Y[žOËœÊH™]\›ŽÂˆ]Ø[˜Ù[YH˜[ÙNÂˆÙ]Y“ØY[™ÊYJNÂˆÙ]Y‘\œ›ÜŠ[
NÂˆÙ]Yš[š][ÛŠ[
NÂˆ™]ÚÝ›Û™ÑYš[š][ÛŠ[žKœÊBˆ[Š
˜[YJHOˆÈYˆ
XØ[˜Ù[Y
HÙ]Yš[š][ÛŠ˜[YJNÈJBˆ˜Ø]Ú

\œ›ÜŠHOˆÈYˆ
XØ[˜Ù[Y
HÙ]Y‘\œ›ÜŠ\œ›Ü‹›Y\ÜØYÙH	û(l;f£;"é;c*	ÊNÈJBˆ™š[˜[J

HOˆÈYˆ
XØ[˜Ù[Y
HÙ]Y“ØY[™Ê˜[ÙJNÈJNÂˆ™]\›ˆ

HOˆÈØ[˜Ù[YHYNÈNÂˆKÙ[žOËœËY”™[ØY›Û˜ÙWJNÂ‚ˆ\ÙQY™™XÝ


HOˆÂˆYˆ
XˆOOH	Ý\ØYÙIÈ\ØYÙ\ÈOOH[
H™]\›ŽÂˆYˆ
Y[žOËœÈX›ÛÚÒY
HÈÙ]\ØYÙ\Ê×JNÈ™]\›ŽÈBˆ]Ø[˜Ù[YH˜[ÙNÂˆÙ]\ØYÙSØY[™ÊYJNÂˆÙ]\ØYÙQ\œ›ÜŠ	ÉÊNÂˆ™]ÚÝ›Û™ÐÛÛ˜ÛÜ™[˜ÙJ[žKœË›ÛÚÒY
Bˆ[Š
\Ý
HOˆÈYˆ
XØ[˜Ù[Y
HÙ]\ØYÙ\Ê\Ý
NÈJBˆ˜Ø]Ú

\œ›ÜŠHOˆÂˆYˆ
XØ[˜Ù[Y
HÂˆÙ]\ØYÙ\Ê×JNÂˆÙ]\ØYÙQ\œ›ÜŠ\œ›Ü‹›Y\ÜØYÙH	ú­ :è*:­k;(":èg:äç;"é;c*	ÊNÂˆBˆJBˆ™š[˜[J

HOˆÈYˆ
XØ[˜Ù[Y
HÙ]\ØYÙSØY[™Ê˜[ÙJNÈJNÂˆ™]\›ˆ

HOˆÈØ[˜Ù[YHYNÈNÂˆKÝX‹[žOËœË›ÛÚÒY\ØYÙ\×JNÂ‚ˆ\ÙQY™™XÝ


HOˆÂˆÙ]XŠ	ÙY‰ÊNÂˆÙ]\ØYÙ\Ê[
NÂˆÙ]\ØYÙQ\œ›ÜŠ	ÉÊNÂˆÙ]™\ÙX\˜ÚXÝ]™J˜[ÙJNÂˆKÙ[žOËœ×JNÂ‚ˆ\ÙQY™™XÝ


HOˆÂˆÛÛœÝÛ’Ù^HH
]™[
HOˆÂˆYˆ
]™[šÙ^HOOH	Ñ\ØØ\IÈ	‰ˆ\™\ÙX\˜ÚXÝ]™JHÛÛÜÙJ
NÂˆNÂˆÚ[™ÝË˜Y]™[\Ý[™\Š	ÚÙ^YÝÛ‰ËÛ’Ù^JNÂˆ™]\›ˆ

HOˆÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\Š	ÚÙ^YÝÛ‰ËÛ’Ù^JNÂˆKÛÛÛÜÙK™\ÙX\˜ÚXÝ]™WJNÂ‚ˆÛÛœÝÈH\[ÙˆÚ[™ÝÈOOH	Ý[™Yš[™Y	ÈÈÚ[™ÝËš[›™\•ÚYˆLŒÂˆÛÛœÝšH\[ÙˆÚ[™ÝÈOOH	Ý[™Yš[™Y	ÈÈÚ[™ÝËš[›™\’ZYÚˆÂˆÛÛœÝÜÜ\Ú^™KÙ]Ü\Ú^™WHH\ÙTÝ]J

HOˆÛ[\Ú^™JQUSÑTÒÕÔÕÒQQUSÑTÒÕÔÒRQÒËš
JNÂˆÛÛœÝÙ˜YÓÙ™œÙ]Ù]˜YÓÙ™œÙ]HH\ÙTÝ]JÈˆNˆJNÂˆÛÛœÝ˜YÔÝ]HH\ÙT™YŠ[
NÂ‚ˆ\ÙQY™™XÝ


HOˆÂˆÙ]˜YÓÙ™œÙ]
ÈˆNˆJNÂˆÙ]Ü\Ú^™JÛ[\Ú^™JQUSÑTÒÕÔÕÒQQUSÑTÒÕÔÒRQÒËš
JNÂˆKÙ[žOËœ×JNÂ‚ˆ\ÙQY™™XÝ


HOˆÂˆÛÛœÝÛ•Ú[™ÝÔ™\Ú^™HH

HOˆÂˆÙ]Ü\Ú^™J
™]š[Ý\ÊHOˆÛ[\Ú^™J™]š[Ý\ËÚY™]š[Ý\ËšZYÚÚ[™ÝËš[›™\•ÚYÚ[™ÝËš[›™\’ZYÚ
JNÂˆNÂˆÚ[™ÝË˜Y]™[\Ý[™\Š	Ü™\Ú^™IËÛ•Ú[™ÝÔ™\Ú^™JNÂˆ™]\›ˆ

HOˆÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\Š	Ü™\Ú^™IËÛ•Ú[™ÝÔ™\Ú^™JNÂˆK×JNÂ‚ˆÛÛœÝÛ‘˜YÔÝ\H
]™[
HOˆÂˆYˆ
\Ó[Øš[H™\ÙX\˜ÚXÝ]™H]™[˜]ÛˆOOH
H™]\›ŽÂˆ]™[œ™]™[Y˜][

NÂˆ˜YÔÝ]K˜Ý\œ™[HÂˆÝ\[Ý\ÙVˆ]™[˜ÛY[ˆÝ\[Ý\ÙVNˆ]™[˜ÛY[KˆÝ\ˆ˜YÓÙ™œÙ]žˆÝ\Nˆ˜YÓÙ™œÙ]žKˆNÂˆÛÛœÝÛ“[Ý™HH
[Ý™Q]™[
HOˆÂˆYˆ
Y˜YÔÝ]K˜Ý\œ™[
H™]\›ŽÂˆÙ]˜YÓÙ™œÙ]
Âˆˆ˜YÔÝ]K˜Ý\œ™[œÝ\
È[Ý™Q]™[˜ÛY[H˜YÔÝ]K˜Ý\œ™[œÝ\[Ý\ÙVˆNˆ˜YÔÝ]K˜Ý\œ™[œÝ\H
È[Ý™Q]™[˜ÛY[HH˜YÔÝ]K˜Ý\œ™[œÝ\[Ý\ÙVKˆJNÂˆNÂˆÛÛœÝÛ‘\H

HOˆÂˆ˜YÔÝ]K˜Ý\œ™[H[ÂˆÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\Š	Û[Ý\Ù[[Ý™IËÛ“[Ý™JNÂˆÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\Š	Û[Ý\Ù]\	ËÛ•\
NÂˆNÂˆÚ[™ÝË˜Y]™[\Ý[™\Š	Û[Ý\Ù[[Ý™IËÛ“[Ý™JNÂˆÚ[™ÝË˜Y]™[\Ý[™\Š	Û[Ý\Ù]\	ËÛ‘\
NÂˆNÂ‚ˆÛÛœÝÛ”™\Ú^™TÝ\H
YÙ\ÊHOˆ
]™[
HOˆÂˆYˆ
\Ó[Øš[H™\ÙX\˜ÚXÝ]™H]™[˜]ÛˆOOH
H™]\›ŽÂˆ]™[œ™]™[Y˜][

NÂˆ]™[œÝÜ›ÜYØ][ÛŠ
NÂˆÛÛœÝÝ\HÂˆ[Ý\ÙVˆ]™[˜ÛY[ˆ[Ý\ÙVNˆ]™[˜ÛY[KˆÚYˆÜ\Ú^™KÚYˆZYÚˆÜ\Ú^™KšZYÚˆÙ™œÙ]ˆ˜YÓÙ™œÙ]žˆÙ™œÙ]Nˆ˜YÓÙ™œÙ]žKˆNÂˆÛÛœÝÛ“[Ý™HH
[Ý™Q]™[
HOˆÂˆÛÛœÝH[Ý™Q]™[˜ÛY[HÝ\›[Ý\ÙVÂˆÛÛœÝHH[Ý™Q]™[˜ÛY[HHÝ\›[Ý\ÙVNÂˆ]ÚYHÝ\ÚYÂˆ]ZYÚHÝ\šZYÚÂˆ]Ù™œÙ]HÝ\›Ù™œÙ]Âˆ]Ù™œÙ]HHÝ\›Ù™œÙ]NÂˆYˆ
YÙ\ËœšYÚ
HÚYHÝ\ÚY
ÈÂˆYˆ
YÙ\Ë˜›ÝÛJHZYÚHÝ\šZYÚ
ÈNÂˆYˆ
YÙ\Ë›Y
HÈÚYHÝ\ÚYHÈÙ™œÙ]HÝ\›Ù™œÙ]
ÈÈBˆYˆ
YÙ\ËÜ
HÈZYÚHÝ\šZYÚHNÈÙ™œÙ]HHÝ\›Ù™œÙ]H
ÈNÈBˆÛÛœÝÛ[\YHÛ[\Ú^™JÚYZYÚÚ[™ÝËš[›™\•ÚYÚ[™ÝËš[›™\’ZYÚ
NÂˆYˆ
YÙ\Ë›Y	‰ˆÛ[\YÚYOOHÚY
HÙ™œÙ]HÝ\›Ù™œÙ]
È
Ý\ÚYHÛ[\YÚY
NÂˆYˆ
YÙ\ËÜ	‰ˆÛ[\YšZYÚOOHZYÚ
HÙ™œÙ]HHÝ\›Ù™œÙ]H
È
Ý\šZYÚHÛ[\YšZYÚ
NÂˆÙ]Ü\Ú^™JÛ[\Y
NÂˆÙ]˜YÓÙ™œÙ]
ÈˆÙ™œÙ]NˆÙ™œÙ]HJNÂˆNÂˆÛÛœÝÛ•\H

HOˆÂˆÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\Š	Û[Ý\Ù[[Ý™IËÛ“[Ý™JNÂˆÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\Š	Û[Ý\Ù]\	ËÛ•\
NÂˆNÂˆÚ[™ÝË˜Y]™[\Ý[™\Š	Û[Ý\Ù[[Ý™IËÛ“[Ý™JNÂˆÚ[™ÝË˜Y]™[\Ý[™\Š	Û[Ý\Ù]\	ËÛ•\
NÂˆNÂ‚ˆYˆ
Y[žJH™]\›ˆ[Â‚ˆÛÛœÝ\ÒXœ™]ÈH[žKœÏËœÝ\ÕÚ]
	Ò	ÊNÂˆÛÛœÝ[Üœ[X[ˆH[X[š^™S[Üœ
[žK›JNÂˆÛÛœÝ[ÜœšY[ÈH[ÜœÛÙÞQšY[Ê[Üœ[X[ŠNÂˆÛÛœÝÛÜÜÒÙ^HH›Ü›X[^™YÝ›Û™Ê[žKœÊNÂˆÛÛœÝÛÜ™X[‘ÛÜÜÈH
ÛÜÜÒÙ^H	‰ˆÓÔ‘PS—ÑÓÔÔÖÙÛÜÜÒÙ^WJH
[žKœÈ	‰ˆÓÔ‘PS—ÑÓÔÔÖÙ[žKœ×JH[ÂˆÛÛœÝÛÜ™X[•˜[œÛ]H[žK˜[œÛ]ÛÈÛÜ™X[‘ÛÜÜÏË˜[œÛ]ÛÈ[ÂˆÛÛœÝ[[XHH[žK›[žKÈ	ÉÎÂˆÛÛœÝ\Ù”ÜYXÚHYš[š][ÛË›Y]OËœ\Ù”ÜYXÚ[ÜœšY[Ë™š[™

šY[
HOˆšY[›X™[OOH	ûd¢; «	ÊOË˜[YH	ø %	ÎÂˆÛÛœÝÛÝ\˜ÙHHÛÝ\˜ÙSX™[
\ÒXœ™]ÊNÂˆÛÛœÝÝ›Û™Ò™YˆH^\›˜[Ý›Û™Ò™YŠ[žKœË\ÒXœ™]ÊNÂ‚ˆÛÛœÝÚYH\Ó[Øš[HÈÈˆÜ\Ú^™KÚYÂˆÛÛœÝZYÚH\Ó[Øš[HÈX]œ›Ý[™
š
ˆŽ
HˆÜ\Ú^™KšZYÚÂˆÛÛœÝX\™Ú[ˆHÔTÕ’QUÔÔ•ÓPT‘ÒSŽÂˆÛÛœÝ˜\ÙSYH\Ó[Øš[HÈˆX]›X^
X\™Ú[‹X]›Z[Š
[˜ÚÜËžÏÈŸÎõÙÈZ®Ëkºwµç