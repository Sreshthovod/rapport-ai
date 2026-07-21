import { useEffect } from 'react';

export function useKeyboardShortcut(
  key: string,
  onTrigger: () => void,
  targetWindow: Window = window
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCmdOrCtrl = event.metaKey || event.ctrlKey;
      if (isCmdOrCtrl && event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        event.stopPropagation();
        onTrigger();
      }
    };

    targetWindow.addEventListener('keydown', handleKeyDown, true);
    return () => {
      targetWindow.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [key, onTrigger, targetWindow]);
}
