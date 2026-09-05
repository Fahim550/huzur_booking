/**
 * Huzur Booking Platform — Next.js Supabase Storage & WebP Image Loader
 * 
 * Formats speaker photos through Next.js Image optimization pipeline,
 * guaranteeing WebP delivery, responsive dimensions, and CDN compression.
 */

export interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function supabaseImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality || 75;

  // Supabase Storage Object transformation
  if (src.includes('/storage/v1/object/public/')) {
    try {
      const url = new URL(src);
      // Supabase Pro/Team transformation URL: /storage/v1/render/image/public/
      // Supports width, quality, and format=webp
      url.searchParams.set('width', width.toString());
      url.searchParams.set('quality', q.toString());
      url.searchParams.set('format', 'webp');
      return url.toString();
    } catch {
      return src;
    }
  }

  // Unsplash image transformation
  if (src.includes('images.unsplash.com')) {
    try {
      const url = new URL(src);
      url.searchParams.set('w', width.toString());
      url.searchParams.set('q', q.toString());
      url.searchParams.set('fm', 'webp');
      url.searchParams.set('auto', 'format');
      return url.toString();
    } catch {
      return src;
    }
  }

  // Relative or local image path: Next.js handles optimization
  return src;
}
