import type { DigitLensInput, DigitLensOptions } from '../types/api';
import type { DecodedImage } from '../types/internal';

export async function decodeInput(
  input: DigitLensInput,
  _options: DigitLensOptions = {}
): Promise<DecodedImage> {
  if (typeof File !== 'undefined' && input instanceof File) {
    return decodeBytes(new Uint8Array(await input.arrayBuffer()), input.type || null, 'file');
  }

  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    return decodeBytes(new Uint8Array(await input.arrayBuffer()), input.type || null, 'blob');
  }

  if (input instanceof ArrayBuffer) {
    return decodeBytes(new Uint8Array(input), null, 'array-buffer');
  }

  if (input instanceof Uint8Array) {
    return decodeBytes(input, null, 'uint8-array');
  }

  if (isBase64Input(input)) {
    return decodeBytes(decodeBase64(input.base64), input.mimeType ?? null, 'base64');
  }

  throw new Error('DIGIT_LENS_INVALID_INPUT');
}

function isBase64Input(input: DigitLensInput): input is { base64: string; mimeType?: string } {
  return (
    typeof input === 'object' &&
    input !== null &&
    'base64' in input &&
    typeof input.base64 === 'string'
  );
}

function decodeBase64(base64: string): Uint8Array {
  const normalized = base64.includes(',') ? (base64.split(',').at(-1) ?? '') : base64;

  if (typeof atob === 'function') {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  const buffer = Buffer.from(normalized, 'base64');
  return new Uint8Array(buffer);
}

async function decodeBytes(
  rawBytes: Uint8Array,
  mimeType: string | null,
  sourceKind: DecodedImage['sourceKind']
): Promise<DecodedImage> {
  if (rawBytes.length === 0) {
    throw new Error('DIGIT_LENS_INVALID_INPUT');
  }

  try {
    const decodedBitmap = await decodeBitmap(rawBytes, mimeType);

    return {
      width: decodedBitmap.width,
      height: decodedBitmap.height,
      mimeType,
      sourceKind,
      rawBytes,
      rgba: decodedBitmap.rgba,
    };
  } catch {
    throw new Error('DIGIT_LENS_INVALID_INPUT');
  }
}

async function decodeBitmap(
  rawBytes: Uint8Array,
  mimeType: string | null
): Promise<{ width: number; height: number; rgba: Uint8Array }> {
  if (typeof createImageBitmap === 'function' && typeof Blob !== 'undefined') {
    return decodeWithBrowserPrimitives(rawBytes, mimeType);
  }

  return decodeWithJimp(rawBytes);
}

async function decodeWithBrowserPrimitives(
  rawBytes: Uint8Array,
  mimeType: string | null
): Promise<{ width: number; height: number; rgba: Uint8Array }> {
  const blob = new Blob([toArrayBuffer(rawBytes)], {
    type: mimeType ?? 'image/png',
  });
  const bitmap = await createImageBitmap(blob);

  try {
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('DIGIT_LENS_INVALID_INPUT');
    }

    context.drawImage(bitmap, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);

    return {
      width,
      height,
      rgba: Uint8Array.from(imageData.data),
    };
  } finally {
    bitmap.close();
  }
}

async function decodeWithJimp(
  rawBytes: Uint8Array
): Promise<{ width: number; height: number; rgba: Uint8Array }> {
  const { Jimp } = await loadJimpModule();
  const image = await Jimp.read(Buffer.from(rawBytes));

  return {
    width: image.bitmap.width,
    height: image.bitmap.height,
    rgba: Uint8Array.from(image.bitmap.data),
  };
}

async function loadJimpModule(): Promise<{
  Jimp: {
    read(input: Buffer): Promise<{ bitmap: { width: number; height: number; data: Uint8Array } }>;
  };
}> {
  const specifier = 'jimp';
  return import(
    /* @vite-ignore */
    specifier
  ) as Promise<{
    Jimp: {
      read(input: Buffer): Promise<{ bitmap: { width: number; height: number; data: Uint8Array } }>;
    };
  }>;
}

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  throw new Error('DIGIT_LENS_INVALID_INPUT');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}
