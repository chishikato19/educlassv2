import { useEffect } from 'react';
import type { KeyBindings } from '../arcade-duel-schemas.js';

export interface UseArcadeKeyboardProps {
  enabled: boolean;
  keyBindings: KeyBindings;
  onSelectOption: (teamId: 'blue' | 'red', optionIndex: number) => void;
  onUsePowerUp: (teamId: 'blue' | 'red') => void;
}

/**
 * Hook lắng nghe bàn phím đa người chơi cho 2 đội
 * Bắt theo event.code để chống xung đột Unikey/EVKey
 */
export function useArcadeKeyboard({
  enabled,
  keyBindings,
  onSelectOption,
  onUsePowerUp,
}: UseArcadeKeyboardProps): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu đang gõ trong input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      const code = e.code;
      let handled = false;

      // 1. Phím của Đội Xanh (Trái)
      const bk = keyBindings.blueKeys;
      if (code === bk.option1) {
        onSelectOption('blue', 0);
        handled = true;
      } else if (code === bk.option2) {
        onSelectOption('blue', 1);
        handled = true;
      } else if (code === bk.option3) {
        onSelectOption('blue', 2);
        handled = true;
      } else if (code === bk.option4) {
        onSelectOption('blue', 3);
        handled = true;
      } else if (code === bk.powerUp) {
        onUsePowerUp('blue');
        handled = true;
      }

      // 2. Phím của Đội Đỏ (Phải)
      const rk = keyBindings.redKeys;
      if (code === rk.option1 || (rk.option1 === 'Digit1' && code === 'Numpad1')) {
        onSelectOption('red', 0);
        handled = true;
      } else if (code === rk.option2 || (rk.option2 === 'Digit2' && code === 'Numpad2')) {
        onSelectOption('red', 1);
        handled = true;
      } else if (code === rk.option3 || (rk.option3 === 'Digit3' && code === 'Numpad3')) {
        onSelectOption('red', 2);
        handled = true;
      } else if (code === rk.option4 || (rk.option4 === 'Digit4' && code === 'Numpad4')) {
        onSelectOption('red', 3);
        handled = true;
      } else if (code === rk.powerUp || (rk.powerUp === 'Digit5' && code === 'Numpad5')) {
        onUsePowerUp('red');
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, keyBindings, onSelectOption, onUsePowerUp]);
}
