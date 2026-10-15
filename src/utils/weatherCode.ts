export interface WeatherCodeMeta {
  label: string;
  mood: "clear" | "clouds" | "rain" | "snow" | "storm" | "fog" | "unknown";
}

export function weatherCodeMeta(code: number | null): WeatherCodeMeta {
  if (code === null || Number.isNaN(code)) {
    return { label: "Conditions unavailable", mood: "unknown" };
  }

  const map: Record<number, WeatherCodeMeta> = {
    0: { label: "Clear sky", mood: "clear" },
    1: { label: "Mostly clear", mood: "clear" },
    2: { label: "Partly cloudy", mood: "clouds" },
    3: { label: "Overcast", mood: "clouds" },
    45: { label: "Fog", mood: "fog" },
    48: { label: "Depositing rime fog", mood: "fog" },
    51: { label: "Light drizzle", mood: "rain" },
    53: { label: "Drizzle", mood: "rain" },
    55: { label: "Dense drizzle", mood: "rain" },
    56: { label: "Light freezing drizzle", mood: "rain" },
    57: { label: "Dense freezing drizzle", mood: "rain" },
    61: { label: "Slight rain", mood: "rain" },
    63: { label: "Rain", mood: "rain" },
    65: { label: "Heavy rain", mood: "rain" },
    66: { label: "Light freezing rain", mood: "snow" },
    67: { label: "Heavy freezing rain", mood: "snow" },
    71: { label: "Slight snow", mood: "snow" },
    73: { label: "Snow", mood: "snow" },
    75: { label: "Heavy snow", mood: "snow" },
    77: { label: "Snow grains", mood: "snow" },
    80: { label: "Rain showers", mood: "rain" },
    81: { label: "Rain showers", mood: "rain" },
    82: { label: "Violent rain showers", mood: "rain" },
    85: { label: "Snow showers", mood: "snow" },
    86: { label: "Heavy snow showers", mood: "snow" },
    95: { label: "Thunderstorm", mood: "storm" },
    96: { label: "Thunderstorm with hail", mood: "storm" },
    99: { label: "Severe thunderstorm with hail", mood: "storm" },
  };

  return map[code] ?? { label: "Unknown conditions", mood: "unknown" };
}
