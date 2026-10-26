import { describe, it, expect } from 'vitest';
import {
  renderLatex,
  parseMathSegments,
  renderLatexInText,
} from '../katex/katex-renderer.js';

describe('KaTeX Renderer', () => {
  it('renders inline latex formulas to html string', () => {
    const html = renderLatex('E = mc^2');
    expect(html).toContain('class="katex"');
    expect(html).toContain('E');
    expect(html).toContain('m');
  });

  it('renders display mode formulas', () => {
    const html = renderLatex('\\frac{a}{b}', { displayMode: true });
    expect(html).toContain('class="katex-display"');
  });

  it('safely handles invalid latex syntax without throwing', () => {
    const html = renderLatex('\\frac{a}'); // missing 2nd arg in strict katex
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('parses text into text and math segments correctly', () => {
    const input = 'Cho hàm số $f(x) = x^2$ với đồ thị $$y = f(x)$$ là parabol.';
    const segments = parseMathSegments(input);

    expect(segments).toHaveLength(5);
    expect(segments[0]).toEqual({
      type: 'text',
      value: 'Cho hàm số ',
      raw: 'Cho hàm số ',
    });
    expect(segments[1]).toEqual({
      type: 'inline-math',
      value: 'f(x) = x^2',
      raw: '$f(x) = x^2$',
    });
    expect(segments[2]).toEqual({
      type: 'text',
      value: ' với đồ thị ',
      raw: ' với đồ thị ',
    });
    expect(segments[3]).toEqual({
      type: 'display-math',
      value: 'y = f(x)',
      raw: '$$y = f(x)$$',
    });
    expect(segments[4]).toEqual({
      type: 'text',
      value: ' là parabol.',
      raw: ' là parabol.',
    });
  });

  it('supports bracket syntax \\[...\\] and \\(...\\)', () => {
    const input = 'Hàm số \\(g(x) = \\sin(x)\\) và \\[\\int_0^1 g(x)dx\\]';
    const segments = parseMathSegments(input);

    expect(segments).toHaveLength(4);
    expect(segments[1]!.type).toBe('inline-math');
    expect(segments[1]!.value).toBe('g(x) = \\sin(x)');
    expect(segments[3]!.type).toBe('display-math');
    expect(segments[3]!.value).toBe('\\int_0^1 g(x)dx');
  });

  it('renders mixed text with formulas to sanitized HTML', () => {
    const text = 'Nghiệm của $x^2 - 4 = 0$ là:';
    const html = renderLatexInText(text);

    expect(html).toContain('Nghiệm của');
    expect(html).toContain('class="katex"');
    expect(html).toContain('là:');
  });

  it('escapes raw HTML tags in plain text to prevent XSS', () => {
    const malicious = '<script>alert(1)</script> $x = 1$';
    const html = renderLatexInText(malicious);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('class="katex"');
  });
});
