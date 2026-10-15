export interface RainViewerFrame {
  time: number;
  path: string;
}

interface RainViewerResponse {
  host?: string;
  radar?: {
    past?: RainViewerFrame[];
  };
}

export interface RadarMetadata {
  host: string;
  frames: RainViewerFrame[];
}

const RAINVIEWER_API_URL =
  import.meta.env.VITE_RAINVIEWER_API_URL ?? "https://api.rainviewer.com/public/weather-maps.json";

export async function fetchRainViewerMetadata(signal?: AbortSignal): Promise<RadarMetadata> {
  const response = await fetch(RAINVIEWER_API_URL, { signal });
  if (!response.ok) {
    throw new Error(`RainViewer metadata failed with status ${response.status}`);
  }

  const data = (await response.json()) as RainViewerResponse;
  const host = typeof data.host === "string" ? data.host : "https://tilecache.rainviewer.com";
  const frames = Array.isArray(data.radar?.past)
    ? data.radar.past.filter((frame) => typeof frame.path === "string" && typeof frame.time === "number")
    : [];

  return { host, frames };
}

export function buildRadarImageUrl(
  host: string,
  framePath: string,
  latitude: number,
  longitude: number,
  zoom = 5,
  colorScheme = 2,
) {
  return `${host}${framePath}/512/${zoom}/${latitude.toFixed(4)}/${longitude.toFixed(4)}/${colorScheme}/1_1.png`;
}
