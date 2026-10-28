/**
 * EduClass v2 — Student Portal Utilities
 * Hàm tiện ích hỗ trợ công thức Toán học KaTeX Offline
 */

// Hàm render công thức Toán học bằng KaTeX Offline (hỗ trợ $...$, $$...$$, \(...\), \[...\])
export function renderMath(text) {
  if (!text) return '';
  const str = String(text);
  if (typeof window === 'undefined' || typeof window.katex === 'undefined') {
    return str.replace(/\r?\n/g, '<br>');
  }
  const mathRegex = /(?:\$\$([\s\S]+?)\$\$)|(?:\\\[([\s\S]+?)\\\])|(?:\$((?:(?!\n\s*\n)[^$\\]|\\.)+?)\$)|(?:\\\(([\s\S]+?)\\\))/g;
  let lastIdx = 0;
  let result = '';
  let m;
  while ((m = mathRegex.exec(str)) !== null) {
    if (m.index > lastIdx) {
      result += str.slice(lastIdx, m.index).replace(/\r?\n/g, '<br>');
    }
    const formula = m[1] || m[2] || m[3] || m[4];
    const displayMode = Boolean(m[1] || m[2]);
    try {
      result += window.katex.renderToString(formula, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      result += m[0];
    }
    lastIdx = mathRegex.lastIndex;
  }
  if (lastIdx < str.length) {
    result += str.slice(lastIdx).replace(/\r?\n/g, '<br>');
  }
  return result;
}
