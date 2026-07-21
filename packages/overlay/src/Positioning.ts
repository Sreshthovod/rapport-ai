import { PositionCoordinates } from './types.js';

export interface PositioningEngine {
  calculatePosition(
    targetElement: HTMLElement | null,
    offsetY?: number
  ): PositionCoordinates;
  observe(targetElement: HTMLElement | null, onPositionChange: (pos: PositionCoordinates) => void): () => void;
}

export function createPositioningEngine(): PositioningEngine {
  const calculatePosition = (
    targetElement: HTMLElement | null,
    offsetY: number = 8
  ): PositionCoordinates => {
    if (!targetElement || !document.body.contains(targetElement)) {
      return { top: 0, left: 0, width: 0, visible: false };
    }

    const rect = targetElement.getBoundingClientRect();
    
    // Hidden element check
    if (rect.width === 0 || rect.height === 0) {
      return { top: 0, left: 0, width: 0, visible: false };
    }

    // Position anchored above the input area
    const top = Math.max(12, rect.top - 48 - offsetY);
    const left = rect.left;
    const width = rect.width;

    return {
      top,
      left,
      width,
      visible: true,
    };
  };

  const observe = (
    targetElement: HTMLElement | null,
    onPositionChange: (pos: PositionCoordinates) => void
  ): (() => void) => {
    let animationFrameId: number | null = null;

    const update = () => {
      const pos = calculatePosition(targetElement);
      onPositionChange(pos);
    };

    const handleResizeOrScroll = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(update);
    };

    window.addEventListener('resize', handleResizeOrScroll, { passive: true });
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true, capture: true });

    // Initial position calculation
    update();

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, { capture: true });
    };
  };

  return {
    calculatePosition,
    observe,
  };
}
