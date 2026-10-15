export type ThemeMode = "light" | "dark" | "system";

export type TemperatureUnit = "celsius" | "fahrenheit";

export type WindUnit = "kmh" | "mph" | "ms";

export type PrecipitationUnit = "mm" | "in";

export type ClockFormat = "system" | "12h" | "24h";

export interface UnitPreferences {
  temperature: TemperatureUnit;
  wind: WindUnit;
  precipitation: PrecipitationUnit;
}

export interface LocationOption {
  id: string;
  name: string;
  country?: string;
  countryCode?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CurrentWeather {
  time: string;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  humidity: number | null;
  precipitationMm: number | null;
  weatherCode: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  windGustsKmh: number | null;
  pressureHpa: number | null;
  visibilityM: number | null;
  isDay: boolean | null;
}

export interface HourlyWeather {
  time: string;
  temperatureC: number | null;
  humidity: number | null;
  precipitationProbability: number | null;
  precipitationMm: number | null;
  weatherCode: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  uvIndex: number | null;
}

export interface DailyWeather {
  time: string;
  weatherCode: number | null;
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  sunrise: string | null;
  sunset: string | null;
  uvMax: number | null;
  precipitationProbabilityMax: number | null;
  precipitationSumMm: number | null;
  windSpeedMaxKmh: number | null;
  moonrise?: string | null;
  moonset?: string | null;
  moonPhase?: number | null;
}

export interface WeatherSnapshot {
  location: LocationOption;
  fetchedAt: string;
  timezone: string;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  source: "live" | "cache";
}

export interface AirQualitySnapshot {
  time: string;
  usAqi: number | null;
  euAqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
}

export interface NowcastPoint {
  time: string;
  precipitationMm: number | null;
  rainMm?: number | null;
  showersMm?: number | null;
  snowfallMm?: number | null;
}

export interface HistoricalComparison {
  yesterdayMaxC: number | null;
  yesterdayMinC: number | null;
  yesterdayPrecipMm: number | null;
}

export interface PreferencesState {
  theme: ThemeMode;
  units: UnitPreferences;
  clockFormat: ClockFormat;
}
