import * as React from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { uploadAsset } from '@/lib/api/assets';
import { getFileSizeError } from '@/lib/upload-limits';

export type UploadedFile = {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  appUrl: string;
};

type UseUploadFileProps = {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
};

function createUploadedFile(
  file: File,
  asset: Awaited<ReturnType<typeof uploadAsset>>
): UploadedFile {
  return {
    key: asset.code,
    name: asset.name,
    size: asset.size_bytes,
    type: asset.mime_type,
    url: asset.url,
    appUrl: asset.url,
  };
}

export function useUploadFile({
  onUploadComplete,
  onUploadError,
}: UseUploadFileProps = {}) {
  const { pageId } = useParams();
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadFile(file: File) {
    setIsUploading(true);
    setUploadingFile(file);
    setProgress(0);
    setUploadedFile(undefined);

    try {
      const sizeError = getFileSizeError(file);
      if (sizeError) {
        toast.error(sizeError);
        throw new Error(sizeError);
      }

      setProgress(30);
      const asset = await uploadAsset(file, pageId ?? null);
      setProgress(100);

      const result = createUploadedFile(file, asset);
      setUploadedFile(result);
      onUploadComplete?.(result);
      return result;
    } catch (error) {
      onUploadError?.(error);
      if (!(error instanceof Error && error.message.includes('过大'))) {
        toast.error(getErrorMessage(error));
      }
      throw error;
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile,
    uploadingFile,
  };
}

export function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return '上传失败，请重试。';
}

export function showErrorToast(err: unknown) {
  return toast.error(getErrorMessage(err));
}
