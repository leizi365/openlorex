import { ApiError, type ApiResponse } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'wiki-auth-token';

export function getApiBaseUrl() {
  return API_BASE;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

export function withAccessToken(url: string, token = getAccessToken()) {
  if (!token || url.includes('access_token=')) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}access_token=${encodeURIComponent(token)}`;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function mergeAbortSignals(signals: AbortSignal[]) {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true,
    signal,
    timeoutMs = 30_000,
  } = options;
  const requestHeaders: Record<string, string> = { ...headers };

  if (auth) {
    const token = getAccessToken();

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  const requestSignal = signal
    ? mergeAbortSignals([signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: requestHeaders,
      body: payload,
      signal: requestSignal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const result = isJson
      ? ((await response.json()) as ApiResponse<T>)
      : null;

    if (result && result.code !== 0) {
      throw new ApiError(result.code, result.message, result.data);
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        result?.message ?? response.statusText
      );
    }

    if (!isJson) {
      return undefined as T;
    }

    return result!.data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (timeoutController.signal.aborted) {
        throw new ApiError(408, '请求超时，请稍后重试');
      }
      throw error;
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
