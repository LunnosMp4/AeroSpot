/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BAN_API?: string
  readonly VITE_OSRM_API?: string
  readonly VITE_IGN_WMS?: string
  readonly VITE_IGN_WFS?: string
  readonly VITE_IGN_ISOCHRONE?: string
  readonly VITE_OVERPASS_API?: string
  readonly VITE_DEFAULT_CENTER_LNG?: string
  readonly VITE_DEFAULT_CENTER_LAT?: string
  readonly VITE_DEFAULT_ZOOM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
