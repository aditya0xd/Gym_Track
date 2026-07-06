import type { IMAGE_PROCESSING_PRESETS } from "./config";

export type ImagePurpose = keyof typeof IMAGE_PROCESSING_PRESETS;

export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageProcessingOptions = {
  purpose?: ImagePurpose;
  maxDim: number;
  quality: number;
  maxBytes: number;
  crop?: PixelCrop;
};

export type ProcessedImageResult = {
  dataUrl: string;
  byteLength: number;
  mime: "image/jpeg";
};

export type ImageWorkerRequest = {
  file: File;
  options: {
    maxDim: number;
    quality: number;
    maxBytes: number;
    crop?: PixelCrop;
  };
};

export type ImageWorkerResponse =
  | {
      ok: true;
      dataUrl: string;
      byteLength: number;
      mime: "image/jpeg";
    }
  | {
      ok: false;
      error: string;
    };
