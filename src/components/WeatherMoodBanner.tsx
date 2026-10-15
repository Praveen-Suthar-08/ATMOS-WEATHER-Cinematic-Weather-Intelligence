import { weatherCodeMeta } from "@/utils/weatherCode";

interface WeatherMoodBannerProps {
  weatherCode: number | null;
  isDay: boolean | null;
  temperatureC: number | null;
  uvMax: number | null;
  windSpeedKmh: number | null;
}

interface Mood {
  emoji: string;
  headline: string;
  tip: string;
  color: string;
}

function getMood(
  weatherCode: number | null,
  isDay: boolean | null,
  tempC: number | null,
  uv: number | null,
  wind: number | null,
): Mood {
  const meta = weatherCodeMeta(weatherCode);

  if (meta.mood === "storm") {
    return { emoji: "⛈️", headline: "Stormy conditions", tip: "Stay indoors if possible. Avoid exposed areas and tall trees.", color: "from-slate-700 to-slate-900" };
  }
  if (meta.mood === "snow") {
    return { emoji: "❄️", headline: "Snowy weather", tip: "Dress in warm layers. Roads may be slippery — drive carefully.", color: "from-blue-900 to-slate-800" };
  }
  if (meta.mood === "rain") {
    return { emoji: "🌧️", headline: "Rainy day", tip: "Bring an umbrella. Good day to stay cozy indoors.", color: "from-slate-700 to-blue-950" };
  }
  if (meta.mood === "fog") {
    return { emoji: "🌫️", headline: "Foggy conditions", tip: "Visibility is reduced. Drive slowly and use your headlights.", color: "from-slate-600 to-slate-800" };
  }
  if (isDay === false) {
    return { emoji: "🌙", headline: "Clear night", tip: "Great visibility for stargazing tonight.", color: "from-indigo-950 to-slate-900" };
  }
  if ((uv ?? 0) >= 8) {
    return { emoji: "☀️", headline: "High UV day", tip: "UV index is high. Wear SPF and seek shade during peak hours.", color: "from-orange-700 to-amber-900" };
  }
  if ((tempC ?? 20) >= 30) {
    return { emoji: "🥵", headline: "Hot day", tip: "Stay hydrated and avoid prolonged sun exposure. Seek cool spaces.", color: "from-red-800 to-orange-900" };
  }
  if ((tempC ?? 20) <= 2) {
    return { emoji: "🥶", headline: "Very cold", tip: "Bundle up with heavy layers. Frost possible on surfaces.", color: "from-blue-900 to-slate-800" };
  }
  if ((wind ?? 0) > 40) {
    return { emoji: "💨", headline: "Windy conditions", tip: "Hold onto hats and loose objects. Cycling may be challenging.", color: "from-slate-600 to-teal-900" };
  }
  if (meta.mood === "clear") {
    if ((tempC ?? 20) > 18 && (tempC ?? 20) < 26 && (wind ?? 0) < 15) {
      return { emoji: "✨", headline: "Exceptional day", tip: "Golden conditions detected. High comfort levels for all outdoor plans.", color: "from-emerald-700 to-teal-900" };
    }
    return { emoji: "😎", headline: "Perfectly clear", tip: "Unobstructed clear skies. Great visibility for travel and outdoors.", color: "from-cyan-800 to-blue-900" };
  }
  return { emoji: "🌤️", headline: "Partly cloudy", tip: "Mix of clouds and sun. Comfortable conditions for most activities.", color: "from-slate-600 to-blue-900" };
}

export function WeatherMoodBanner({ weatherCode, isDay, temperatureC, uvMax, windSpeedKmh }: WeatherMoodBannerProps) {
  const mood = getMood(weatherCode, isDay, temperatureC, uvMax, windSpeedKmh);

  return (
    <div className={`overflow-hidden rounded-2xl bg-gradient-to-r ${mood.color} px-4 py-3 text-white`} role="complementary" aria-label="Weather mood banner">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none" role="img" aria-label={mood.headline}>{mood.emoji}</span>
        <div className="min-w-0">
          <p className="font-semibold text-white">{mood.headline}</p>
          <p className="mt-0.5 text-sm text-white/80">{mood.tip}</p>
        </div>
      </div>
    </div>
  );
}
