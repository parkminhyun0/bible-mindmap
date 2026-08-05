import { BOOK_CONTEXTS } from '../data/contextRegistry.js';

const PANEL_ID = 'mark-research-layer-test';
const STYLE_CLASS = 'mark-research-layout-test';
const MARK_CONTEXT = BOOK_CONTEXTS.Mark;

function activeChapter(modal) {
  const active = [...modal.querySelectorAll('button')].find((button) =>
    button.getAttribute('style')?.includes('linear-gradient(135deg, #d97706')
      && /^\d+$/.test(button.textContent.trim()),
  );
  return Number(active?.textContent || 1) || 1;
}

function isMarkActive(modal) {
  const activeBook = modal.querySelector('[data-context-book-index] [data-book-active="true"]');
  return activeBook?.textContent?.trim() === '막';
}

function badge(text, tone = 'blue') {
  return `<span class="mark-research-badge mark-research-badge--${tone}">${text}</span>`;
}

function sourceDialog(chapter, chapterData) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mark-research-source-dialog';
  dialog.innerHTML = `
    <form method="dialog">
      <header><strong>근거·출처 · 마가복음 ${chapter}장</strong><button value="close" aria-label="닫기">×</button></header>
      <section>
        <h4>현재 연결된 원본</h4>
        <p><b>프로젝트 큐레이션:</b> <code>CURATED_GOSPELS_ACTS.Mark.${chapter}</code></p>
        <p><b>Context V2:</b> 장별 의제, 구조 앵커, 핵심 본문을 저장소 데이터에서 직접 읽습니다.</p>
        <p><b>본문 근거:</b> ${chapterData?.keyVerses?.map((item) => `막 ${chapter}:${item.verse} · ${item.label}`).join('<br>') || '핵심 본문 미등록'}</p>
      </section>
      <section>
        <h4>검증 상태</h4>
        <p>현재 단계는 <b>프로젝트 자체 큐레이션 기반 테스트</b>입니다. 외부 학술 자료와 개혁주의 주석의 판본·쪽수·단락 경계 비교는 아직 연결하지 않았습니다.</p>
        <p>따라서 이 구조는 확정 학계 합의가 아니라 <b>사람 검토가 필요한 내부 연구 구조</b>로 표시합니다.</p>
      </section>
      <section>
        <h4>운영 통합 전 필수</h4>
        <p>공개 라이선스가 확인된 본문·형태론 자료, 직접 작성한 구조 데이터, 허가된 주석의 서지정보를 분리 저장하고 견해 차이가 있으면 주요안과 대안을 함께 표시해야 합니다.</p>
      </section>
    </form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
}

function renderPanel(panel, chapter, modal) {
  const chapterData = MARK_CONTEXT?.contextV2?.chapters?.[chapter];
  const agenda = chapterData?.agenda || MARK_CONTEXT?.meta?.chapterAgenda?.[chapter] || '장별 연구 의제가 아직 등록되지 않았습니다.';
  const anchors = chapterData?.structureNodes || [];
  const keys = chapterData?.keyVerses || [];
  const quality = chapterData?.quality === 'curated' ? '사람 큐레이션' : '구조 후보';

  panel.innerHTML = `
    <header class="mark-research-header">
      <div><strong>본문 구조</strong><span>Pericope Intelligence · 마가복음 ${chapter}장</span></div>
      <div class="mark-research-actions">
        <button type="button" class="mark-research-source">근거·출처</button>
        <button type="button" class="mark-research-close" aria-label="본문 구조 닫기">×</button>
      </div>
    </header>
    <div class="mark-research-notice">실제 앱 통합 테스트 · 마가복음에만 활성화 · 외부 학술 출처는 아직 미연결</div>
    <div class="mark-research-scroll">
      <article class="mark-research-card">
        <div class="mark-research-badges">${badge('프로젝트 분석', 'blue')}${badge(quality, 'green')}${badge('AI 자동확정 아님', 'gray')}</div>
        <h3>장별 연구 의제</h3>
        <p>${agenda}</p>
        <dl><dt>근거</dt><dd>마가복음 ${chapter}장의 저장소 큐레이션 의제와 핵심 본문 앵커</dd><dt>확실성</dt><dd>${chapterData?.quality === 'curated' ? '내부 큐레이션 완료 · 외부 비교 대기' : '후보 · 사람 검토 필요'}</dd></dl>
      </article>
      <article class="mark-research-card">
        <div class="mark-research-badges">${badge('본문 앵커', 'purple')}${badge('Context V2', 'blue')}</div>
        <h3>구조 앵커</h3>
        ${anchors.length ? anchors.map((node) => `<button type="button" class="mark-research-anchor" data-verse="${node.verse}"><b>막 ${chapter}:${node.verse}</b><span>${node.label}</span></button>`).join('') : '<p class="mark-research-empty">등록된 구조 앵커가 없습니다.</p>'}
      </article>
      <article class="mark-research-card">
        <div class="mark-research-badges">${badge('핵심 본문', 'amber')}${badge('직접 확인', 'green')}</div>
        <h3>핵심 본문</h3>
        ${keys.length ? keys.map((item) => `<div class="mark-research-key"><b>막 ${chapter}:${item.verse}</b><span>${item.label}</span></div>`).join('') : '<p class="mark-research-empty">등록된 핵심 본문이 없습니다.</p>'}
      </article>
      <article class="mark-research-card mark-research-card--warning">
        <div class="mark-research-badges">${badge('외부 자료 비교 대기', 'red')}${badge('공개 전 검증 필수', 'gray')}</div>
        <h3>학술 출처와 대안 구조</h3>
        <p>현재는 저장소 내부 큐레이션만 연결했습니다. 학자별 단락 구분·담화 분석·개혁주의 석의 차이는 판본과 페이지를 확인한 뒤 주요안·대안·채택 이유로 추가해야 합니다.</p>
      </article>
    </div>`;

  panel.querySelector('.mark-research-source')?.addEventListener('click', () => sourceDialog(chapter, chapterData));
  panel.querySelector('.mark-research-close')?.addEventListener('click', () => {
    modal.dataset.markResearchDismissed = 'true';
    detach(modal);
  });
  panel.querySelectorAll('.mark-research-anchor').forEach((button) => {
    button.addEventListener('click', () => {
      const verse = button.dataset.verse;
      const target = panel.parentElement?.querySelector(`[data-ch="${chapter}"][data-verse="${verse}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.click();
    });
  });
}

function installResize(layout, left, panel, right) {
  if (layout.querySelector('.mark-research-divider')) return;
  left.classList.add('mark-research-left');
  right?.classList.add('mark-research-right');
  const makeDivider = (side) => {
    const divider = document.createElement('div');
    divider.className = 'mark-research-divider';
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-orientation', 'vertical');
    divider.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      divider.setPointerCapture(event.pointerId);
      const rect = layout.getBoundingClientRect();
      const move = (e) => {
        const x = Math.max(320, Math.min(rect.width - 320, e.clientX - rect.left));
        if (side === 'left') layout.style.setProperty('--mark-left', `${x}px`);
        else layout.style.setProperty('--mark-mid', `${Math.max(280, e.clientX - panel.getBoundingClientRect().left)}px`);
      };
      const up = () => {
        divider.removeEventListener('pointermove', move);
        divider.removeEventListener('pointerup', up);
      };
      divider.addEventListener('pointermove', move);
      divider.addEventListener('pointerup', up);
    });
    return divider;
  };
  const first = makeDivider('left');
  const second = makeDivider('right');
  layout.insertBefore(first, panel);
  if (right) layout.insertBefore(second, right);
}

function attach(modal) {
  const left = modal.querySelector('.at-modal__content');
  const layout = left?.parentElement;
  if (!left || !layout || !isMarkActive(modal) || modal.dataset.markResearchDismissed === 'true') return false;
  let panel = layout.querySelector(`#${PANEL_ID}`);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'mark-research-panel';
    const right = [...layout.children].find((node) => node !== left && !node.classList.contains('mark-research-divider'));
    layout.insertBefore(panel, right || null);
    layout.classList.add(STYLE_CLASS);
    installResize(layout, left, panel, right);
  }
  const chapter = activeChapter(modal);
  if (panel.dataset.chapter !== String(chapter)) {
    panel.dataset.chapter = String(chapter);
    renderPanel(panel, chapter, modal);
  }
  return true;
}

function detach(modal) {
  const panel = modal.querySelector(`#${PANEL_ID}`);
  const layout = panel?.parentElement;
  panel?.remove();
  layout?.querySelectorAll('.mark-research-divider').forEach((node) => node.remove());
  layout?.classList.remove(STYLE_CLASS);
  layout?.querySelectorAll('.mark-research-left,.mark-research-right').forEach((node) => node.classList.remove('mark-research-left', 'mark-research-right'));
}

export function installMarkResearchLayerBridge() {
  if (typeof window === 'undefined' || window.__markResearchLayerBridgeInstalled) return;
  window.__markResearchLayerBridgeInstalled = true;
  const reconcile = () => {
    document.querySelectorAll('.at-modal--context').forEach((modal) => {
      if (!isMarkActive(modal)) {
        delete modal.dataset.markResearchDismissed;
        detach(modal);
      } else {
        attach(modal);
      }
    });
  };
  const observer = new MutationObserver(() => window.requestAnimationFrame(reconcile));
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-book-active'] });
  window.requestAnimationFrame(reconcile);
}
