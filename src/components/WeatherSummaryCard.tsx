import { useRef } from "react";
import type { WeatherSnapshot } from "@/types/models";
import type { TemperatureUnit, WindUnit } from "@/types/models";
import { weatherCodeMeta } from "@/utils/weatherCode";
import { formatValue, toTemperature, toWind, windDirectionToLabel } from "@/utils/units";
import { formatLocalTime } from "@/utils/dateTime";

interface WeatherSummaryCardProps {
  snapshot: WeatherSnapshot;
  temperatureUnit: TemperatureUnit;
  windUnit: WindUnit;
  isLight: boolean;
  onCopied: () => void;
}

export function WeatherSummaryCard({ snapshot, temperatureUnit, windUnit, isLight, onCopied }: WeatherSummaryCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = weatherCodeMeta(snapshot.current.weatherCode);

  const tempDisplay = `${formatValue(toTemperature(snapshot.current.temperatureC, temperatureUnit), 0)}${temperatureUnit === "celsius" ? "°C" : "°F"}`;
  const feelsLike = `${formatValue(toTemperature(snapshot.current.apparentTemperatureC, temperatureUnit), 0)}${temperatureUnit === "celsius" ? "°C" : "°F"}`;
  const wind = `${formatValue(toWind(snapshot.current.windSpeedKmh, windUnit), 1)} ${windUnit} ${windDirectionToLabel(snapshot.current.windDirectionDeg)}`;
  const humidity = `${formatValue(snapshot.current.humidity, 0)}%`;
  const updatedAt = formatLocalTime(snapshot.fetchedAt, snapshot.timezone, { hour: "numeric", minute: "2-digit" });

  const copyText = () => {
    const lines = [
      `📍 ${[snapshot.location.name, snapshot.location.admin1, snapshot.location.country].filter(Boolean).join(", ")}`,
      `🌡️ ${tempDisplay} — ${meta.label}`,
      `🌡️ Feels like ${feelsLike}`,
      `💧 Humidity ${humidity}`,
      `💨 Wind ${wind}`,
      `⏱️ Updated ${updatedAt} (Atmos Weather / Open-Meteo)`,
    ].join("\n");
    void navigator.clipboard.writeText(lines).then(onCopied);
  };

  const bg = isLight ? "bg-gradient-to-br from-slate-100 to-blue-50 border-slate-300" : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700";
  const title = isLight ? "text-slate-900" : "text-white";
  const subtle = isLight ? "text-slate-600" : "text-slate-300";

  return (
    <div ref={ref} className={`rounded-2xl border p-4 ${bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs ${subtle}`}>{[snapshot.location.name, snapshot.location.country].filter(Boolean).join(", ")}</p>
          <p className={`mt-0.5 text-2xl font-bold tabular ${title}`}>{tempDisplay}</p>
          <p className={`text-sm ${subtle}`}>{meta.label} · Feels like {feelsLike}</p>
        </div>
        <button
          onClick={copyText}
          className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs ${isLight ? "border-slate-300 hover:bg-slate-200" : "border-slate-600 hover:bg-slate-700"}`}
          aria-label="Copy weather summary"
        >
          Copy
        </button>
      </div>
      <div className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs ${subtle}`}>
        <p>💧 Humidity {humidity}</p>
        <p>💨 Wind {wind}</p>
        <p>Updated {updatedAt}</p>
        <p>{snapshot.source === "cache" ? "Cached data" : "Live data"}</p>
      </div>
    </div>
  );
}
