import { describe, expect, it } from 'vitest';
import {
  Banner,
  Button,
  Card,
  DemoPage,
  Input,
  KAHOOT_SHAPES,
  Modal,
  Toast,
  UI_COLORS,
  UI_KIT_THEME,
  UI_RADII,
  UI_SPACING,
  UI_TYPOGRAPHY,
} from './index.js';

describe('packages/ui-kit exports', () => {
  it('exports all tokens and components', () => {
    expect(UI_KIT_THEME).toBe('educlass-default');
    expect(UI_COLORS.primary).toBe('#4F8CFF');
    expect(KAHOOT_SHAPES.red.symbol).toBe('▲');
    expect(UI_TYPOGRAPHY.bodySizeStudent).toBe('18px');
    expect(UI_SPACING.minTouchTarget).toBe('48px');
    expect(UI_RADII.card).toBe('20px');

    expect(Button).toBeDefined();
    expect(Card).toBeDefined();
    expect(Input).toBeDefined();
    expect(Modal).toBeDefined();
    expect(Toast).toBeDefined();
    expect(Banner).toBeDefined();
    expect(DemoPage).toBeDefined();
  });
});
