/**
 * Client-side image resize and compression utility.
 * Optimizes mobile camera uploads before uploading to Supabase Storage,
 * ensuring fast transfers even on rural 2G/3G connections in Bangladesh.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  mimeType?: string;
}

export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  // If running in SSR environment, return original file
  if (typeof window === 'undefined') {
    return {
      file,
      previewUrl: '',
      originalSize: file.size,
      compressedSize: file.size,
      width: 0,
      height: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to decode image'));

      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio preserving downscaled dimensions
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
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        // Draw with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'));
              return;
            }

            const cleanFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanFileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: compressedFile,
              previewUrl,
              originalSize: file.size,
              compressedSize: blob.size,
              width,
              height,
            });
          },
          mimeType,
          quality
        );
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human-readable KB/MB string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
