/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEVLOG?: string;
  readonly VITE_DEVLOG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
