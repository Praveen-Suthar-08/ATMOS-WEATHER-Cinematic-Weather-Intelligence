/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional Open-Meteo commercial API key (customer endpoints). Never commit a real key. */
  readonly VITE_OPEN_METEO_API_KEY?: string;
  /** Optional overrides for high-volume / commercial endpoints. */
  readonly VITE_OPEN_METEO_FORECAST_URL?: string;
  readonly VITE_OPEN_METEO_GEOCODING_URL?: string;
  readonly VITE_OPEN_METEO_AIR_QUALITY_URL?: string;
  readonly VITE_OPEN_METEO_ARCHIVE_URL?: string;
  readonly VITE_RAINVIEWER_API_URL?: string;
  /** Optional Gemini key placeholder for future AI insights (frontend-visible; restrict by domain). */
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
