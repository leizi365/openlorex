const DEFAULT_MAX_IMAGE_SIZE_MB = 5;
const DEFAULT_MAX_FILE_SIZE_MB = 50;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const MAX_IMAGE_SIZE_MB = parsePositiveInt(
  import.meta.env.VITE_MAX_IMAGE_SIZE_MB,
  DEFAULT_MAX_IMAGE_SIZE_MB
);

export const MAX_FILE_SIZE_MB = parsePositiveInt(
  import.meta.env.VITE_MAX_FILE_SIZE_MB,
  DEFAULT_MAX_FILE_SIZE_MB
);

export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

export function getMaxSizeMbForFile(file: File) {
  return isImageFile(file) ? MAX_IMAGE_SIZE_MB : MAX_FILE_SIZE_MB;
}

export function getMaxBytesForFile(file: File) {
  return isImageFile(file) ? MAX_IMAGE_SIZE_BYTES : MAX_FILE_SIZE_BYTES;
}

export function getFileSizeError(file: File) {
  const maxBytes = getMaxBytesForFile(file);
  if (file.size <= maxBytes) {
    return null;
  }

  return `文件过大（最大 ${getMaxSizeMbForFile(file)}MB）：${file.name}`;
}
