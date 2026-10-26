import { describe, expect, it } from 'vitest';
import { generateQrDataUrl, generateQrSvg } from '../qr.js';

describe('QR Code Generation', () => {
  it('generates a valid data URL base64 image for an access URL', async () => {
    const url = 'http://192.168.1.50:3000';
    const dataUrl = await generateQrDataUrl(url);

    expect(typeof dataUrl).toBe('string');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it('generates valid SVG markup for an access URL', async () => {
    const url = 'http://192.168.1.50:3000';
    const svg = await generateQrSvg(url);

    expect(typeof svg).toBe('string');
    expect(svg.includes('<svg')).toBe(true);
    expect(svg.includes('</svg>')).toBe(true);
  });
});
