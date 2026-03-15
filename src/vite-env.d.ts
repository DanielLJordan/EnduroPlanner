/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEAM_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
