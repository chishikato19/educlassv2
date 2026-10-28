/**
 * Bộ ánh xạ các ký tự toán học Unicode phổ biến sang lệnh LaTeX
 */
const SYMBOL_MAP: Record<string, string> = {
  '±': '\\pm ',
  '∓': '\\mp ',
  '×': '\\times ',
  '÷': '\\div ',
  '≤': '\\le ',
  '≥': '\\ge ',
  '≠': '\\ne ',
  '≈': '\\approx ',
  '≡': '\\equiv ',
  '∞': '\\infty ',
  '∝': '\\propto ',
  '√': '\\sqrt ',
  '∫': '\\int ',
  '∑': '\\sum ',
  '∏': '\\prod ',
  '∂': '\\partial ',
  '∇': '\\nabla ',
  '∈': '\\in ',
  '∉': '\\notin ',
  '⊂': '\\subset ',
  '⊃': '\\supset ',
  '⊆': '\\subseteq ',
  '⊇': '\\supseteq ',
  '∪': '\\cup ',
  '∩': '\\cap ',
  '∅': '\\emptyset ',
  '∀': '\\forall ',
  '∃': '\\exists ',
  '¬': '\\neg ',
  '→': '\\to ',
  '⟶': '\\to ',
  '←': '\\leftarrow ',
  '↔': '\\leftrightarrow ',
  '⇒': '\\Rightarrow ',
  '⟹': '\\Rightarrow ',
  '⇐': '\\Leftarrow ',
  '⇔': '\\Leftrightarrow ',
  '⟺': '\\Leftrightarrow ',
  '·': '\\cdot ',
  '•': '\\cdot ',
  '°': '^\\circ ',
  α: '\\alpha ',
  β: '\\beta ',
  γ: '\\gamma ',
  δ: '\\delta ',
  ε: '\\epsilon ',
  ζ: '\\zeta ',
  η: '\\eta ',
  θ: '\\theta ',
  ι: '\\iota ',
  κ: '\\kappa ',
  λ: '\\lambda ',
  μ: '\\mu ',
  ν: '\\nu ',
  ξ: '\\xi ',
  π: '\\pi ',
  ρ: '\\rho ',
  σ: '\\sigma ',
  τ: '\\tau ',
  υ: '\\upsilon ',
  φ: '\\phi ',
  χ: '\\chi ',
  ψ: '\\psi ',
  ω: '\\omega ',
  Γ: '\\Gamma ',
  Δ: '\\Delta ',
  Θ: '\\Theta ',
  Λ: '\\Lambda ',
  Ξ: '\\Xi ',
  Π: '\\Pi ',
  Σ: '\\Sigma ',
  Υ: '\\Upsilon ',
  Φ: '\\Phi ',
  Ψ: '\\Psi ',
  Ω: '\\Omega ',
};

interface SimpleNode {
  tag: string;
  attrs: Record<string, string>;
  children: SimpleNode[];
  text?: string | undefined;
}

/**
 * Phân tích cú pháp XML đơn giản, xử lý tốt cả trong Node.js và Browser
 */
function parseSimpleXml(xml: string): SimpleNode {
  // Loại bỏ comments và doctype
  const cleanXml = xml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .trim();

  let pos = 0;

  function parseNode(): SimpleNode | null {
    while (pos < cleanXml.length && /\s/.test(cleanXml[pos]!)) {
      pos++;
    }
    if (pos >= cleanXml.length || cleanXml[pos] !== '<') {
      return null;
    }

    if (cleanXml[pos + 1] === '/') {
      return null; // Closing tag
    }

    // Đọc thẻ mở
    const tagEnd = cleanXml.indexOf('>', pos);
    if (tagEnd === -1) return null;

    const tagContent = cleanXml.slice(pos + 1, tagEnd).trim();
    const isSelfClosing = tagContent.endsWith('/');
    const cleanTagContent = isSelfClosing ? tagContent.slice(0, -1).trim() : tagContent;

    const parts = cleanTagContent.split(/\s+/);
    const tagName = parts[0]!.toLowerCase();
    const attrs: Record<string, string> = {};

    for (let i = 1; i < parts.length; i++) {
      const match = parts[i]!.match(/^([^=]+)="([^"]*)"$/);
      if (match && match[1] && match[2] !== undefined) {
        attrs[match[1].toLowerCase()] = match[2];
      }
    }

    pos = tagEnd + 1;

    const node: SimpleNode = {
      tag: tagName,
      attrs,
      children: [],
    };

    if (isSelfClosing) {
      return node;
    }

    // Đọc nội dung con hoặc text
    while (pos < cleanXml.length) {
      if (cleanXml.startsWith('</', pos)) {
        const closeEnd = cleanXml.indexOf('>', pos);
        pos = closeEnd === -1 ? cleanXml.length : closeEnd + 1;
        break;
      }

      if (cleanXml[pos] === '<') {
        const child = parseNode();
        if (child) {
          node.children.push(child);
        } else {
          pos++;
        }
      } else {
        const nextTag = cleanXml.indexOf('<', pos);
        const textChunk = nextTag === -1 ? cleanXml.slice(pos) : cleanXml.slice(pos, nextTag);
        pos = nextTag === -1 ? cleanXml.length : nextTag;
        if (textChunk) {
          node.text = (node.text ?? '') + textChunk;
        }
      }
    }

    return node;
  }

  const root = parseNode();
  return root ?? { tag: 'root', attrs: {}, children: [] };
}

function findChildrenByTag(node: SimpleNode, tag: string): SimpleNode[] {
  const normTag = tag.toLowerCase();
  return node.children.filter(c => c.tag === normTag || c.tag.endsWith(':' + normTag));
}

function findFirstChildByTag(node: SimpleNode, tag: string): SimpleNode | undefined {
  const list = findChildrenByTag(node, tag);
  return list[0];
}

/**
 * Chuyển đổi một node OMML sang chuỗi LaTeX
 */
function nodeToLatex(node: SimpleNode): string {
  const tag = node.tag.includes(':') ? node.tag.split(':')[1]! : node.tag;

  switch (tag) {
    case 'omath':
    case 'e':
    case 'num':
    case 'den':
    case 'sub':
    case 'sup': {
      return node.children.map(nodeToLatex).join('');
    }

    case 'omathpara': {
      const mathChildren = findChildrenByTag(node, 'omath');
      if (mathChildren.length > 1) {
        return `\\begin{aligned}${mathChildren.map(nodeToLatex).join(' \\\\ ')}\\end{aligned}`;
      }
      return node.children.map(nodeToLatex).join('');
    }

    case 'eqarr': {
      // Mảng phương trình m:eqArr gồm các phần tử m:e (mỗi m:e là 1 dòng trong hệ/mảng phương trình)
      const rows = findChildrenByTag(node, 'e').map(nodeToLatex);
      return `\\begin{aligned}${rows.join(' \\\\ ')}\\end{aligned}`;
    }

    case 'm': {
      // Ma trận m:m chứa các hàng m:mr, mỗi hàng chứa các ô m:e
      const mrList = findChildrenByTag(node, 'mr');
      const rows = mrList.map(mr => findChildrenByTag(mr, 'e').map(nodeToLatex).join(' & '));
      return `\\begin{matrix}${rows.join(' \\\\ ')}\\end{matrix}`;
    }

    case 'aln': {
      // Điểm căn lề trong hệ phương trình / mảng phương trình
      return '& ';
    }

    case 'r': {
      // Run: có thể chứa m:t hoặc m:rPr
      let text = '';
      for (const child of node.children) {
        const cTag = child.tag.includes(':') ? child.tag.split(':')[1]! : child.tag;
        if (cTag === 't') {
          text += child.text ?? '';
        } else {
          text += nodeToLatex(child);
        }
      }
      if (node.text) text += node.text;

      // Ánh xạ ký tự toán học
      let mapped = '';
      for (const ch of text) {
        if (SYMBOL_MAP[ch]) {
          mapped += SYMBOL_MAP[ch];
        } else {
          mapped += ch;
        }
      }
      return mapped;
    }

    case 't': {
      const text = node.text ?? '';
      let mapped = '';
      for (const ch of text) {
        mapped += SYMBOL_MAP[ch] ?? ch;
      }
      return mapped;
    }

    case 'f': {
      // Phân số: \frac{num}{den}
      const numNode = findFirstChildByTag(node, 'num');
      const denNode = findFirstChildByTag(node, 'den');
      const numStr = numNode ? nodeToLatex(numNode) : '';
      const denStr = denNode ? nodeToLatex(denNode) : '';
      return `\\frac{${numStr}}{${denStr}}`;
    }

    case 'ssup': {
      // Lũy thừa: {e}^{sup}
      const eNode = findFirstChildByTag(node, 'e');
      const supNode = findFirstChildByTag(node, 'sup');
      const eStr = eNode ? nodeToLatex(eNode) : '';
      const supStr = supNode ? nodeToLatex(supNode) : '';
      return `{${eStr}}^{${supStr}}`;
    }

    case 'ssub': {
      // Chỉ số dưới: {e}_{sub}
      const eNode = findFirstChildByTag(node, 'e');
      const subNode = findFirstChildByTag(node, 'sub');
      const eStr = eNode ? nodeToLatex(eNode) : '';
      const subStr = subNode ? nodeToLatex(subNode) : '';
      return `{${eStr}}_{${subStr}}`;
    }

    case 'ssubsup': {
      // Cả trên và dưới: {e}_{sub}^{sup}
      const eNode = findFirstChildByTag(node, 'e');
      const subNode = findFirstChildByTag(node, 'sub');
      const supNode = findFirstChildByTag(node, 'sup');
      const eStr = eNode ? nodeToLatex(eNode) : '';
      const subStr = subNode ? nodeToLatex(subNode) : '';
      const supStr = supNode ? nodeToLatex(supNode) : '';
      return `{${eStr}}_{${subStr}}^{${supStr}}`;
    }

    case 'rad': {
      // Căn thức: \sqrt{e} hoặc \sqrt[deg]{e}
      const radPr = findFirstChildByTag(node, 'radpr');
      const degHide = radPr && findFirstChildByTag(radPr, 'deghide');
      const degNode = findFirstChildByTag(node, 'deg');
      const eNode = findFirstChildByTag(node, 'e');
      const eStr = eNode ? nodeToLatex(eNode) : '';

      const degStr = degNode ? nodeToLatex(degNode).trim() : '';
      if (!degHide && degStr.length > 0) {
        return `\\sqrt[${degStr}]{${eStr}}`;
      }
      return `\\sqrt{${eStr}}`;
    }

    case 'nary': {
      // Toán tử n-ary: tích phân, tổng, tích
      const naryPr = findFirstChildByTag(node, 'narypr');
      const chrNode = naryPr && findFirstChildByTag(naryPr, 'chr');
      const chrVal = chrNode?.attrs['m:val'] ?? chrNode?.attrs['val'] ?? '∫';

      let op = '\\int';
      if (chrVal === '∑') op = '\\sum';
      else if (chrVal === '∏') op = '\\prod';

      const subNode = findFirstChildByTag(node, 'sub');
      const supNode = findFirstChildByTag(node, 'sup');
      const eNode = findFirstChildByTag(node, 'e');

      const subStr = subNode ? nodeToLatex(subNode) : '';
      const supStr = supNode ? nodeToLatex(supNode) : '';
      const eStr = eNode ? nodeToLatex(eNode) : '';

      let result = op;
      if (subStr) result += `_{${subStr}}`;
      if (supStr) result += `^{${supStr}}`;
      result += `{${eStr}}`;
      return result;
    }

    case 'd': {
      // Delimiters (dấu ngoặc đơn, ngoặc vuông, ngoặc nhọn hệ phương trình)
      const dPr = findFirstChildByTag(node, 'dpr');
      const begChr = dPr && findFirstChildByTag(dPr, 'begchr');
      const endChr = dPr && findFirstChildByTag(dPr, 'endchr');
      const sepChr = dPr && findFirstChildByTag(dPr, 'sepchr');

      const hasBegChr = Boolean(
        begChr && (begChr.attrs['m:val'] !== undefined || begChr.attrs['val'] !== undefined)
      );
      const hasEndChr = Boolean(
        endChr && (endChr.attrs['m:val'] !== undefined || endChr.attrs['val'] !== undefined)
      );

      const beg = hasBegChr
        ? (begChr?.attrs['m:val'] ?? begChr?.attrs['val'] ?? '')
        : dPr
          ? ''
          : '(';
      const end = hasEndChr
        ? (endChr?.attrs['m:val'] ?? endChr?.attrs['val'] ?? '')
        : dPr
          ? ''
          : ')';
      const sep = sepChr?.attrs['m:val'] ?? sepChr?.attrs['val'] ?? '';

      const eNodes = findChildrenByTag(node, 'e');

      // Hàm trích xuất các dòng nếu m:e chứa m:eqArr hoặc m:m
      const extractSubRows = (eNode: SimpleNode): string[] | null => {
        const eqArr = findFirstChildByTag(eNode, 'eqarr');
        if (eqArr) {
          const rows = findChildrenByTag(eqArr, 'e').map(nodeToLatex);
          return rows.length > 0 ? rows : null;
        }
        const mNode = findFirstChildByTag(eNode, 'm');
        if (mNode) {
          const mrList = findChildrenByTag(mNode, 'mr');
          const rows = mrList.map(mr => findChildrenByTag(mr, 'e').map(nodeToLatex).join(' & '));
          return rows.length > 0 ? rows : null;
        }
        return null;
      };

      // 1. Hệ phương trình có dấu ngoặc nhọn { ở đầu và không có dấu đóng ngoặc ở cuối (hoặc đóng ngoặc rỗng)
      if (beg === '{' && (end === '' || end === '}')) {
        // Nhiều thẻ m:e trực tiếp trong m:d
        if (eNodes.length > 1) {
          return `\\begin{cases}${eNodes.map(nodeToLatex).join(' \\\\ ')}\\end{cases}`;
        }
        // Một thẻ m:e nhưng bên trong chứa m:eqArr hoặc m:m
        if (eNodes.length === 1) {
          const subRows = extractSubRows(eNodes[0]!);
          if (subRows && subRows.length > 1) {
            return `\\begin{cases}${subRows.join(' \\\\ ')}\\end{cases}`;
          }
        }
        // Trường hợp chỉ có 1 biểu thức bên trong ngoặc nhọn đơn
        if (end === '') {
          return `\\left\\{${eNodes[0] ? nodeToLatex(eNodes[0]) : ''}\\right.`;
        }
      }

      // 2. Tuyển các nghiệm hoặc dấu ngoặc vuông [ không có đóng ngoặc
      if (beg === '[' && end === '') {
        if (eNodes.length > 1) {
          return `\\left[\\begin{matrix}${eNodes.map(nodeToLatex).join(' \\\\ ')}\\end{matrix}\\right.`;
        }
        if (eNodes.length === 1) {
          const subRows = extractSubRows(eNodes[0]!);
          if (subRows && subRows.length > 1) {
            return `\\left[\\begin{matrix}${subRows.join(' \\\\ ')}\\end{matrix}\\right.`;
          }
        }
        return `\\left[${eNodes[0] ? nodeToLatex(eNodes[0]) : ''}\\right.`;
      }

      // 3. Dấu ngoặc thông thường
      let left = `\\left${beg}`;
      let right = `\\right${end}`;

      if (beg === '{') left = '\\left\\{';
      if (end === '}') right = '\\right\\}';
      if (beg === '') left = '\\left.';
      if (end === '') right = '\\right.';

      const sepStr = sep ? (sep === ';' ? '; ' : `${sep} `) : ', ';
      const content =
        eNodes.length > 1
          ? eNodes.map(nodeToLatex).join(sepStr)
          : eNodes[0]
            ? nodeToLatex(eNodes[0])
            : node.children.map(nodeToLatex).join('');

      return `${left}${content}${right}`;
    }

    case 'bar': {
      // Gạch đầu: \overline{e}
      const eNode = findFirstChildByTag(node, 'e');
      const eStr = eNode ? nodeToLatex(eNode) : '';
      return `\\overline{${eStr}}`;
    }

    case 'limlow': {
      // Giới hạn dưới: \lim_{sub}{e}
      const eNode = findFirstChildByTag(node, 'e');
      const subNode = findFirstChildByTag(node, 'lim');
      const eStr = eNode ? nodeToLatex(eNode) : '';
      const subStr = subNode ? nodeToLatex(subNode) : '';
      return `\\lim_{${subStr}}{${eStr}}`;
    }

    default: {
      return node.children.map(nodeToLatex).join('');
    }
  }
}

/**
 * Chuyển đổi một đoạn XML OMML (thẻ <m:oMath> hoặc <m:oMathPara>) sang chuỗi LaTeX
 */
export function convertOmmlToLatex(ommlXml: string): string {
  if (!ommlXml || !ommlXml.trim()) return '';
  const root = parseSimpleXml(ommlXml);
  return nodeToLatex(root);
}

/**
 * Thay thế tất cả các phần tử <m:oMathPara> và <m:oMath> trong file document.xml bằng text node $latex$
 */
export function replaceOmmlInXml(documentXml: string): string {
  // 1. Xử lý các khối hiển thị riêng m:oMathPara -> $$latex$$
  let result = documentXml.replace(/<m:oMathPara[\s\S]*?<\/m:oMathPara>/gi, match => {
    const latex = convertOmmlToLatex(match).trim();
    if (!latex) return '';
    return `<w:r><w:t>$$${latex}$$</w:t></w:r>`;
  });

  // 2. Xử lý các khối inline m:oMath -> $latex$
  result = result.replace(/<m:oMath[\s\S]*?<\/m:oMath>/gi, match => {
    const latex = convertOmmlToLatex(match).trim();
    if (!latex) return '';
    return `<w:r><w:t>$${latex}$</w:t></w:r>`;
  });

  return result;
}
