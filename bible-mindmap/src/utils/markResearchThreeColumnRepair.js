function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function directChildOf(node, parent) {
  let current = node;
  while (current && current.parentElement !== parent) current = current.parentElement;
  return current?.parentElement === parent ? current : null;
}

function compactScaffoldingToggle(root = document) {
  const buttons = [...root.querySelectorAll('.at-modal--context button')];
  buttons.forEach((sourceButton) => {
    if (!sourceButton.textContent?.includes('학습 스캐폴딩')) return;
    const row = sourceButton.parentElement;
    if (!(row instanceof HTMLElement)) return;

    let shell = row.querySelector(':scope > [data-scaffolding-compact-shell="true"]');
    if (!(shell instanceof HTMLElement)) {
      shell = document.createElement('div');
      shell.dataset.scaffoldingCompactShell = 'true';
      shell.innerHTML = `
        <div class="scaffolding-compact-copy">
          <strong>🎓 학습 스캐폴딩</strong>
          <span>코스·렌즈·관찰 카드</span>
        </div>
        <button type="button" class="scaffolding-compact-toggle" aria-expanded="false">펼치기 ▼</button>`;
      row.insertBefore(shell, sourceButton);
      shell.querySelector('.scaffolding-compact-toggle')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        sourceButton.click();
      });
    }

    sourceButton.style.display = 'none';
    sourceButton.setAttribute('aria-hidden', 'true');
    sourceButton.tabIndex = -1;

    const isExpanded = sourceButton.textContent?.includes('접기');
    const toggle = shell.querySelector('.scaffolding-compact-toggle');
    const note = shell.querySelector('.scaffolding-compact-copy span');
    if (toggle instanceof HTMLButtonElement) {
      toggle.textContent = isExpanded ? '접기 ▲' : '펼치기 ▼';
      toggle.setAttribute('aria-expanded', String(isExpanded));
    }
    if (note instanceof HTMLElement) {
      const progress = [...sourceButton.querySelectorAll('span')]
        .map((span) => span.textContent?.trim())
        .find((text) => text?.startsWith('· 진행 중:'));
      note.textContent = progress ? progress.replace(/^·\s*/, '') : '코스·렌즈·관찰 카드';
    }
  });
}

function findObservationPane(layout, research, left) {
  const card = layout.querySelector('[data-context-chapter-card]');
  const cardPane = card ? directChildOf(card, layout) : null;
  if (cardPane && cardPane !== research && cardPane !== left) return cardPane;

  const candidates = [...layout.children].filter((child) => (
    child !== left
    && child !== research
    && !child.classList.contains('mark-research-divider')
    && !child.classList.contains('mark-research-second-divider')
  ));
  return candidates.find((child) => child.querySelector?.('[data-context-chapter-card]'))
    || candidates[candidates.length - 1]
    || null;
}

function ensureSecondDivider(layout, research) {
  let divider = layout.querySelector(':scope > .mark-research-second-divider');
  if (!(divider instanceof HTMLElement)) {
    divider = document.createElement('div');
    divider.className = 'mark-research-second-divider';
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-orientation', 'vertical');
    divider.setAttribute('aria-label', '관찰카드와 본문 구조 연구 너비 조절');
  }
  layout.insertBefore(divider, research);
  return divider;
}

function prepareThreeColumnLayout(layout) {
  if (!(layout instanceof HTMLElement) || window.matchMedia('(max-width: 900px)').matches) return;

  const research = layout.querySelector(':scope > .mark-research-panel');
  const leftSource = layout.querySelector(':scope > .at-modal__content')
    || layout.querySelector(':scope > .mark-research-left');
  if (!(research instanceof HTMLElement) || !(leftSource instanceof HTMLElement)) return;

  const observation = findObservationPane(layout, research, leftSource);
  if (!(observation instanceof HTMLElement)) return;

  const children = [...layout.children];
  const leftIndex = children.indexOf(leftSource);
  const observationIndex = children.indexOf(observation);
  const nativeDivider = children.find((child, index) => (
    index > leftIndex
    && index < observationIndex
    && child !== research
    && !child.classList.contains('mark-research-divider')
    && !child.classList.contains('mark-research-second-divider')
  ));

  layout.querySelectorAll(':scope > .mark-research-divider').forEach((node) => node.remove());

  leftSource.classList.add('mark-direct-body-pane');
  observation.classList.add('mark-direct-observation-pane');
  research.classList.add('mark-direct-research-pane');
  nativeDivider?.classList.add('mark-direct-first-divider');

  layout.appendChild(leftSource);
  if (nativeDivider) layout.appendChild(nativeDivider);
  layout.appendChild(observation);
  const secondDivider = ensureSecondDivider(layout, research);
  layout.appendChild(secondDivider);
  layout.appendChild(research);

  if (!observation.dataset.markColumnWidth) observation.dataset.markColumnWidth = '360';
  if (!research.dataset.markColumnWidth) research.dataset.markColumnWidth = '360';
  observation.style.setProperty('width', `${observation.dataset.markColumnWidth}px`, 'important');
  observation.style.setProperty('flex', `0 0 ${observation.dataset.markColumnWidth}px`, 'important');
  research.style.setProperty('width', `${research.dataset.markColumnWidth}px`, 'important');
  research.style.setProperty('flex', `0 0 ${research.dataset.markColumnWidth}px`, 'important');

  layout.dataset.markThreeColumnReady = 'true';
}

function installDividerCapture() {
  document.addEventListener('pointerdown', (event) => {
    const divider = event.target instanceof Element
      ? event.target.closest('.mark-direct-first-divider,.mark-research-second-divider')
      : null;
    const layout = divider?.closest('.mark-research-layout-test');
    if (!(divider instanceof HTMLElement) || !(layout instanceof HTMLElement)
      || window.matchMedia('(max-width: 900px)').matches) return;

    const observation = layout.querySelector(':scope > .mark-direct-observation-pane');
    const research = layout.querySelector(':scope > .mark-direct-research-pane');
    if (!(observation instanceof HTMLElement) || !(research instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    divider.setPointerCapture?.(event.pointerId);

    const firstDivider = divider.classList.contains('mark-direct-first-divider');
    const onMove = (moveEvent) => {
      const layoutRect = layout.getBoundingClientRect();
      const researchWidth = research.getBoundingClientRect().width;
      const dividerSpace = 12;

      if (firstDivider) {
        const observationRight = layoutRect.right - researchWidth - dividerSpace;
        const maxObservation = Math.max(260, layoutRect.width - researchWidth - 320 - dividerSpace);
        const width = clamp(observationRight - moveEvent.clientX, 260, maxObservation);
        observation.dataset.markColumnWidth = String(Math.round(width));
        observation.style.setProperty('width', `${width}px`, 'important');
        observation.style.setProperty('flex', `0 0 ${width}px`, 'important');
      } else {
        const maxResearch = Math.max(280, layoutRect.width - observation.getBoundingClientRect().width - 320 - dividerSpace);
        const width = clamp(layoutRect.right - moveEvent.clientX, 280, maxResearch);
        research.dataset.markColumnWidth = String(Math.round(width));
        research.style.setProperty('width', `${width}px`, 'important');
        research.style.setProperty('flex', `0 0 ${width}px`, 'important');
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
    };

    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
  }, true);
}

export function installMarkResearchThreeColumnRepair() {
  if (typeof window === 'undefined' || window.__markResearchThreeColumnRepairInstalled) return;
  window.__markResearchThreeColumnRepairInstalled = true;

  let raf = 0;
  const sync = () => {
    window.cancelAnimationFrame(raf);
    raf = window.requestAnimationFrame(() => {
      compactScaffoldingToggle();
      document.querySelectorAll('.mark-research-layout-test').forEach(prepareThreeColumnLayout);
    });
  };

  installDividerCapture();
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', sync, { passive: true });
  sync();
}
