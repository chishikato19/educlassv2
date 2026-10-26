import { describe, expect, it } from 'vitest';
import { KAHOOT_SHAPES, UI_COLORS, UI_RADII, UI_SPACING, UI_TYPOGRAPHY } from '../tokens/index.js';

describe('Design Tokens (PLAN.md 7.1 & 7.2)', () => {
  it('defines primary, background and semantic colors', () => {
    expect(UI_COLORS.primary).toBe('#4F8CFF');
    expect(UI_COLORS.background).toBe('#FFF9F0');
    expect(UI_COLORS.success).toBe('#2ECC8F');
    expect(UI_COLORS.error).toBe('#FF6B6B');
    expect(UI_COLORS.warning).toBe('#FFB020');
  });

  it('defines Kahoot colors accompanied by geometric shapes for colorblind accessibility', () => {
    expect(KAHOOT_SHAPES.red.symbol).toBe('▲');
    expect(KAHOOT_SHAPES.red.color).toBe('#FF6B6B');

    expect(KAHOOT_SHAPES.blue.symbol).toBe('◆');
    expect(KAHOOT_SHAPES.blue.color).toBe('#4F8CFF');

    expect(KAHOOT_SHAPES.yellow.symbol).toBe('●');
    expect(KAHOOT_SHAPES.yellow.color).toBe('#FFB020');

    expect(KAHOOT_SHAPES.green.symbol).toBe('■');
    expect(KAHOOT_SHAPES.green.color).toBe('#2ECC8F');
  });

  it('guarantees student body font size >= 18px and title 24-32px', () => {
    expect(parseInt(UI_TYPOGRAPHY.bodySizeStudent, 10)).toBeGreaterThanOrEqual(18);
    const titleSize = parseInt(UI_TYPOGRAPHY.titleSize, 10);
    expect(titleSize).toBeGreaterThanOrEqual(24);
    expect(titleSize).toBeLessThanOrEqual(32);
  });

  it('enforces minimum touch target size >= 48px and gap >= 8px', () => {
    expect(parseInt(UI_SPACING.minTouchTarget, 10)).toBeGreaterThanOrEqual(48);
    expect(parseInt(UI_SPACING.buttonGap, 10)).toBeGreaterThanOrEqual(8);
  });

  it('defines rounded corners between 16px and 24px', () => {
    const cardR = parseInt(UI_RADII.card, 10);
    expect(cardR).toBeGreaterThanOrEqual(16);
    expect(cardR).toBeLessThanOrEqual(24);
  });
});
