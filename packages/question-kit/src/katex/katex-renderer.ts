import katex from 'katex';

export type MathSegmentType = 'text' | 'inline-math' | 'display-math';

export interface MathSegment {
  type: MathSegmentType;
  value: string;
  raw: string;
}

export interface RenderLatexOptions {
  displayMode?: boolean;
}

/**
 * Render a LaTeX formula to an HTML string using KaTeX.
 * Safe fallback on errors.
 */
export function renderLatex(formula: string, options?: RenderLatexOptions): string {
  try {
    return katex.renderToString(formula, {
      displayMode: Boolean(options?.displayMode),
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi công thức KaTeX';
    const escaped = escapeHtml(formula);
    return `<span class="katex-error" title="${escapeHtml(errorMsg)}">${escaped}</span>`;
  }
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse a mixed string of text and math ($...$, $$...$$, \(...\), \[...\])
 * into structured segments for flexible rendering.
 */
export function parseMathSegments(input: string): MathSegment[] {
  if (!input) return [];

  const segments: MathSegment[] = [];

  // Patterns for display math and inline math
  // 1: $$...$$
  // 2: \[...\]
  // 3: $...$
  // 4: \(...\)
  const mathRegex =
    /(?:\$\$([\s\S]+?)\$\$)|(?:\\\[([\s\S]+?)\\\])|(?:\$((?:(?!\n\s*\n)[^$\\]|\\.)+?)\$)|(?:\\\(([\s\S]+?)\\\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(input)) !== null) {
    const matchStart = match.index;
    const matchEnd = mathRegex.lastIndex;

    // Preceding text
    if (matchStart > lastIndex) {
      const textValue = input.slice(lastIndex, matchStart);
      segments.push({
        type: 'text',
        value: textValue,
        raw: textValue,
      });
    }

    if (match[1] !== undefined) {
      // $$...$$
      segments.push({
        type: 'display-math',
        value: match[1],
        raw: match[0],
      });
    } else if (match[2] !== undefined) {
      // \[...\]
      segments.push({
        type: 'display-math',
        value: match[2],
        raw: match[0],
      });
    } else if (match[3] !== undefined) {
      // $...$
      segments.push({
        type: 'inline-math',
        value: match[3],
        raw: match[0],
      });
    } else if (match[4] !== undefined) {
      // \(...\)
      segments.push({
        type: 'inline-math',
        value: match[4],
        raw: match[0],
      });
    }

    lastIndex = matchEnd;
  }

  // Trailing text
  if (lastIndex < input.length) {
    const trailing = input.slice(lastIndex);
    segments.push({
      type: 'text',
      value: trailing,
      raw: trailing,
    });
  }

  return segments;
}

/**
 * Render mixed text with formulas to HTML string, escaping plain text for XSS protection.
 */
export function renderLatexInText(input: string): string {
  const segments = parseMathSegments(input);
  return segments
    .map(seg => {
      if (seg.type === 'text') {
        return escapeHtml(seg.value).replace(/\r?\n/g, '<br/>');
      }
      return renderLatex(seg.value, { displayMode: seg.type === 'display-math' });
    })
    .join('');
}
