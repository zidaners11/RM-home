/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MI_VARIABLE: string
  // Añade aquí todas tus variables de entorno que uses en el proyecto
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
