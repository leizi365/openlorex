import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

export type AppConfig = {
  server: {
    host: boolean;
    port: number;
  };
  proxy: {
    target: string;
  };
  api: {
    baseUrl: string;
  };
  upload: {
    maxImageSizeMb: number;
    maxFileSizeMb: number;
  };
};

const CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_CONFIG: AppConfig = {
  server: {
    host: true,
    port: 5173,
  },
  proxy: {
    target: 'http://127.0.0.1:8001',
  },
  api: {
    baseUrl: '/api/v1',
  },
  upload: {
    maxImageSizeMb: 5,
    maxFileSizeMb: 50,
  },
};

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>
): T {
  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = merged[key as keyof T];

    if (
      current &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      merged[key as keyof T] = deepMerge(
        current as Record<string, unknown>,
        value as Record<string, unknown>
      ) as T[keyof T];
      continue;
    }

    merged[key as keyof T] = value as T[keyof T];
  }

  return merged;
}

function loadYaml(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return (yaml.parse(content) as Record<string, unknown> | null) ?? {};
}

function applyEnvOverrides(config: AppConfig): AppConfig {
  const next = structuredClone(config);

  if (process.env.API_PROXY) {
    next.proxy.target = process.env.API_PROXY;
  }

  if (process.env.VITE_API_BASE_URL) {
    next.api.baseUrl = process.env.VITE_API_BASE_URL;
  }

  if (process.env.VITE_MAX_IMAGE_SIZE_MB) {
    next.upload.maxImageSizeMb = Number(process.env.VITE_MAX_IMAGE_SIZE_MB);
  }

  if (process.env.VITE_MAX_FILE_SIZE_MB) {
    next.upload.maxFileSizeMb = Number(process.env.VITE_MAX_FILE_SIZE_MB);
  }

  return next;
}

export function loadAppConfig(mode: string): AppConfig {
  const merged = deepMerge(
    deepMerge(
      structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>,
      loadYaml(path.join(CONFIG_DIR, 'default.yaml'))
    ),
    loadYaml(path.join(CONFIG_DIR, `${mode}.yaml`))
  ) as unknown as AppConfig;

  return applyEnvOverrides(merged);
}
