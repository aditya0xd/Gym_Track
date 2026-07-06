"use client";

import {
  ALLOWED_IMAGE_TYPE_SET,
  RAW_FILE_MAX_BYTES,
} from "./config";
import type {
  ImageProcessingOptions,
  ImageWorkerRequest,
  ImageWorkerResponse,
  PixelCrop,
  ProcessedImageResult,
} from "./types";

const WORKER_TIMEOUT_MS = 30_000;
const JPEG_MIME = "image/jpeg";

type LoadedImageSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sourceRect(width: number, height: number, crop: PixelCrop | undefined) {
  if (!crop) {
    return { x: 0, y: 0, width, height };
  }

  const x = clamp(Math.round(crop.x), 0, width - 1);
  const y = clamp(Math.round(crop.y), 0, height - 1);
  const cropWidth = clamp(Math.round(crop.width), 1, width - x);
  const cropHeight = clamp(Math.round(crop.height), 1, height - y);

  return { x, y, width: cropWidth, height: cropHeight };
}

function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPE_SET.has(file.type)) {
    throw new Error("UNSUPPORTED_IMAGE_TYPE");
  }

  if (file.size > RAW_FILE_MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
}

function canUseWorker() {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap === "function"
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("ENCODE_FAILED"));
    reader.readAsDataURL(blob);
  });
}

async function loadImageSource(file: File): Promise<LoadedImageSource> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("CANVAS_UNSUPPORTED"));
    img.src = objectUrl;
  });

  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    close: () => URL.revokeObjectURL(objectUrl),
  };
}

async function processImageOnMainThread(
  file: File,
  options: ImageProcessingOptions,
): Promise<ProcessedImageResult> {
  const image = await loadImageSource(file);
  try {
    const src = sourceRect(image.width, image.height, options.crop);
    const scale = Math.min(1, options.maxDim / Math.max(src.width, src.height));
    const outputWidth = Math.max(1, Math.round(src.width * scale));
    const outputHeight = Math.max(1, Math.round(src.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CANVAS_UNSUPPORTED");

    ctx.drawImage(
      image.source,
      src.x,
      src.y,
      src.width,
      src.height,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("ENCODE_FAILED")),
        JPEG_MIME,
        options.quality,
      );
    });

    if (blob.size > options.maxBytes) {
      throw new Error("OUTPUT_TOO_LARGE");
    }

    return {
      dataUrl: await blobToDataUrl(blob),
      byteLength: blob.size,
      mime: JPEG_MIME,
    };
  } finally {
    image.close();
  }
}

function processImageInWorker(
  file: File,
  options: ImageProcessingOptions,
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./image-worker.ts", import.meta.url), {
      type: "module",
    });
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      worker.terminate();
      callback();
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("WORKER_TIMEOUT")));
    }, WORKER_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<ImageWorkerResponse>) => {
      finish(() => {
        if (event.data.ok) {
          resolve({
            dataUrl: event.data.dataUrl,
            byteLength: event.data.byteLength,
            mime: event.data.mime,
          });
        } else {
          reject(new Error(event.data.error));
        }
      });
    };

    worker.onerror = () => {
      finish(() => reject(new Error("WORKER_FAILED")));
    };

    const request: ImageWorkerRequest = {
      file,
      options: {
        maxDim: options.maxDim,
        quality: options.quality,
        maxBytes: options.maxBytes,
        crop: options.crop,
      },
    };
    worker.postMessage(request);
  });
}

export async function processImage(
  file: File,
  options: ImageProcessingOptions,
): Promise<ProcessedImageResult> {
  validateImageFile(file);

  if (canUseWorker()) {
    try {
      return await processImageInWorker(file, options);
    } catch (err) {
      if (err instanceof Error && err.message === "OUTPUT_TOO_LARGE") {
        throw err;
      }
    }
  }

  return processImageOnMainThread(file, options);
}

export function imageErrorMessage(err: unknown, label: string): string {
  if (err instanceof Error && err.message === "UNSUPPORTED_IMAGE_TYPE") {
    return `${label} must be a JPEG, PNG, or WebP image.`;
  }
  if (err instanceof Error && err.message === "FILE_TOO_LARGE") {
    return `${label} is too large - please choose a smaller image.`;
  }
  if (err instanceof Error && err.message === "OUTPUT_TOO_LARGE") {
    return `${label} is still too large after compression.`;
  }
  if (err instanceof Error && err.message === "CANVAS_UNSUPPORTED") {
    return "Your device doesn't support image processing. Try a different browser.";
  }
  if (err instanceof Error && err.message === "WORKER_TIMEOUT") {
    return `Could not process ${label.toLowerCase()} before the timeout.`;
  }
  return `Could not process ${label.toLowerCase()} on this device.`;
}
