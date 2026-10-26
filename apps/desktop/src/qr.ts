import QRCode from 'qrcode';

/**
 * Tạo mã QR dưới dạng Data URL (base64 PNG) để hiển thị trong app Desktop
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 256,
    margin: 2,
    color: {
      dark: '#1E293B',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Tạo mã QR dưới dạng chuỗi SVG
 */
export async function generateQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#1E293B',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}
