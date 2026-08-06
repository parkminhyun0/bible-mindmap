import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_HEIGHT = '100dvh';
const PINCH_SCALE_EPSILON = 0.01;

function viewportSnapshot(viewport = typeof window !== 'undefined' ? window.visualViewport : null) {
  if (!viewport) {
    return { top: 0, left: 0, height: DEFAULT_HEIGHT, scale: 1 };
  }

  return {
    top: viewport.offsetTop || 0,
    left: viewport.offsetLeft || 0,
    height: `${viewport.height}px`,
    scale: viewport.scale || 1,
  };
}

/**
 * Applies the shared mobile modal geometry contract to an existing element.
 * Width deliberately stays percentage based. During pinch zoom visualViewport
 * reports a changing width on every frame; using it would resize the modal and
 * fight the browser's zoom gesture. Height/top are synchronized only at scale 1
 * for software-keyboard and browser-chrome changes.
 */
export function syncMobileModalFrameGeometry(element, viewport = window.visualViewport) {
  if (!(element instanceof HTMLElement)) return false;
  const snapshot = viewportSnapshot(viewport);
  if (Math.abs(snapshot.scale - 1) > PINCH_SCALE_EPSILON) return false;

  element.dataset.mobileModalFrame = 'true';
  element.style.position = 'fixed';
  element.style.inset = 'auto';
  element.style.left = `${snapshot.left}px`;
  element.style.top = `${snapshot.top}px`;
  element.style.right = 'auto';
  element.style.bottom = 'auto';
  element.style.width = '100%';
  element.style.maxWidth = '100%';
  element.style.height = snapshot.height;
  element.style.minHeight = snapshot.height;
  element.style.maxHeight = snapshot.height;
  element.style.overflow = 'hidden';
  element.style.transform = 'none';
  return true;
}

/**
 * Shared frame for new mobile modal implementations. Existing portals can use
 * syncMobileModalFrameGeometry through useModalDialog while they migrate to
 * this component without changing feature/data contracts.
 */
export default function MobileModalFrame({
  as: Component = 'div',
  children,
  style,
  contentStyle,
  className,
  ...props
}) {
  const frameRef = useRef(null);
  const [geometry, setGeometry] = useState(() => viewportSnapshot());

  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;

    const update = () => {
      frame = 0;
      const next = viewportSnapshot(viewport);
      if (Math.abs(next.scale - 1) > PINCH_SCALE_EPSILON) return;
      setGeometry(next);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    viewport?.addEventListener('resize', schedule, { passive: true });
    viewport?.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('orientationchange', schedule);
    };
  }, []);

  const frameStyle = useMemo(() => ({
    position: 'fixed',
    inset: 'auto',
    left: geometry.left,
    top: geometry.top,
    right: 'auto',
    bottom: 'auto',
    width: '100%',
    maxWidth: '100%',
    height: geometry.height,
    minHeight: geometry.height,
    maxHeight: geometry.height,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    ...style,
  }), [geometry, style]);

  return (
    <Component
      ref={frameRef}
      data-mobile-modal-frame="true"
      className={className}
      style={frameStyle}
      {...props}
    >
      <div
        data-modal-scroll-region="true"
        style={{
          minWidth: 0,
          minHeight: 0,
          flex: 1,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </Component>
  );
}
