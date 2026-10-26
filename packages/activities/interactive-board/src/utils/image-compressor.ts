/**
 * Tiện ích nén ảnh phía Client (Client-side Image Compressor)
 * Tự động thu nhỏ ảnh chụp từ điện thoại về kích thước tối đa 1280px
 * và nén chất lượng JPEG/WebP để đảm bảo tải cực nhanh qua mạng LAN (<200KB)
 */
export async function compressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.75
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Không thể đọc file ảnh từ thiết bị'));
    };

    reader.onload = (event) => {
      const srcUrl = event.target?.result as string;
      if (!srcUrl) {
        reject(new Error('Dữ liệu ảnh rỗng'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        reject(new Error('File không phải định dạng ảnh hợp lệ'));
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Tính toán tỉ lệ co giãn để giữ nguyên tỷ lệ khung hình
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Trình duyệt không hỗ trợ Canvas 2D'));
          return;
        }

        // Vẽ nền trắng để tránh ảnh PNG trong suốt bị đen khi chuyển sang JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất ảnh nén JPEG nhẹ
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
        });
      };

      img.src = srcUrl;
    };

    reader.readAsDataURL(file);
  });
}
