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

function styleToolbarButton(button, launcher) {
  const expanded = launcher.getAttribute('aria-expanded') === 'true';
  button.textContent = labelFor(launcher);
  button.setAttribute('aria-controls', 'cross-reference-assist-panel');
  button.setAttribute('aria-expanded', String(expanded));
  button.setAttribute('title', '교차 참조 패널 열기·닫기');
  button.style.background = expanded ? '#2563eb' : '#ecfdf5';
  button.style.color = expanded ? '#fff' : '#065f46';
  button.style.borderLeft = expanded ? 'none' : '2px solid #10b981';
}

function connectToolbarChip() {
  const toolbarButton = findToolbarButton();
  const launcher = findDrawerLauncher();

  if (!toolbarButton || !launcher) {
    launcher?.style.removeProperty('display');
    return;
  }

  launcher.style.setProperty('display', 'none', 'important');
  launcher.setAttribute('aria-hidden', 'true');

  let connectedButton = toolbarButton;
  if (toolbarButton.getAttribute(BRIDGE_MARK) !== 'true') {
    connectedButton = toolbarButton.cloneNode(true);
    connectedButton.setAttribute(BRIDGE_MARK, 'true');
    connectedButton.addEventListener('click', () => {
      launcher.click();
      window.requestAnimationFrame(connectToolbarChip);
    });
    toolbarButton.replaceWith(connectedButton);
  }

  styleToolbarButton(connectedButton, launcher);
}

export function installCrossReferenceToolbarBridge() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let frame = 0;
  const schedule = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(connectToolbarChip);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-expanded'],
  });
  schedule();

  return () => {
    observer.disconnect();
    window.cancelAnimationFrame(frame);
  };
}
