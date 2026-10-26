import { describe, expect, it } from 'vitest';
import { convertOmmlToLatex, replaceOmmlInXml } from '../word/omml-to-latex.js';

describe('OMML to LaTeX Converter (Task 2.4)', () => {
  it('converts basic text and operators in OMML', () => {
    const omml = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:r><m:t>x</m:t></m:r>
        <m:r><m:t>+</m:t></m:r>
        <m:r><m:t>y</m:t></m:r>
        <m:r><m:t>=</m:t></m:r>
        <m:r><m:t>0</m:t></m:r>
      </m:oMath>
    `;
    const latex = convertOmmlToLatex(omml);
    expect(latex.trim()).toBe('x+y=0');
  });

  it('converts fraction (m:f) to \\frac{num}{den}', () => {
    const omml = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:f>
          <m:num><m:r><m:t>1</m:t></m:r></m:num>
          <m:den><m:r><m:t>2</m:t></m:r></m:den>
        </m:f>
      </m:oMath>
    `;
    const latex = convertOmmlToLatex(omml);
    expect(latex.trim()).toBe('\\frac{1}{2}');
  });

  it('converts superscript (m:sSup) to {base}^{sup}', () => {
    const omml = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:sSup>
          <m:e><m:r><m:t>x</m:t></m:r></m:e>
          <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
        </m:sSup>
      </m:oMath>
    `;
    const latex = convertOmmlToLatex(omml);
    expect(latex.trim()).toBe('{x}^{2}');
  });

  it('converts subscript (m:sSub) to {base}_{sub}', () => {
    const omml = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:sSub>
          <m:e><m:r><m:t>x</m:t></m:r></m:e>
          <m:sub><m:r><m:t>1</m:t></m:r></m:sub>
        </m:sSub>
      </m:oMath>
    `;
    const latex = convertOmmlToLatex(omml);
    expect(latex.trim()).toBe('{x}_{1}');
  });

  it('converts square root and n-th root (m:rad)', () => {
    const sqrtOmml = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:rad>
          <m:radPr><m:degHide m:val="on"/></m:radPr>
          <m:deg/>
          <m:e><m:r><m:t>x</m:t></m:r></m:e>
        </m:rad>
      </m:oMath>
    `;
    expect(convertOmmlToLatex(sqrtOmml).trim()).toBe('\\sqrt{x}');

    const nthRootOmml = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:rad>
          <m:deg><m:r><m:t>3</m:t></m:r></m:deg>
          <m:e><m:r><m:t>8</m:t></m:r></m:e>
        </m:rad>
      </m:oMath>
    `;
    expect(convertOmmlToLatex(nthRootOmml).trim()).toBe('\\sqrt[3]{8}');
  });

  it('converts integral and summation (m:nary)', () => {
    const integralOmml = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:nary>
          <m:naryPr><m:chr m:val="∫"/></m:naryPr>
          <m:sub><m:r><m:t>0</m:t></m:r></m:sub>
          <m:sup><m:r><m:t>1</m:t></m:r></m:sup>
          <m:e><m:r><m:t>x</m:t></m:r><m:r><m:t>dx</m:t></m:r></m:e>
        </m:nary>
      </m:oMath>
    `;
    const latex = convertOmmlToLatex(integralOmml);
    expect(latex.trim()).toBe('\\int_{0}^{1}{xdx}');
  });

  it('converts delimiters (m:d) like parentheses', () => {
    const delimOmml = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:d>
          <m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr>
          <m:e><m:r><m:t>a</m:t></m:r><m:r><m:t>+</m:t></m:r><m:r><m:t>b</m:t></m:r></m:e>
        </m:d>
      </m:oMath>
    `;
    const latex = convertOmmlToLatex(delimOmml);
    expect(latex.trim()).toBe('\\left(a+b\\right)');
  });

  it('converts common math symbols like ±, ×, ≤, ≥, π', () => {
    const symbolsOmml = `
      <m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:r><m:t>±</m:t></m:r>
        <m:r><m:t>π</m:t></m:r>
        <m:r><m:t>≤</m:t></m:r>
        <m:r><m:t>α</m:t></m:r>
      </m:oMath>
    `;
    const latex = convertOmmlToLatex(symbolsOmml);
    expect(latex).toContain('\\pm');
    expect(latex).toContain('\\pi');
    expect(latex).toContain('\\le');
    expect(latex).toContain('\\alpha');
  });

  it('replaces all oMath blocks in document.xml with $latex$', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <w:r><w:t>Cho phương trình </w:t></w:r>
        <m:oMath>
          <m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup>
          <m:r><m:t>-</m:t></m:r>
          <m:r><m:t>4</m:t></m:r>
          <m:r><m:t>=</m:t></m:r>
          <m:r><m:t>0</m:t></m:r>
        </m:oMath>
        <w:r><w:t>. Tìm nghiệm.</w:t></w:r>
      </w:p>
    `;
    const replaced = replaceOmmlInXml(xml);
    expect(replaced).toContain('Cho phương trình');
    expect(replaced).toContain('${x}^{2}-4=0$');
    expect(replaced).toContain('. Tìm nghiệm.');
  });
});
