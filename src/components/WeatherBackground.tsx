import type { DailyWeather } from "@/types/models";
import { weatherCodeMeta } from "@/utils/weatherCode";

type SkyMode = "clear" | "night" | "cloudy" | "rain" | "storm" | "snow" | "fog" | "sunset";

interface WeatherBackgroundProps {
  weatherCode: number | null;
  isDay: boolean | null;
  today: DailyWeather | null;
}

function pickSkyMode(weatherCode: number | null, isDay: boolean | null, today: DailyWeather | null): SkyMode {
  const mood = weatherCodeMeta(weatherCode).mood;

  if (mood === "storm") return "storm";
  if (mood === "snow") return "snow";
  if (mood === "fog") return "fog";
  if (mood === "rain") return "rain";
  if (isDay === false) return "night";

  if (today?.sunrise && today?.sunset) {
    const now = Date.now();
    const sunrise = new Date(today.sunrise).getTime();
    const sunset = new Date(today.sunset).getTime();
    if (Math.abs(now - sunrise) < 75 * 60 * 1000 || Math.abs(now - sunset) < 75 * 60 * 1000) {
      return "sunset";
    }
  }

  if (mood === "clouds") return "cloudy";
  return "clear";
}

export function WeatherBackground({ weatherCode, isDay, today }: WeatherBackgroundProps) {
  const mode = pickSkyMode(weatherCode, isDay, today);

  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden weather-bg weather-bg-${mode}`}>
      {(mode === "cloudy" || mode === "rain" || mode === "storm") && (
        <>
          <div className="weather-cloud weather-cloud-a" />
          <div className="weather-cloud weather-cloud-b" />
        </>
      )}
      {mode === "night" && (
        <>
          <div className="weather-stars" />
          <div className="weather-moon-glow" />
        </>
      )}
      {(mode === "rain" || mode === "storm") && <div className="weather-rain" />}
      {mode === "snow" && <div className="weather-snow" />}
      {mode === "fog" && <div className="weather-fog" />}
    </div>
  );
}
