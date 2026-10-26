import { describe, it, expect } from 'vitest';
import {
  calculateSha256,
  compressImage,
  extractImagesFromDataTransfer,
  fileToDataUrl,
} from '../assets/image-processor.js';

describe('Image Processor & Hash', () => {
  it('calculates deterministic SHA-256 for string/bytes', async () => {
    const encoder = new TextEncoder();
    const data1 = encoder.encode('hello world educlass');
    const hash1 = await calculateSha256(data1);

    const data2 = encoder.encode('hello world educlass');
    const hash2 = await calculateSha256(data2);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('calculates different hash for different contents', async () => {
    const encoder = new TextEncoder();
    const hash1 = await calculateSha256(encoder.encode('image-chunk-1'));
    const hash2 = await calculateSha256(encoder.encode('image-chunk-2'));

    expect(hash1).not.toBe(hash2);
  });

  it('processes image blob and returns sha256 and metadata', async () => {
    const fakeData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // png magic
    const blob = new Blob([fakeData], { type: 'image/png' });

    const result = await compressImage(blob, { maxWidth: 800, quality: 0.8 });
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.mime).toBe('image/png');
    expect(result.blob).toBeDefined();
  });

  it('converts blob to data url for instant offline preview', async () => {
    const textData = new TextEncoder().encode('fake-image-bytes');
    const blob = new Blob([textData], { type: 'image/jpeg' });

    const dataUrl = await fileToDataUrl(blob);
    expect(dataUrl).toContain('data:image/jpeg;base64,');
  });

  it('extracts images from clipboard items', () => {
    const imageFile = new File(['fake-png'], 'test.png', { type: 'image/png' });
    const textFile = new File(['text'], 'test.txt', { type: 'text/plain' });

    const fakeDataTransfer = {
      items: [
        {
          kind: 'file',
          type: 'image/png',
          getAsFile: () => imageFile,
        },
        {
          kind: 'file',
          type: 'text/plain',
          getAsFile: () => textFile,
        },
      ],
      files: [],
    } as unknown as DataTransfer;

    const extracted = extractImagesFromDataTransfer(fakeDataTransfer);
    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.name).toBe('test.png');
  });

  it('extracts images from drag-and-drop file list fallback', () => {
    const imageFile = new File(['fake-jpg'], 'photo.jpg', { type: 'image/jpeg' });
    const pdfFile = new File(['fake-pdf'], 'doc.pdf', { type: 'application/pdf' });

    const fakeDataTransfer = {
      items: [],
      files: [imageFile, pdfFile],
    } as unknown as DataTransfer;

    const extracted = extractImagesFromDataTransfer(fakeDataTransfer);
    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.name).toBe('photo.jpg');
  });
});
