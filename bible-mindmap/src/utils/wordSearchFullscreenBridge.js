const DIALOG_SELECTOR = '[role="dialog"][aria-label="원어 성경 다언어 검색"]';
const BUTTON_ATTR = 'data-word-search-fullscreen-toggle';

function findTitlebar(dialog) {
  return dialog.querySelector('.at-modal__titlebar') || dialog.firstElementChild;
}

function findCloseButton(titlebar) {
  return [...titlebar.querySelectorAll('button')].find((button) => button.textContent?.trim() === '✕') || null;
}

function findResizeHandle(dialog) {
  return [...dialog.querySelectorAll('div')].find((node) => window.getComputedStyle(node).cursor === 'se-resize') || null;
}

function styleButton(button, fullscreen, mobile) {
  Object.assign(button.style, {
    display: mobile ? 'none' : 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    width: 'auto',
    minWidth: '64px',
    height: '26px',
    padding: '0 9px',
    border: 'none',
    borderRadius: '6px',
    background: fullscreen ? 'rgba(59,130,246,0.55)' : 'rgba(255,255,255,0.15)',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '700',
    fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });
  button.textContent = fullscreen ? '화면 복원' : '전체 화면';
  button.title = fullscreen ? '기존 창 크기로 돌아가기' : '팝업을 전체 화면으로 보기';
  button.setAttribute('aria-label', button.title);
  button.setAttribute('aria-pressed', fullscreen ? 'true' : 'false');
}

export function installWordSearchFullscreenBridge() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const states = new Map();
  let scheduled = false;

  const setFullscreenStyles = (state) => {
    const { dialog, titlebar, content, resizeHandle } = state;
    dialog.style.setProperty('left', '0px', 'important');
    dialog.style.setProperty('top', '0px', 'important');
    dialog.style.setProperty('width', '100vw', 'important');
    dialog.style.setProperty('height', '100dvh', 'important');
    dialog.style.setProperty('max-width', 'none', 'important');
    dialog.style.setProperty('max-height', 'none', 'important');
    dialog.style.setProperty('border-radius', '0px', 'important');
    dialog.style.setProperty('border', 'none', 'important');
    dialog.style.setProperty('box-shadow', 'none', 'important');

    if (titlebar) {
      titlebar.style.setProperty('border-radius', '0px', 'important');
      titlebar.style.setProperty('cursor', 'default', 'important');
    }
    if (content) {
      content.style.setProperty('flex', '1 1 auto', 'important');
      content.style.setProperty('height', 'auto', 'important');
      content.style.setProperty('min-height', '0px', 'important');
      content.style.setProperty('border-radius', '0px', 'important');
    }
    if (resizeHandle) resizeHandle.style.setProperty('display', 'none', 'important');
  };

  const restoreStyles = (state) => {
    state.dialog.setAttribute('style', state.snapshot.dialog);
    if (state.titlebar) state.titlebar.setAttribute('style', state.snapshot.titlebar);
    if (state.content) state.content.setAttribute('style', state.snapshot.content);
    if (state.resizeHandle) state.resizeHandle.setAttribute('style', state.snapshot.resizeHandle);
  };

  const render = (state) => {
    const mobile = window.innerWidth < 768;
    if (state.fullscreen && mobile) {
      state.fullscreen = false;
      restoreStyles(state);
    }
    if (state.fullscreen) setFullscreenStyles(state);
    styleButton(state.button, state.fullscreen, mobile);
  };

  const destroy = (dialog) => {
    const state = states.get(dialog);
    if (!state) return;
    if (state.fullscreen) restoreStyles(state);
    state.titlebar?.removeEventListener('mousedown', state.blockDrag, true);
    state.button.remove();
    states.delete(dialog);
  };

  const ensure = (dialog) => {
    const titlebar = findTitlebar(dialog);
    const closeButton = titlebar && findCloseButton(titlebar);
    if (!titlebar || !closeButton || !dialog.isConnected) {
      destroy(dialog);
      return;
    }

    let state = states.get(dialog);
    if (!state) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute(BUTTON_ATTR, 'true');

      state = {
        dialog,
        titlebar,
        content: titlebar.nextElementSibling,
        resizeHandle: findResizeHandle(dialog),
        button,
        fullscreen: false,
        snapshot: null,
        blockDrag: null,
      };

      state.blockDrag = (event) => {
        if (!state.fullscreen || event.target.closest('button, input, a, select, textarea')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      titlebar.addEventListener('mousedown', state.blockDrag, true);

      button.addEventListener('mousedown', (event) => event.stopPropagation());
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!state.fullscreen) {
          state.content = state.titlebar.nextElementSibling;
          state.resizeHandle = findResizeHandle(state.dialog);
          state.snapshot = {
            dialog: state.dialog.getAttribute('style') || '',
            titlebar: state.titlebar.getAttribute('style') || '',
            content: state.content?.getAttribute('style') || '',
            resizeHandle: state.resizeHandle?.getAttribute('style') || '',
          };
          state.fullscreen = true;
        } else {
          state.fullscreen = false;
          restoreStyles(state);
        }
        render(state);
      });

      states.set(dialog, state);
    }

    if (state.titlebar !== titlebar) {
      state.titlebar?.removeEventListener('mousedown', state.blockDrag, true);
      state.titlebar = titlebar;
      state.titlebar.addEventListener('mousedown', state.blockDrag, true);
    }
    if (!titlebar.contains(state.button) || state.button.nextElementSibling !== closeButton) {
      titlebar.insertBefore(state.button, closeButton);
    }
    if (state.fullscreen) setFullscreenStyles(state);
    render(state);
  };

  const sync = () => {
    scheduled = false;
    const dialogs = [...document.querySelectorAll(DIALOG_SELECTOR)];
    for (const dialog of dialogs) ensure(dialog);
    for (const dialog of [...states.keys()]) {
      if (!dialogs.includes(dialog) || !dialog.isConnected) destroy(dialog);
    }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'aria-label'] });

  const onResize = () => {
    for (const state of states.values()) render(state);
    schedule();
  };
  const onEscape = (event) => {
    if (event.key !== 'Escape') return;
    const state = [...states.values()].find((item) => item.fullscreen);
    if (!state) return;
    state.fullscreen = false;
    restoreStyles(state);
    render(state);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onEscape, true);
  schedule();

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onEscape, true);
    for (const dialog of [...states.keys()]) destroy(dialog);
  };
}
