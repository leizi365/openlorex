import { apiRequest, withAccessToken } from './client';

export type AssetDto = {
  code: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  page_code: string | null;
};

export async function uploadAsset(file: File, pageCode?: string | null) {
  const formData = new FormData();
  formData.append('file', file);

  if (pageCode) {
    formData.append('page_code', pageCode);
  }

  const data = await apiRequest<AssetDto>('/assets/upload', {
    method: 'POST',
    body: formData,
  });

  return {
    code: data.code,
    name: data.name,
    mime_type: data.mime_type,
    size_bytes: data.size_bytes,
    url: withAccessToken(data.url),
    page_code: data.page_code,
  };
}
