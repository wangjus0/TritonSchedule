/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_BASE_FALLBACK_URL?: string;
  readonly API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
