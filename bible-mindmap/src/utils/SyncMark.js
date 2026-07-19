import { Mark, mergeAttributes } from '@tiptap/core';

/**
 * SyncMark — 세 역본(개역한글/ESV/원어)의 대응 단어를 같은 syncId로 묶어
 * 한 곳에서 스타일을 바꾸면 나머지 두 역본에도 자동 반영되도록 하는 TipTap Mark.
 *
 * HTML: <span data-sync-id="sync-abc" style="font-weight:bold; color:#ef4444;">단어</span>
 *
 * - syncId: 세 역본을 잇는 그룹 ID
 * - styleStr: 그대로 렌더링할 style 속성 문자열 (bold/color 등)
 */
export const SyncMark = Mark.create({
  name: 'syncMark',

  addAttributes() {
    return {
      syncId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-sync-id'),
        renderHTML: (attrs) =>
          attrs.syncId ? { 'data-sync-id': attrs.syncId } : {},
      },
      styleStr: {
        default: '',
        parseHTML: (el) => el.getAttribute('style') || '',
        renderHTML: (attrs) => (attrs.styleStr ? { style: attrs.styleStr } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-sync-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSyncMark:
        (attrs) => ({ commands }) =>
          commands.setMark(this.name, attrs),
      updateSyncMark:
        (attrs) => ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
      unsetSyncMark:
        () => ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

/**
 * HTML 문자열에서 특정 syncId를 가진 모든 span의 style을 업데이트.
 * (다른 역본을 재렌더링하지 않고 저장된 HTML만 갱신할 때 사용)
 */
export function updateSyncSpanStyle(html, syncId, patch) {
  if (!html || !syncId) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const spans = doc.querySelectorAll(`span[data-sync-id="${cssEscape(syncId)}"]`);
  spans.forEach((span) => {
    if ('bold' in patch) {
      span.style.fontWeight = patch.bold ? 'bold' : '';
    }
    if ('color' in patch) {
      span.style.color = patch.color || '';
    }
    // 빈 style 정리
    if (!span.getAttribute('style')?.trim()) span.removeAttribute('style');
  });
  return doc.body.innerHTML;
}

function cssEscape(s) {
  // CSS 선택자 안전화 — 실제 syncId는 항상 우리가 생성하므로 간단히 처리
  return String(s).replace(/["\\]/g, '\\$&');
}
