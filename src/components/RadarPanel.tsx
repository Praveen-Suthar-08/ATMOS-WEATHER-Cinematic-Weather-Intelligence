import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LocationOption } from "@/types/models";
import { formatLocalTime } from "@/utils/dateTime";
import { useRadar } from "@/hooks/useRadar";
import { buildRadarImageUrl } from "@/services/rainViewer";

interface RadarPanelProps {
  location: LocationOption;
  timezone: string;
  hour12?: boolean;
  clockTag?: string;
  isLight?: boolean;
}

export function RadarPanel({ location, timezone, hour12, clockTag = "system", isLight = false }: RadarPanelProps) {
  const radarQuery = useRadar();
  const frames = radarQuery.data?.frames ?? [];
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(5);

  const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    if (!frames.length) {
      return;
    }
    setFrameIndex(frames.length - 1);
  }, [frames.length]);

  useEffect(() => {
    if (!playing || reducedMotion || frames.length < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 700);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, frames.length]);

  const selectedFrame = frames[frameIndex] ?? null;
  const imageUrl = selectedFrame && radarQuery.data
    ? buildRadarImageUrl(radarQuery.data.host, selectedFrame.path, location.latitude, location.longitude, zoom, 2)
    : null;

  const panelClass = isLight ? "border-slate-300 bg-white text-slate-900" : "border-theme surface";
  const subtleTextClass = isLight ? "text-slate-600" : "text-muted";
  const controlClass = isLight ? "border-slate-300 bg-slate-100 text-slate-900" : "border-theme";
  const mutedSurfaceClass = isLight ? "bg-slate-100" : "surface-muted";

  return (
    <section className={`flex flex-col h-full rounded-3xl border p-4 md:p-6 ${panelClass}`} aria-label="Radar timeline">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Precipitation radar</h3>
          <p className={`text-sm ${subtleTextClass}`}>RainViewer timeline centered at {location.name}</p>
        </div>

        <button
          type="button"
          onClick={() => setPlaying((prev) => !prev)}
          className={`rounded-xl border px-3 py-2 text-sm ${controlClass}`}
          disabled={!frames.length || reducedMotion}
        >
          <span className="inline-flex items-center gap-2">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause" : "Play"}
          </span>
        </button>
      </div>

      {reducedMotion && <p className={`mt-2 text-xs ${subtleTextClass}`}>Playback disabled because reduced-motion is enabled.</p>}

      {radarQuery.isLoading && <div className={`mt-4 h-56 animate-pulse rounded-2xl ${mutedSurfaceClass}`} />}
      {radarQuery.isError && (
        <p className="mt-4 rounded-xl border border-theme bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
          Radar frames are temporarily unavailable. Try refreshing.
        </p>
      )}

      {!radarQuery.isLoading && !radarQuery.isError && frames.length === 0 && (
        <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${controlClass} ${subtleTextClass}`}>
          No radar frames are available for this moment. Forecast data remains active.
        </p>
      )}

      {imageUrl && selectedFrame && (
        <div className="flex flex-1 flex-col">
          <div className={`mt-4 flex-1 overflow-hidden rounded-2xl border ${isLight ? "border-slate-300" : "border-theme"}`}>
            <img
              src={imageUrl}
              alt={`Radar frame at ${formatLocalTime(new Date(selectedFrame.time * 1000).toISOString(), timezone, {
                hour: "numeric",
                minute: "2-digit",
                hour12,
              })}`}
              className="h-60 w-full object-cover md:h-72"
            />
          </div>

          <div className="mt-4 grid gap-3">
            <label htmlFor="radar-time" className={`text-xs ${subtleTextClass}`}>
              Time: {formatLocalTime(new Date(selectedFrame.time * 1000).toISOString(), timezone, { hour: "numeric", minute: "2-digit", hour12 })} ({clockTag})
            </label>
            <input
              id="radar-time"
              type="range"
              min={0}
              max={Math.max(frames.length - 1, 0)}
              value={frameIndex}
              onChange={(event) => {
                setPlaying(false);
                setFrameIndex(Number(event.target.value));
              }}
            />

            <div className="flex items-center gap-2">
              <label htmlFor="radar-zoom" className={`text-xs ${subtleTextClass}`}>
                Zoom
              </label>
              <input
                id="radar-zoom"
                type="range"
                min={2}
                max={7}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
              <span className={`text-xs ${subtleTextClass}`}>{zoom}</span>
            </div>

            <div className={`rounded-xl border p-3 ${controlClass} ${mutedSurfaceClass}`}>
              <p className="text-xs font-medium">Legend (reflectivity intensity)</p>
              <div className="mt-2 h-3 rounded-full bg-gradient-to-r from-cyan-400 via-lime-400 via-60% to-red-500" />
              <div className={`mt-1 flex justify-between text-[11px] ${subtleTextClass}`}>
                <span>Light</span>
                <span>Moderate</span>
                <span>Heavy</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className={`mt-4 text-xs ${subtleTextClass}`}>
        Radar imagery by <a className="underline" href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>. Use is subject to RainViewer terms and availability.
      </p>
    </section>
  );
}
