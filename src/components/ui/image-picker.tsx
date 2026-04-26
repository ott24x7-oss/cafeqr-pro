'use client';

import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export interface ImagePickerProps {
  /** Current value — URL or data URL. */
  value?: string | null;
  /** Called with the new URL/data URL, or '' when cleared. */
  onChange: (next: string) => void;
  /** Aspect ratio for preview frame. Default 1 (square logo). */
  aspect?: 'square' | 'cover';
  /** Max output dimension in pixels. Logo: 256, cover: 1600. */
  maxSize?: number;
  /** Output JPEG quality (0..1). Default 0.86. */
  quality?: number;
  /** Optional placeholder text. */
  placeholder?: string;
  /** Optional helper text under the input. */
  hint?: string;
}

export function ImagePicker({
  value,
  onChange,
  aspect = 'square',
  maxSize = 256,
  quality = 0.86,
  placeholder = 'Upload image',
  hint,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Image too large (max 12MB)');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, { maxSize, quality, mode: aspect === 'square' ? 'cover-square' : 'fit-contain' });
      onChange(dataUrl);
    } catch (e: any) {
      setError(e?.message ?? 'Could not process image');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function clear() {
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const hasImage = !!value;

  return (
    <div className="space-y-2">
      <div
        className={`relative rounded-2xl border-2 border-dashed border-coffee-200 bg-cream-50 overflow-hidden ${
          aspect === 'cover' ? 'aspect-[16/6]' : 'aspect-square w-32'
        }`}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value!} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-coffee-400">
            <div className="text-center">
              <ImageIcon className="h-6 w-6 mx-auto" />
              <div className="text-[11px] mt-1">{placeholder}</div>
            </div>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
        {hasImage && !busy && (
          <button
            onClick={clear}
            type="button"
            className="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-full bg-white/90 hover:bg-white text-rose-600 shadow"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-coffee-200 bg-white hover:bg-cream-50 text-sm text-coffee-800"
          disabled={busy}
        >
          <Upload className="h-3.5 w-3.5" />
          {hasImage ? 'Replace' : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
          }}
        />
      </div>
      {hint && <p className="text-[11px] text-coffee-500">{hint}</p>}
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

interface ResizeOpts {
  maxSize: number;
  quality: number;
  mode: 'cover-square' | 'fit-contain';
}

function fileToResizedDataUrl(file: File, opts: ResizeOpts): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image decode failed'));
      img.onload = () => {
        try {
          const url = drawToCanvas(img, opts);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function drawToCanvas(img: HTMLImageElement, { maxSize, quality, mode }: ResizeOpts): string {
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;

  let canvas = document.createElement('canvas');
  let dw: number, dh: number, sx = 0, sy = 0, sCropW = sw, sCropH = sh;

  if (mode === 'cover-square') {
    // Square crop, output maxSize × maxSize.
    const side = Math.min(sw, sh);
    sx = Math.round((sw - side) / 2);
    sy = Math.round((sh - side) / 2);
    sCropW = side;
    sCropH = side;
    dw = dh = Math.min(maxSize, side);
  } else {
    // Fit contain: scale longer side to maxSize, no crop.
    const ratio = Math.min(maxSize / sw, maxSize / sh, 1);
    dw = Math.round(sw * ratio);
    dh = Math.round(sh * ratio);
  }

  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sCropW, sCropH, 0, 0, dw, dh);

  // Always emit JPEG for size; if input had alpha (PNG with transparency) the
  // background becomes white, which is fine for cafe logos/banners.
  return canvas.toDataURL('image/jpeg', quality);
}
