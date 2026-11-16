/**
 * Returns true if the icon string represents an image URL, data URI, or local path
 * rather than an inline emoji character.
 */
export function isImageUrl(val: string): boolean {
  return (
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('data:image/') ||
    val.startsWith('/')
  );
}

export interface OptimizedImagePayload {
  dataBase64: string;
  mimeType: string;
  filename: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao ler arquivo de imagem.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Erro ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales and compresses large raster cover images client-side (max 1920px wide, WebP)
 * so huge user-uploaded photos load instantaneously without lag or payload rejections.
 */
export async function optimizeCoverImageForUpload(
  file: File,
  maxWidth = 1920,
): Promise<OptimizedImagePayload> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const rawMime = (file.type || 'image/png').toLowerCase();
  const isCompressibleRaster =
    rawMime === 'image/jpeg' ||
    rawMime === 'image/jpg' ||
    rawMime === 'image/png' ||
    rawMime === 'image/webp';

  if (
    !isCompressibleRaster ||
    typeof document === 'undefined' ||
    typeof Image === 'undefined'
  ) {
    return {
      dataBase64: rawDataUrl,
      mimeType: rawMime,
      filename: file.name,
    };
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Falha ao decodificar imagem.'));
      el.src = rawDataUrl;
    });

    const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
    const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { dataBase64: rawDataUrl, mimeType: rawMime, filename: file.name };
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);
    const webpDataUrl = canvas.toDataURL('image/webp', 0.86);

    if (webpDataUrl.startsWith('data:image/webp') && webpDataUrl.length < rawDataUrl.length) {
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'cover';
      return {
        dataBase64: webpDataUrl,
        mimeType: 'image/webp',
        filename: `${baseName}.webp`,
      };
    }
  } catch {
    // Fall back to original payload if canvas encoding is unavailable
  }

  return {
    dataBase64: rawDataUrl,
    mimeType: rawMime,
    filename: file.name,
  };
}
