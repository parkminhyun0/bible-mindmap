const TOOLBAR_SELECTOR = '[data-node-editor-toolbar="true"]';
const DRAWER_LAUNCHER_SELECTOR = 'button[aria-controls="cross-reference-assist-panel"]';
const BRIDGE_MARK = 'data-cross-reference-toolbar-bridge';

function findToolbarButton() {
  for (const toolbar of document.querySelectorAll(TOOLBAR_SELECTOR)) {
    const button = Array.from(toolbar.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('교차 참조'),
    );
    if (button) return button;
  }
  return null;
}

function findDrawerLauncher() {
  return Array.from(document.querySelectorAll(DRAWER_LAUNCHER_SELECTOR)).find(
    (button) => !button.closest(TOOLBAR_SELECTOR),
  ) || null;
}

function labelFor(launcher) {
  const match = launcher?.textContent?.match(/교차 참조\s*(\d+)/);
  return match ? `🔗 교차 참조 ${match[1]}` : '🔗 교차 참조';
}

function setAttributeIfChanged(element, name, value) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function styleToolbarButton(button, launcher) {
  const expanded = launcher.getAttribute('aria-expanded') === 'true';
  const nextLabel = labelFor(launcher);
  if (button.textContent !== nextLabel) button.textContent = nextLabel;
  setAttributeIfChanged(button, 'aria-controls', 'cross-reference-assist-panel');
  setAttributeIfChanged(button, 'aria-expanded', String(expanded));
  setAttributeIfChanged(button, 'title', '교차 참조 패널 열기·닫기');
  button.style.background = expanded ? '#2563eb' : '#ecfdf5';
  button.style.color = expanded ? '#fff' : '#065f46';
  button.style.borderLeft = expanded ? 'none' : '2px solid #10b981';
}

function nearestSharedContainer(left, right, fallback) {
  let current = left;
  while (current && current !== document.body) {
    if (current.contains(right)) return current;
    current = current.parentElement;
  }
  return fallback;
}

function connectToolbarChip(observationRoot) {
  const toolbarButton = findToolbarButton();
  const launcher = findDrawerLauncher();

  if (!toolbarButton || !launcher) {
    launcher?.style.removeProperty('display');
    return null;
  }

  launcher.style.setProperty('display', 'none', 'important');
  setAttributeIfChanged(launcher, 'aria-hidden', 'true');

  let connectedButton = toolbarButton;
  if (toolbarButton.getAttribute(BRIDGE_MARK) !== 'true') {
    connectedButton = toolbarButton.cloneNode(true);
    connectedButton.setAttribute(BRIDGE_MARK, 'true');
    connectedButton.addEventListener('click', () => {
      launcher.click();
      window.requestAnimationFrame(() => connectToolbarChip(observationRoot));
    });
    toolbarButton.replaceWith(connectedButton);
  }

  styleToolbarButton(connectedButton, launcher);
  return nearestSharedContainer(connectedButton, launcher, observationRoot);
}

function mutationContainsBridgeTarget(records) {
  return records.some((record) => [...record.addedNodes, ...record.removedNodes].some((node) => (
    node instanceof Element
    && (
      node.matches(TOOLBAR_SELECTOR)
      || node.matches(DRAWER_LAUNCHER_SELECTOR)
      || node.querySelector(TOOLBAR_SELECTOR)
      || node.querySelector(DRAWER_LAUNCHER_SELECTOR)
    )
  )));
}

export function installCrossReferenceToolbarBridge() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const observationRoot = document.getElementById('root') || document.body;
  let frame = 0;
  let activeTarget = null;
  const activeObserver = new MutationObserver(() => schedule());

  const observeActiveTarget = (target) => {
    if (target === activeTarget) return;
    activeObserver.disconnect();
    activeTarget = target;
    if (!target) return;
    activeObserver.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-expanded'],
    });
  };

  const reconcile = () => {
    frame = 0;
    observeActiveTarget(connectToolbarChip(observationRoot));
  };

  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(reconcile);
  }

  const lifecycleObserver = new MutationObserver((records) => {
    if (mutationContainsBridgeTarget(records)) schedule();
  });
  lifecycleObserver.observe(observationRoot, { childList: true, subtree: true });
  schedule();

  return () => {
    lifecycleObserver.disconnect();
    activeObserver.disconnect();
    activeTarget = null;
    if (frame) window.cancelAnimationFrame(frame);
  };
}
