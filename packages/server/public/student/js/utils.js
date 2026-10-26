/**
 * EduClass v2 — Student Portal Utilities
 * Hàm tiện ích hỗ trợ công thức Toán học KaTeX Offline
 */

// Hàm render công thức Toán học bằng KaTeX Offline (hỗ trợ $...$, $$...$$, \(...\), \[...\])
export function renderMath(text) {
  if (!text) return '';
  if (typeof window === 'undefined' || typeof window.katex === 'undefined') {
    return String(text);
  }
  const mathRegex = /(?:\$\$([\s\S]+?)\$\$)|(?:\\\[([\s\S]+?)\\\])|(?:\$((?:[^$\n]|\\.)+?)\$)|(?:\\\(([\s\S]+?)\\\))/g;
  return String(text).replace(mathRegex, (match, d1, d2, i1, i2) => {
    const formula = d1 || d2 || i1 || i2;
    const displayMode = Boolean(d1 || d2);
    try {
      return window.katex.renderToString(formula, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      return match;
    }
  });
}
