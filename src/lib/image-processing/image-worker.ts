import type { ImageWorkerRequest, ImageWorkerResponse } from "./types";

const JPEG_MIME = "image/jpeg";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sourceRect(
  width: number,
  height: number,
  crop: ImageWorkerRequest["options"]["crop"],
) {
  if (!crop) {
    return { x: 0, y: 0, width, height };
  }

  const x = clamp(Math.round(crop.x), 0, width - 1);
  const y = clamp(Math.round(crop.y), 0, height - 1);
  const cropWidth = clamp(Math.round(crop.width), 1, width - x);
  const cropHeight = clamp(Math.round(crop.height), 1, height - y);

  return { x, y, width: cropWidth, height: cropHeight };
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];

  for (let i = 0; i < bytes.length; i += chunkSize) {
    let chunk = "";
    const end = Math.min(i + chunkSize, bytes.length);
    for (let j = i; j < end; j += 1) {
      chunk += String.fromCharCode(bytes[j]);
    }
    chunks.push(chunk);
  }

  return btoa(chunks.join(""));
}

self.onmessage = async (event: MessageEvent<ImageWorkerRequest>) => {
  try {
    const { file, options } = event.data;

    if (typeof createImageBitmap !== "function") {
      throw new Error("CANVAS_UNSUPPORTED");
    }
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("CANVAS_UNSUPPORTED");
    }

    const bitmap = await createImageBitmap(file);
    try {
      const src = sourceRect(bitmap.width, bitmap.height, options.crop);
      const scale = Math.min(1, options.maxDim / Math.max(src.width, src.height));
      const outputWidth = Math.max(1, Math.round(src.width * scale));
      const outputHeight = Math.max(1, Math.round(src.height * scale));

      const canvas = new OffscreenCanvas(outputWidth, outputHeight);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("CANVAS_UNSUPPORTED");

      ctx.drawImage(
        bitmap,
        src.x,
        src.y,
        src.width,
        src.height,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const blob = await canvas.convertToBlob({
        type: JPEG_MIME,
        quality: options.quality,
      });

      if (blob.size > options.maxBytes) {
        throw new Error("OUTPUT_TOO_LARGE");
      }

      const buffer = await blob.arrayBuffer();
      const response: ImageWorkerResponse = {
        ok: true,
        dataUrl: `data:${JPEG_MIME};base64,${bufferToBase64(buffer)}`,
        byteLength: buffer.byteLength,
        mime: JPEG_MIME,
      };
      self.postMessage(response);
    } finally {
      bitmap.close();
    }
  } catch (err) {
    const response: ImageWorkerResponse = {
      ok: false,
      error: err instanceof Error ? err.message : "UNKNOWN_IMAGE_ERROR",
    };
    self.postMessage(response);
  }
};

export {};
