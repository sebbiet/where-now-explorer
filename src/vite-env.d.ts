/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_KEY?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_ANALYTICS_ENDPOINT?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
