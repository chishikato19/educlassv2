import QRCode from 'qrcode';

export class QrService {
  /**
   * Tạo DataURL hình ảnh mã QR (dạng base64 PNG) để hiển thị trực tiếp trên giao diện
   */
  async generateQrDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }
}
