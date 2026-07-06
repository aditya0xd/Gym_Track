export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(",");
export const ALLOWED_IMAGE_TYPE_SET = new Set<string>(IMAGE_MIME_TYPES);

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const RAW_FILE_MAX_BYTES = 15 * 1024 * 1024;

export const IMAGE_PROCESSING_PRESETS = {
  memberPhoto: {
    purpose: "memberPhoto",
    maxDim: 1200,
    quality: 0.6,
    maxBytes: MAX_IMAGE_BYTES,
  },
  upiScreenshot: {
    purpose: "upiScreenshot",
    maxDim: 1800,
    quality: 0.8,
    maxBytes: MAX_IMAGE_BYTES,
  },
  profilePhoto: {
    purpose: "profilePhoto",
    maxDim: 800,
    quality: 0.6,
    maxBytes: MAX_IMAGE_BYTES,
  },
} as const;
