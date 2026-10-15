import type { AirQualitySnapshot, HistoricalComparison, LocationOption, NowcastPoint, WeatherSnapshot } from "@/types/models";
import { safeReadStorage, safeWriteStorage } from "@/utils/storage";

const WEATHER_CACHE_KEY = "atmos-weather-cache-v1";

/**
 * Endpoint configuration.
 * Defaults are the free public Open-Meteo endpoints. For production traffic at
 * scale, point these at the commercial customer endpoints via environment
 * variables (see .env.example) — no code changes required.
 */
const API_KEY = import.meta.env.VITE_OPEN_METEO_API_KEY;
const FORECAST_API_URL = import.meta.env.VITE_OPEN_METEO_FORECAST_URL ?? "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API_URL = import.meta.env.VITE_OPEN_METEO_GEOCODING_URL ?? "https://geocoding-api.open-meteo.com/v1/search";
const AIR_QUALITY_API_URL =
  import.meta.env.VITE_OPEN_METEO_AIR_QUALITY_URL ?? "https://air-quality-api.open-meteo.com/v1/air-quality";
const ARCHIVE_API_URL = import.meta.env.VITE_OPEN_METEO_ARCHIVE_URL ?? "https://archive-api.open-meteo.com/v1/archive";

/** Attach the commercial API key when configured (customer endpoints require it). */
function withApiKey(params: URLSearchParams): URLSearchParams {
  if (API_KEY) {
    params.set("apikey", API_KEY);
  }
  return params;
}

interface GeocodingResponse {
  results?: Array<{
    id?: number;
    name?: string;
    country?: string;
    country_code?: string;
    admin1?: string;
    population?: number;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    postcodes?: string[];
  }>;
}

interface NominatimResult {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
}

interface ForecastResponse {
  timezone?: string;
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
  daily?: Record<string, unknown>;
}

interface AirQualityResponse {
  current?: Record<string, unknown>;
}

interface MinutelyResponse {
  minutely_15?: {
    time?: string[];
    precipitation?: Array<number | null>;
    rain?: Array<number | null>;
    showers?: Array<number | null>;
    snowfall?: Array<number | null>;
  };
}

interface HistoricalResponse {
  daily?: {
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
  };
}

export interface ApiError extends Error {
  status?: number;
}

function createApiError(message: string, status?: number): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}

function buildLocationId(name: string, latitude: number, longitude: number) {
  return `${name.toLowerCase()}_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
}

async function fetchWithTimeout(url: string, signal?: AbortSignal, timeoutMs = 9000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  function abortHandler() {
    controller.abort();
  }

  if (signal) {
    signal.addEventListener("abort", abortHandler);
  }

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    if (signal) {
      signal.removeEventListener("abort", abortHandler);
    }
  }
}

async function requestJson<T>(url: string, signal?: AbortSignal, retries = 1): Promise<T> {
  try {
    const response = await fetchWithTimeout(url, signal);
    if (!response.ok) {
      throw createApiError(`Request failed with status ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    const status = (error as ApiError).status;
    const transient = status === undefined || status >= 500 || status === 429;
    if (retries > 0 && transient) {
      // Short backoff before the single bounded retry — avoids hammering a
      // rate-limited (429) or struggling provider when many clients retry.
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (signal?.aborted) {
        throw error;
      }
      return requestJson<T>(url, signal, retries - 1);
    }
    throw error;
  }
}

export async function searchLocations(query: string, signal?: AbortSignal): Promise<LocationOption[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const normalized = trimmed.replace(/\s+/g, " ");
  const canonical = toCanonicalCityName(normalized);
  const isNumericSearch = /^\d[\d\s-]*$/.test(normalized);
  const localeCountry = getLocaleCountryCode();

  let results = await runGeocoding(normalized, signal, isNumericSearch && localeCountry ? localeCountry : undefined);
  if (!isNumericSearch && canonical !== normalized.toLowerCase()) {
    const canonicalResults = await runGeocoding(canonical, signal);
    results = dedupeGeoResults([...results, ...canonicalResults]);
  }

  if (results.length === 0 && isNumericSearch && localeCountry) {
    results = await runGeocoding(normalized, signal);
  }

  if (results.length === 0) {
    const fallback = await runNominatimSearch(normalized, signal, localeCountry);
    if (fallback.length > 0) {
      return fallback;
    }
  }

  return results
    .filter((result) => typeof result.name === "string" && typeof result.latitude === "number" && typeof result.longitude === "number")
    .map((result) => {
      const name = result.name as string;
      const latitude = result.latitude as number;
      const longitude = result.longitude as number;
      const location: LocationOption = {
        id: result.id ? String(result.id) : buildLocationId(name, latitude, longitude),
        name,
        country: result.country,
        countryCode: result.country_code,
        admin1: result.admin1,
        latitude,
        longitude,
        timezone: result.timezone,
      };
      return {
        location,
        score: scoreLocationResult(result, normalized, isNumericSearch, results),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.location)
    .slice(0, 8);
}

function dedupeGeoResults(results: GeocodingResponse["results"]) {
  if (!results) {
    return [];
  }
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.name ?? ""}_${item.latitude ?? ""}_${item.longitude ?? ""}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function runNominatimSearch(query: string, signal?: AbortSignal, localeCountry?: string): Promise<LocationOption[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    "accept-language": "en",
  });

  if (localeCountry && /^\d[\d\s-]*$/.test(query)) {
    params.set("countrycodes", localeCountry.toLowerCase());
  }

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal });
  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as NominatimResult[];
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return null;
      }

      const name = item.address?.city || item.address?.town || item.address?.village || item.name || query;
      const country = item.address?.country;
      const admin1 = item.address?.state;
      const countryCode = item.address?.country_code?.toUpperCase();

      const option: LocationOption = {
        id: item.place_id ? String(item.place_id) : buildLocationId(name, latitude, longitude),
        name,
        latitude,
        longitude,
      };

      if (country) option.country = country;
      if (countryCode) option.countryCode = countryCode;
      if (admin1) option.admin1 = admin1;

      return option;
    })
    .filter((item): item is LocationOption => Boolean(item))
    .slice(0, 6);
}

async function runGeocoding(query: string, signal?: AbortSignal, countryCode?: string) {
  const params = new URLSearchParams({
    name: query,
    count: "12",
    language: "en",
    format: "json",
  });

  if (countryCode) {
    params.set("countryCode", countryCode);
  }

  const data = await requestJson<GeocodingResponse>(`${GEOCODING_API_URL}?${withApiKey(params).toString()}`, signal);
  return Array.isArray(data.results) ? data.results : [];
}

function getLocaleCountryCode() {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  const match = navigator.language.match(/-([A-Za-z]{2})$/);
  return match?.[1]?.toUpperCase();
}

function toCanonicalCityName(query: string) {
  const lower = query.toLowerCase();
  const aliases: Record<string, string> = {
    bangalore: "bengaluru",
    bombay: "mumbai",
    calcutta: "kolkata",
    madras: "chennai",
  };
  return aliases[lower] ?? lower;
}

function scoreLocationResult(
  result: {
    name?: string;
    country?: string;
    admin1?: string;
    population?: number;
    postcodes?: string[];
    country_code?: string;
    feature_code?: string;
  },
  query: string,
  numeric: boolean,
  allRawResults: GeocodingResponse["results"],
) {
  const normalizedQuery = query.toLowerCase();
  const [baseQuery, qualifier] = normalizedQuery.split(",").map((part) => part.trim());
  const name = (result.name ?? "").toLowerCase();
  const admin1 = (result.admin1 ?? "").toLowerCase();
  const country = (result.country ?? "").toLowerCase();
  const postcodes = Array.isArray(result.postcodes) ? result.postcodes.map((postcode) => postcode.toLowerCase()) : [];
  const population = typeof result.population === "number" ? result.population : 0;

  let score = 0;
  if (name === baseQuery) score += 180;
  if (name.startsWith(baseQuery)) score += 95;
  if (name.includes(baseQuery)) score += 30;
  if (admin1.startsWith(baseQuery)) score += 20;
  if (country.startsWith(baseQuery)) score += 20;

  const canonicalBase = toCanonicalCityName(baseQuery);
  if (name === canonicalBase) score += 140;
  if (name.startsWith(canonicalBase)) score += 55;

  if (qualifier) {
    if (admin1 === qualifier || country === qualifier || result.country_code?.toLowerCase() === qualifier) {
      score += 150;
    }
  }

  if (!numeric && population > 0) {
    score += Math.min(65, Math.log10(population + 1) * 9);
  }

  // Feature code scoring (prioritize cities over villages)
  const fc = result.feature_code;
  if (fc === "PPLC") score += 100; // Capital
  if (fc === "PPLA" || fc === "PPLA2") score += 60; // Major administrative division
  if (fc === "PPL") score += 20; // Populated place

  if (numeric) {
    if (postcodes.includes(normalizedQuery)) score += 300;
    if (postcodes.some((postcode) => postcode.startsWith(normalizedQuery))) score += 140;
    if (/\d/.test(name)) score += 6;
  }

  if (numeric && getLocaleCountryCode() && result.country_code === getLocaleCountryCode()) {
    score += 12;
  }

  if (!numeric && qualifier === undefined && allRawResults && allRawResults.length > 0) {
    const topPopulation = Math.max(...allRawResults.map((item) => (typeof item.population === "number" ? item.population : 0)));
    if (topPopulation > 0 && population === topPopulation) {
      score += 18;
    }
  }

  return score;
}

function asNumberArray(value: unknown): Array<number | null> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === "number" ? item : null));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export async function fetchWeather(location: LocationOption, signal?: AbortSignal): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: "auto",
    forecast_days: "7",
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,visibility",
    hourly: "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index,wind_direction_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,moonrise,moonset,moon_phase",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    temperature_unit: "celsius",
  });

  const data = await requestJson<ForecastResponse>(`${FORECAST_API_URL}?${withApiKey(params).toString()}`, signal);
  const timezone = typeof data.timezone === "string" ? data.timezone : location.timezone ?? "UTC";
  const current = data.current ?? {};
  const hourly = data.hourly ?? {};
  const daily = data.daily ?? {};

  const hourlyTime = asStringArray(hourly.time);
  const currentTime = typeof current.time === "string" ? current.time : hourlyTime[0] ?? new Date().toISOString();
  const startIndex = Math.max(0, hourlyTime.findIndex((time) => time >= currentTime));

  const hourlyValues = {
    temperature: asNumberArray(hourly.temperature_2m),
    humidity: asNumberArray(hourly.relative_humidity_2m),
    precipitationProbability: asNumberArray(hourly.precipitation_probability),
    precipitation: asNumberArray(hourly.precipitation),
    weatherCode: asNumberArray(hourly.weather_code),
    windSpeed: asNumberArray(hourly.wind_speed_10m),
    windDirection: asNumberArray(hourly.wind_direction_10m),
    uvIndex: asNumberArray(hourly.uv_index),
  };

  const hourlyRows = hourlyTime.slice(startIndex, startIndex + 24).map((time, idx) => {
    const i = startIndex + idx;
    return {
      time,
      temperatureC: hourlyValues.temperature[i] ?? null,
      humidity: hourlyValues.humidity[i] ?? null,
      precipitationProbability: hourlyValues.precipitationProbability[i] ?? null,
      precipitationMm: hourlyValues.precipitation[i] ?? null,
      weatherCode: hourlyValues.weatherCode[i] ?? null,
      windSpeedKmh: hourlyValues.windSpeed[i] ?? null,
      windDirectionDeg: hourlyValues.windDirection[i] ?? null,
      uvIndex: hourlyValues.uvIndex[i] ?? null,
    };
  });

  const dailyTime = asStringArray(daily.time);
  const dailyValues = {
    weatherCode: asNumberArray(daily.weather_code),
    tempMax: asNumberArray(daily.temperature_2m_max),
    tempMin: asNumberArray(daily.temperature_2m_min),
    sunrise: asStringArray(daily.sunrise),
    sunset: asStringArray(daily.sunset),
    uvMax: asNumberArray(daily.uv_index_max),
    precipitationProbabilityMax: asNumberArray(daily.precipitation_probability_max),
    precipitationSum: asNumberArray(daily.precipitation_sum),
    windMax: asNumberArray(daily.wind_speed_10m_max),
    moonrise: asStringArray(daily.moonrise),
    moonset: asStringArray(daily.moonset),
    moonPhase: asNumberArray(daily.moon_phase),
  };

  const dailyRows = dailyTime.slice(0, 7).map((time, i) => ({
    time,
    weatherCode: dailyValues.weatherCode[i] ?? null,
    temperatureMaxC: dailyValues.tempMax[i] ?? null,
    temperatureMinC: dailyValues.tempMin[i] ?? null,
    sunrise: dailyValues.sunrise[i] ?? null,
    sunset: dailyValues.sunset[i] ?? null,
    uvMax: dailyValues.uvMax[i] ?? null,
    precipitationProbabilityMax: dailyValues.precipitationProbabilityMax[i] ?? null,
    precipitationSumMm: dailyValues.precipitationSum[i] ?? null,
    windSpeedMaxKmh: dailyValues.windMax[i] ?? null,
    moonrise: dailyValues.moonrise[i] ?? null,
    moonset: dailyValues.moonset[i] ?? null,
    moonPhase: dailyValues.moonPhase[i] ?? null,
  }));

  const snapshot: WeatherSnapshot = {
    location,
    fetchedAt: new Date().toISOString(),
    timezone,
    current: {
      time: currentTime,
      temperatureC: typeof current.temperature_2m === "number" ? current.temperature_2m : null,
      apparentTemperatureC: typeof current.apparent_temperature === "number" ? current.apparent_temperature : null,
      humidity: typeof current.relative_humidity_2m === "number" ? current.relative_humidity_2m : null,
      precipitationMm: typeof current.precipitation === "number" ? current.precipitation : null,
      weatherCode: typeof current.weather_code === "number" ? current.weather_code : null,
      windSpeedKmh: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : null,
      windDirectionDeg: typeof current.wind_direction_10m === "number" ? current.wind_direction_10m : null,
      windGustsKmh: typeof current.wind_gusts_10m === "number" ? current.wind_gusts_10m : null,
      pressureHpa: typeof current.pressure_msl === "number" ? current.pressure_msl : null,
      visibilityM: typeof current.visibility === "number" ? current.visibility : null,
      isDay: typeof current.is_day === "number" ? current.is_day === 1 : null,
    },
    hourly: hourlyRows,
    daily: dailyRows,
    source: "live",
  };

  writeCachedSnapshot(snapshot);
  return snapshot;
}

export async function fetchAirQuality(location: LocationOption, signal?: AbortSignal): Promise<AirQualitySnapshot | null> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "us_aqi,european_aqi,pm2_5,pm10,ozone",
    timezone: "auto",
  });

  const data = await requestJson<AirQualityResponse>(`${AIR_QUALITY_API_URL}?${withApiKey(params).toString()}`, signal);
  const current = data.current;
  if (!current || typeof current !== "object") {
    return null;
  }

  return {
    time: typeof current.time === "string" ? current.time : new Date().toISOString(),
    usAqi: typeof current.us_aqi === "number" ? current.us_aqi : null,
    euAqi: typeof current.european_aqi === "number" ? current.european_aqi : null,
    pm2_5: typeof current.pm2_5 === "number" ? current.pm2_5 : null,
    pm10: typeof current.pm10 === "number" ? current.pm10 : null,
    ozone: typeof current.ozone === "number" ? current.ozone : null,
  };
}

export async function fetchNowcast15Min(location: LocationOption, signal?: AbortSignal): Promise<NowcastPoint[]> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: "auto",
    forecast_hours: "6",
    past_minutely_15: "4",
    minutely_15: "precipitation,rain,showers,snowfall",
  });

  const data = await requestJson<MinutelyResponse>(`${FORECAST_API_URL}?${withApiKey(params).toString()}`, signal, 0);
  const times = Array.isArray(data.minutely_15?.time) ? data.minutely_15?.time : [];
  const precipitation = Array.isArray(data.minutely_15?.precipitation) ? data.minutely_15?.precipitation : [];
  const rain = Array.isArray(data.minutely_15?.rain) ? data.minutely_15?.rain : [];
  const showers = Array.isArray(data.minutely_15?.showers) ? data.minutely_15?.showers : [];
  const snowfall = Array.isArray(data.minutely_15?.snowfall) ? data.minutely_15?.snowfall : [];

  return times.slice(0, 24).map((time, index) => ({
    time,
    precipitationMm: typeof precipitation[index] === "number" ? precipitation[index] : null,
    rainMm: typeof rain[index] === "number" ? rain[index] : null,
    showersMm: typeof showers[index] === "number" ? showers[index] : null,
    snowfallMm: typeof snowfall[index] === "number" ? snowfall[index] : null,
  }));
}

export async function fetchYesterdayComparison(location: LocationOption, signal?: AbortSignal): Promise<HistoricalComparison | null> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const day = yesterday.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    start_date: day,
    end_date: day,
    timezone: "auto",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
  });

  const data = await requestJson<HistoricalResponse>(`${ARCHIVE_API_URL}?${withApiKey(params).toString()}`, signal, 0);
  const daily = data.daily;
  if (!daily) {
    return null;
  }

  return {
    yesterdayMaxC: typeof daily.temperature_2m_max?.[0] === "number" ? daily.temperature_2m_max[0] : null,
    yesterdayMinC: typeof daily.temperature_2m_min?.[0] === "number" ? daily.temperature_2m_min[0] : null,
    yesterdayPrecipMm: typeof daily.precipitation_sum?.[0] === "number" ? daily.precipitation_sum[0] : null,
  };
}

type SnapshotCache = Record<string, WeatherSnapshot>;

function readCache(): SnapshotCache {
  return safeReadStorage<SnapshotCache>(WEATHER_CACHE_KEY, {});
}

export function readCachedSnapshot(locationId: string): WeatherSnapshot | null {
  const cache = readCache();
  const value = cache[locationId];
  if (!value || !value.current || !Array.isArray(value.hourly) || !Array.isArray(value.daily)) {
    return null;
  }
  return { ...value, source: "cache" };
}

export function writeCachedSnapshot(snapshot: WeatherSnapshot) {
  const cache = readCache();
  const next: SnapshotCache = {
    ...cache,
    [snapshot.location.id]: snapshot,
  };
  const keys = Object.keys(next);
  if (keys.length > 12) {
    keys
      .sort((a, b) => new Date(next[b].fetchedAt).getTime() - new Date(next[a].fetchedAt).getTime())
      .slice(12)
      .forEach((key) => {
        delete next[key];
      });
  }
  safeWriteStorage(WEATHER_CACHE_KEY, next);
}
