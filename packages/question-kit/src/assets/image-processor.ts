export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface CompressedImageResult {
  blob: Blob;
  sha256: string;
  width: number;
  height: number;
  mime: string;
}

/**
 * Calculates SHA-256 hash (hex string) for an ArrayBuffer or Uint8Array.
 * Works seamlessly in both browser (Web Crypto) and Node.js environments.
 */
export async function calculateSha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js fallback
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Safely extracts ArrayBuffer from a Blob or File.
 * Compatible with modern browsers, Node.js, and jsdom test environment.
 */
export async function getBlobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Không thể đọc dữ liệu file'));
      reader.readAsArrayBuffer(blob);
    });
  }

  throw new Error('Môi trường không hỗ trợ đọc ArrayBuffer từ Blob');
}

/**
 * Converts a Blob to a base64 Data URL for instant rendering / preview.
 */
export async function fileToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Không thể chuyển đổi ảnh thành Data URL'));
      reader.readAsDataURL(blob);
    });
  }

  const buffer = await getBlobArrayBuffer(blob);
  let base64 = '';
  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(buffer).toString('base64');
  } else {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    base64 = btoa(binary);
  }
  const mime = blob.type || 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

/**
 * Compresses an image client-side via HTML5 Canvas (if available) to save bandwidth and storage.
 * Falls back to computing hash directly if canvas is unavailable (e.g. Node tests).
 */
export async function compressImage(
  fileOrBlob: Blob,
  options: CompressOptions = {}
): Promise<CompressedImageResult> {
  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;
  const format = options.format ?? (fileOrBlob.type === 'image/png' ? 'image/png' : 'image/jpeg');

  // Check if browser DOM Canvas is available (and not jsdom headless test environment)
  const isJsdom =
    typeof navigator !== 'undefined' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.includes('jsdom');

  const hasDomCanvas =
    typeof document !== 'undefined' && typeof document.createElement === 'function' && !isJsdom;

  if (!hasDomCanvas) {
    // Non-DOM or test environment fallback
    const buffer = await getBlobArrayBuffer(fileOrBlob);
    const hash = await calculateSha256(buffer);
    return {
      blob: fileOrBlob,
      sha256: hash,
      width: 0,
      height: 0,
      mime: fileOrBlob.type || format,
    };
  }

  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(fileOrBlob);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // If cannot get 2d context, fallback to original
        const buffer = await getBlobArrayBuffer(fileOrBlob);
        const hash = await calculateSha256(buffer);
        return resolve({
          blob: fileOrBlob,
          sha256: hash,
          width,
          height,
          mime: fileOrBlob.type || format,
        });
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        async compressedBlob => {
          if (!compressedBlob) {
            return reject(new Error('Nén ảnh thất bại'));
          }

          const buffer = await getBlobArrayBuffer(compressedBlob);
          const hash = await calculateSha256(buffer);

          resolve({
            blob: compressedBlob,
            sha256: hash,
            width,
            height,
            mime: compressedBlob.type,
          });
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể tải dữ liệu ảnh để xử lý'));
    };

    img.src = objectUrl;
  });
}

/**
 * Extracts image files from clipboard data transfer.
 */
export function extractImagesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];

  const images: File[] = [];

  // Check items first (handles clipboard paste)
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (item && item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) images.push(file);
      }
    }
  }

  // If no items, fallback to files (handles drag & drop)
  if (images.length === 0 && dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      if (file && file.type.startsWith('image/')) {
        images.push(file);
      }
    }
  }

  return images;
}
