import { BOOK_CONTEXTS } from '../data/contextRegistry.js';

const PANEL_ID = 'mark-research-layer-test';
const REOPEN_ID = 'mark-research-reopen-test';
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
      <header><strong>구조 형성 기준 · 마가복음 ${chapter}장</strong><button value="close" aria-label="닫기">×</button></header>
      <section>
        <h4>내부 분석 기준</h4>
        <p><b>프로젝트 큐레이션:</b> <code>CURATED_GOSPELS_ACTS.Mark.${chapter}</code></p>
        <p><b>Context V2:</b> 장별 의제, 구조 앵커, 핵심 본문을 저장소 데이터에서 직접 읽습니다.</p>
        <p><b>본문 근거:</b> ${chapterData?.keyVerses?.map((item) => `막 ${chapter}:${item.verse} · ${item.label}`).join('<br>') || '핵심 본문 미등록'}</p>
      </section>
      <section>
        <h4>검증 안내</h4>
        <p>이 구조는 원어 구조, ARC 구조, 문맥 분석과 프로젝트 내부 큐레이션을 토대로 형성한 참고용 자료입니다.</p>
        <p>성경 해석의 최종 기준이 아니며, 사용자는 본문·원어·주석·신학 자료를 함께 비교하여 직접 교차 검증해야 합니다.</p>
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

function macroCard(chapter) {
  const cv2 = MARK_CONTEXT?.contextV2 || {};
  const macro = cv2.macro || {};
  const meta = cv2.meta || {};
  const sections = macro.sections || [];
  const pivots = macro.pivots || [];
  const arcs = macro.arcs || [];
  if (!sections.length && !arcs.length) return '';

  const pv = Object.fromEntries(pivots.map((p) => [p.id, p]));
  const bar = sections.map((s) => {
    const active = chapter >= s.fromCh && chapter <= s.toCh;
    return `<div class="mark-macro-seg${active ? ' is-active' : ''}" style="--seg:${s.color}">
      <b>${s.fromCh}–${s.toCh}장</b><span>${s.label}</span></div>`;
  }).join('');

  const keyArcs = arcs.filter((a) => a.label).slice(0, 5).map((a) => {
    const f = pv[a.from]?.label || a.from;
    const t = pv[a.to]?.label || a.to;
    return `<li class="mark-macro-arc" style="--arc:${a.color || '#7c3aed'}"><b>${a.label}</b><span>${f} ↔ ${t}</span></li>`;
  }).join('');

  const theme = [meta.theme, meta.themeNote].filter(Boolean).join(' · ');

  return `
    <article class="mark-research-card mark-macro-card">
      <div class="mark-research-badges">${badge('전체 구조 · 고정', 'purple')}${badge('마가복음', 'blue')}${badge(`현재 ${chapter}장`, 'green')}</div>
      <h3>🗂 마가복음 전체 구조</h3>
      ${theme ? `<p class="mark-macro-theme">${theme}</p>` : ''}
      <div class="mark-macro-bar">${bar}</div>
      ${keyArcs ? `<div class="mark-macro-arcs-title">핵심 전환축 (Inclusio·구속사 연결)</div><ul class="mark-macro-arcs">${keyArcs}</ul>` : ''}
    </article>`;
}

function renderPanel(panel, chapter, modal) {
  const chapterData = MARK_CONTEXT?.contextV2?.chapters?.[chapter];
  const agenda = chapterData?.agenda || MARK_CONTEXT?.meta?.chapterAgenda?.[chapter] || '장별 연구 의제가 아직 등록되지 않았습니다.';
  const anchors = chapterData?.structureNodes || [];
  const keys = chapterData?.keyVerses || [];
  const quality = chapterData?.quality === 'curated' ? '사람 큐레이션' : '구조 후보';

  panel.innerHTML = `
    <header class="mark-research-header">
      <div><strong>본문 구조 연구</strong><span>Pericope Intelligence · 마가복음 ${chapter}장</span></div>
      <div class="mark-research-actions">
        <button type="button" class="mark-research-source">구조 형성 기준</button>
        <button type="button" class="mark-research-close" aria-label="본문 구조 연구 닫기">×</button>
      </div>
    </header>
    <div class="mark-research-notice">원어 구조·ARC 구조·문맥 분석·내부 큐레이션 기반 참고용 자료 · 사용자 교차 검증 필요</div>
    <div class="mark-research-scroll" data-modal-scroll-region="true">
      ${macroCard(chapter)}
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
        <h3>학술 자료와 대안 구조</h3>
        <p>현재는 저장소 내부 큐레이션만 연결했습니다. 학자별 단락 구분·담화 분석·개혁주의 석의 차이는 판본과 페이지를 확인한 뒤 주요안·대안·채택 이유로 추가해야 합니다.</p>
      </article>
    </div>`;

  panel.querySelector('.mark-research-source')?.addEventListener('click', () => sourceDialog(chapter, chapterData));
  panel.querySelector('.mark-research-close')?.addEventListener('click', () => {
    if (!window.matchMedia('(max-width: 900px)').matches) return;
    modal.dataset.markResearchDismissed = 'true';
    detach(modal);
    ensureReopenButton(modal);
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

function findPanes(layout, left) {
  const kids = [...layout.children].filter((node) =>
    node.id !== PANEL_ID && !node.classList.contains('mark-research-second-divider'),
  );
  const last = kids[kids.length - 1];
  const observation = last && last !== left ? last : null;
  const splitter = kids.find((node) => node !== left && node !== observation) || null;
  return { observation, splitter };
}

function installResize(layout, panel) {
  if (layout.querySelector('.mark-research-second-divider')) return;
  const divider = document.createElement('div');
  divider.className = 'mark-research-second-divider';
  divider.setAttribute('role', 'separator');
  divider.setAttribute('aria-orientation', 'vertical');
  divider.tabIndex = 0;
  divider.style.display = 'none';
  divider.addEventListener('pointerdown', (event) => {
    if (window.matchMedia('(max-width: 900px)').matches) return;
    event.preventDefault();
    divider.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startW = panel.getBoundingClientRect().width;
    let moveFrame = 0;
    let latestClientX = startX;

    const applyMove = () => {
      moveFrame = 0;
      const width = Math.max(280, Math.min(680, startW + (startX - latestClientX)));
      panel.style.flex = `0 0 ${width}px`;
    };
    const move = (moveEvent) => {
      latestClientX = moveEvent.clientX;
      if (moveFrame) return;
      moveFrame = window.requestAnimationFrame(applyMove);
    };
    const up = () => {
      if (moveFrame) window.cancelAnimationFrame(moveFrame);
      try { divider.releasePointerCapture(event.pointerId); } catch { /* noop */ }
      divider.removeEventListener('pointermove', move);
      divider.removeEventListener('pointerup', up);
      divider.removeEventListener('pointercancel', up);
    };
    divider.addEventListener('pointermove', move, { passive: true });
    divider.addEventListener('pointerup', up, { passive: true });
    divider.addEventListener('pointercancel', up, { passive: true });
  });
  layout.insertBefore(divider, panel);
}

function ensureReopenButton(modal) {
  // 모바일은 3열 미제공이므로 재열기 버튼도 표시하지 않는다(가로 잘림 회귀 방지).
  if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)').matches) return;
  const left = modal.querySelector('.at-modal__content');
  const layout = left?.parentElement;
  if (!left || !layout || !isMarkActive(modal) || layout.querySelector(`#${REOPEN_ID}`)) return;

  const button = document.createElement('button');
  button.id = REOPEN_ID;
  button.type = 'button';
  button.textContent = '본문 구조 연구 다시 열기';
  button.setAttribute('aria-label', '마가복음 본문 구조 연구 다시 열기');
  button.style.cssText = 'position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(96px + env(safe-area-inset-bottom));z-index:41;min-width:148px;min-height:44px;padding:10px 14px;border:1px solid #bfdbfe;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:13px;font-weight:900;box-shadow:0 8px 24px rgba(15,23,42,.18);cursor:pointer;';
  button.addEventListener('click', () => {
    delete modal.dataset.markResearchDismissed;
    button.remove();
    attach(modal);
  });
  layout.appendChild(button);
}

function attach(modal) {
  // 모바일(≤900px)은 3열 DOM 재편/연구 패널 주입을 하지 않는다.
  // repair.js 는 max-width:900px 에서 early-return 하지만 이 attach 는 뷰포트 가드가
  // 없어 모바일에서도 .mark-direct-observation-pane/.mark-research-layout-test 클래스와
  // 연구 패널을 붙여왔다. 관련 CSS 는 @media(min-width:901px) 전용이라 클래스만 붙고
  // 스타일 미적용 → 관찰카드 하단시트가 갇혀 원핑거 세로 스크롤이 죽고 콘텐츠가 가로로
  // 넘치는 회귀 발생. 데스크톱 3열은 유지, 모바일은 순수 문맥성경 흐름 유지.
  if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)').matches) return false;
  const left = modal.querySelector('.at-modal__content');
  const layout = left?.parentElement;
  if (!left || !layout || !isMarkActive(modal) || modal.dataset.markResearchDismissed === 'true') return false;
  layout.querySelector(`#${REOPEN_ID}`)?.remove();
  let panel = layout.querySelector(`#${PANEL_ID}`);
  if (!panel) {
    const { observation, splitter } = findPanes(layout, left);
    if (!observation) return false;

    left.classList.add('mark-direct-body-pane');
    splitter?.classList.add('mark-direct-first-divider');
    observation.classList.add('mark-direct-observation-pane');

    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'mark-research-panel mark-direct-research-pane';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', '본문 구조 연구');
    panel.style.flex = '0 0 360px';
    layout.appendChild(panel);
    layout.classList.add(STYLE_CLASS);
    layout.setAttribute('data-mark-three-column-ready', 'true');
    installResize(layout, panel);
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
  layout?.querySelectorAll('.mark-research-second-divider').forEach((node) => node.remove());
  layout?.classList.remove(STYLE_CLASS);
  layout?.removeAttribute('data-mark-three-column-ready');
  layout?.querySelectorAll('.mark-direct-body-pane,.mark-direct-first-divider,.mark-direct-observation-pane')
    .forEach((node) => node.classList.remove('mark-direct-body-pane', 'mark-direct-first-divider', 'mark-direct-observation-pane'));
}

function mutationContainsContextModal(records) {
  return records.some((record) => [...record.addedNodes, ...record.removedNodes].some((node) => (
    node instanceof Element
    && (node.matches('.at-modal--context') || node.querySelector('.at-modal--context'))
  )));
}

export function installMarkResearchLayerBridge() {
  if (typeof window === 'undefined' || window.__markResearchLayerBridgeInstalled) return;
  window.__markResearchLayerBridgeInstalled = true;

  const observationRoot = document.getElementById('root') || document.body;
  let frame = 0;
  const activeObserver = new MutationObserver(() => schedule());

  const refreshActiveTargets = () => {
    activeObserver.disconnect();
    document.querySelectorAll('.at-modal--context').forEach((modal) => {
      activeObserver.observe(modal, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-book-active'],
      });
    });
  };

  const reconcile = () => {
    frame = 0;
    document.querySelectorAll('.at-modal--context').forEach((modal) => {
      if (!isMarkActive(modal)) {
        delete modal.dataset.markResearchDismissed;
        modal.querySelector(`#${REOPEN_ID}`)?.remove();
        detach(modal);
      } else if (modal.dataset.markResearchDismissed === 'true') {
        ensureReopenButton(modal);
      } else {
        attach(modal);
      }
    });
    refreshActiveTargets();
  };

  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(reconcile);
  }

  const lifecycleObserver = new MutationObserver((records) => {
    if (mutationContainsContextModal(records)) schedule();
  });
  lifecycleObserver.observe(observationRoot, { childList: true, subtree: true });
  schedule();
}
