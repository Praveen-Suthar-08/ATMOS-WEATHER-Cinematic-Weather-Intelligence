import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { useQueries } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  Clipboard,
  CloudRain,
  Droplets,
  Loader2,
  LocateFixed,
  Moon,
  RefreshCw,
  Search,
  Share2,
  Star,
  Sunrise,
  Sunset,
  Trash2,
  Globe,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import type { KeyboardEvent } from "react";
import { MoonPhaseDisplay } from "@/components/MoonPhaseDisplay";
import { WeatherConditionIcon } from "@/components/WeatherConditionIcon";
import { RadarPanel } from "@/components/RadarPanel";
import { SunriseSunsetArc } from "@/components/SunriseSunsetArc";
import { WeatherMoodBanner } from "@/components/WeatherMoodBanner";
import { WeatherTimeline } from "@/components/WeatherTimeline";
import { OutfitRecommendation } from "@/components/OutfitRecommendation";
import { WeatherSummaryCard } from "@/components/WeatherSummaryCard";
import { WeatherBackground } from "@/components/WeatherBackground";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFavorites } from "@/hooks/useFavorites";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePreferences } from "@/hooks/usePreferences";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useWeather } from "@/hooks/useWeather";
import { reverseGeocodeCoordinates } from "@/services/locationLabelService";
import { fetchNowcast15Min, fetchWeather, fetchYesterdayComparison } from "@/services/openMeteoClient";
import type { DailyWeather, LocationOption } from "@/types/models";
import { formatLocalTime } from "@/utils/dateTime";
import { safeReadStorage, safeRemoveStorage, safeWriteStorage } from "@/utils/storage";
import { formatValue, toTemperature, toWind, windDirectionToLabel } from "@/utils/units";
import { weatherCodeMeta } from "@/utils/weatherCode";

const SELECTED_LOCATION_KEY = "atmos-selected-location-v1";

const defaultLocation: LocationOption = {
  id: "london_51.507_-0.128",
  name: "London",
  country: "United Kingdom",
  latitude: 51.5072,
  longitude: -0.1276,
  timezone: "Europe/London",
};

function useSelectedLocation() {
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = Number(params.get("lat"));
    const lon = Number(params.get("lon"));
    const rawName = params.get("name")?.trim() ?? "";
    // Validate untrusted share-link input: coordinates must be real-world
    // ranges and the label is length-capped before it is used anywhere.
    const validCoords =
      Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    if (validCoords && rawName.length > 0 && rawName.length <= 100) {
      return {
        id: `share_${lat.toFixed(3)}_${lon.toFixed(3)}`,
        name: rawName.slice(0, 100),
        latitude: lat,
        longitude: lon,
      };
    }
    const saved = safeReadStorage<LocationOption | null>(SELECTED_LOCATION_KEY, null);
    return saved && saved.id ? saved : defaultLocation;
  });

  useEffect(() => {
    safeWriteStorage(SELECTED_LOCATION_KEY, selectedLocation);
  }, [selectedLocation]);

  return { selectedLocation, setSelectedLocation };
}

function locationLabel(location: LocationOption) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(", ");
}

function getHeroImage(weatherCode: number | null, isDay: boolean | null, today?: DailyWeather | null) {
  if (isDay === false) return "/images/hero-night.jpg";

  // Sunset/Sunrise check
  if (today?.sunrise && today?.sunset) {
    const now = Date.now();
    const sunrise = new Date(today.sunrise).getTime();
    const sunset = new Date(today.sunset).getTime();
    // Use sunset image if within 75 mins of sunrise or sunset
    if (Math.abs(now - sunrise) < 75 * 60 * 1000 || Math.abs(now - sunset) < 75 * 60 * 1000) {
      return "/images/hero-sunset.jpg";
    }
  }

  const mood = weatherCodeMeta(weatherCode).mood;
  if (mood === "storm") return "/images/hero-storm.jpg";
  if (mood === "snow") return "/images/hero-snow.jpg";
  if (mood === "fog") return "/images/hero-fog.jpg";
  if (mood === "rain") return "/images/hero-rain.jpg";
  if (mood === "clouds") return "/images/hero-cloudy.jpg";
  return "/images/hero-clear.jpg";
}

function prefers12h(clockFormat: "system" | "12h" | "24h") {
  if (clockFormat === "system") return undefined;
  return clockFormat === "12h";
}

export default function App() {
  const online = useOnlineStatus();
  const { selectedLocation, setSelectedLocation } = useSelectedLocation();
  const { favorites, isFavorite, addFavorite, removeFavorite, clearFavorites } = useFavorites();
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const { preferences, resolvedTheme, setTheme, setTemperatureUnit, setClockFormat, clearPreferences } = usePreferences();
  const weatherQuery = useWeather(selectedLocation);

  const [search, setSearch] = useState("");
  const [openResults, setOpenResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [activeModule, setActiveModule] = useState("overview");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 220);
  const searchQuery = useLocationSearch(debouncedSearch);
  const results = searchQuery.data ?? [];
  const listboxId = "search-results";
  const isLight = resolvedTheme === "light";
  const cardSurface = isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-700 bg-slate-900/50 text-white";
  const subtleText = isLight ? "text-slate-600" : "text-slate-300";
  const accentText = isLight ? "text-cyan-700" : "text-cyan-200";
  const errorText = isLight ? "text-rose-600" : "text-rose-300";
  const iconAccent = isLight ? "text-cyan-600" : "text-cyan-300";

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!online) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void weatherQuery.refetch();
      }
    }, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [online, weatherQuery]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const snapshot = weatherQuery.data;
  const hour12 = prefers12h(preferences.clockFormat);
  const timeTag = preferences.clockFormat === "24h" ? "24h" : preferences.clockFormat === "12h" ? "12h" : "system";

  const formatInZone = (value: string | null, timezone: string, options: Intl.DateTimeFormatOptions) =>
    formatLocalTime(value, timezone, { ...options, hour12 });

  const selectedHour = snapshot?.hourly[selectedHourIndex] ?? null;
  const stale = snapshot ? Date.now() - new Date(snapshot.fetchedAt).getTime() > 10 * 60 * 1000 || snapshot.source === "cache" : false;
  const condition = weatherCodeMeta(snapshot?.current.weatherCode ?? null);

  const nowcastQuery = useQuery({
    queryKey: ["nowcast15", selectedLocation.id],
    queryFn: ({ signal }) => fetchNowcast15Min(selectedLocation, signal),
    staleTime: 5 * 60 * 1000,
  });

  const historicalQuery = useQuery({
    queryKey: ["historical-yesterday", selectedLocation.id],
    queryFn: ({ signal }) => fetchYesterdayComparison(selectedLocation, signal),
    staleTime: 2 * 60 * 60 * 1000,
  });

  const airQualityQuery = useAirQuality(selectedLocation);

  const aqiCategory = useMemo(() => {
    const aqi = airQualityQuery.data?.usAqi ?? null;
    if (aqi === null) return null;
    if (aqi <= 50) return { label: "Good", color: "#22c55e" };
    if (aqi <= 100) return { label: "Moderate", color: "#eab308" };
    if (aqi <= 150) return { label: "Unhealthy for sensitive groups", color: "#f97316" };
    if (aqi <= 200) return { label: "Unhealthy", color: "#ef4444" };
    if (aqi <= 300) return { label: "Very unhealthy", color: "#a855f7" };
    return { label: "Hazardous", color: "#881337" };
  }, [airQualityQuery.data]);

  const comparisonLocations = useMemo(() => {
    const unique = [selectedLocation, ...favorites].reduce<LocationOption[]>((acc, item) => {
      if (!acc.find((x) => x.id === item.id)) {
        acc.push(item);
      }
      return acc;
    }, []);
    return unique.slice(0, 4);
  }, [favorites, selectedLocation]);

  const comparisonQueries = useQueries({
    queries: comparisonLocations.map((location) => ({
      queryKey: ["compare-lite", location.id],
      queryFn: ({ signal }: { signal?: AbortSignal }) => fetchWeather(location, signal),
      staleTime: 10 * 60 * 1000,
    })),
  });

  const weatherAlerts = useMemo(() => {
    if (!snapshot) return [] as string[];
    const alerts: string[] = [];
    if ((snapshot.current.windSpeedKmh ?? 0) > 50) alerts.push("High wind advisory: Strong gusts detected.");
    if ((snapshot.current.temperatureC ?? 0) > 38) alerts.push("Heat advisory: Extreme temperatures expected.");
    if ((snapshot.current.temperatureC ?? 0) < -5) alerts.push("Cold advisory: Sub-zero conditions.");
    if (snapshot.hourly.some(h => (h.precipitationProbability ?? 0) > 80)) alerts.push("Heavy rain potential: High precipitation risk.");
    return alerts;
  }, [snapshot]);

  const weatherStory = useMemo(() => {
     if (!snapshot) return "";
     const today = snapshot.daily[0];
     const tomorrow = snapshot.daily[1];
     if (!today || !tomorrow) return "";

     const tempPart = `Today's high is ${formatValue(toTemperature(today.temperatureMaxC, preferences.units.temperature), 0)}°, with a low of ${formatValue(toTemperature(today.temperatureMinC, preferences.units.temperature), 0)}°.`;
     const rainPart = (today.precipitationProbabilityMax ?? 0) > 30 ? ` Expect some rain today (${today.precipitationProbabilityMax}% chance).` : " It should stay mostly dry today.";
     const tomorrowPart = ` Tomorrow looks ${weatherCodeMeta(tomorrow.weatherCode).label.toLowerCase()} with a high of ${formatValue(toTemperature(tomorrow.temperatureMaxC, preferences.units.temperature), 0)}°.`;

     return `${tempPart}${rainPart}${tomorrowPart}`;
  }, [snapshot, preferences.units.temperature]);

  const insights = useMemo(() => {
    if (!snapshot) return [] as string[];
    const rainPeak = [...snapshot.hourly].sort((a, b) => (b.precipitationProbability ?? 0) - (a.precipitationProbability ?? 0))[0];
    const warmest = [...snapshot.hourly].sort((a, b) => (b.temperatureC ?? -999) - (a.temperatureC ?? -999))[0];
    const windy = [...snapshot.hourly].sort((a, b) => (b.windSpeedKmh ?? 0) - (a.windSpeedKmh ?? 0))[0];

    const list = [
      rainPeak && (rainPeak.precipitationProbability ?? 0) > 10 ? `Rain risk peaks around ${formatInZone(rainPeak.time, snapshot.timezone, { hour: "numeric", minute: "2-digit" })} at ${formatValue(rainPeak.precipitationProbability, 0)}%.` : null,
      warmest ? `Warmest period is near ${formatInZone(warmest.time, snapshot.timezone, { hour: "numeric", minute: "2-digit" })}.` : null,
      windy ? `Wind may increase to ${formatValue(toWind(windy.windSpeedKmh, preferences.units.wind), 1)} ${preferences.units.wind}.` : null,
      snapshot.daily[0]?.moonPhase ? `Tonight's moon phase is ${snapshot.daily[0].moonPhase > 0.5 ? 'Waning' : 'Waxing'}.` : null
    ].filter((x): x is string => x !== null);

    return list;
  }, [snapshot, preferences.units.wind, preferences.clockFormat]);

  const nowcastSummary = useMemo(() => {
    const points = nowcastQuery.data ?? [];
    if (points.length === 0) {
      return "Nowcast not available.";
    }
    const peak = points.reduce((max, point) => {
      const value = point.precipitationMm ?? 0;
      const maxValue = max.precipitationMm ?? 0;
      return value > maxValue ? point : max;
    }, points[0]);
    const peakValue = peak.precipitationMm ?? 0;
    if (peakValue < 0.01) {
      return "Dry conditions expected in the next 6 hours.";
    }
    return `Peak precipitation around ${formatInZone(peak.time, snapshot?.timezone ?? "UTC", { hour: "numeric", minute: "2-digit" })}: ${peakValue.toFixed(2)} mm/15min.`;
  }, [nowcastQuery.data, snapshot?.timezone, preferences.clockFormat]);

  const activityScores = useMemo(() => {
    if (!snapshot) return [] as Array<{ label: string; score: number }>;
    const rain = selectedHour?.precipitationProbability ?? 0;
    const wind = selectedHour?.windSpeedKmh ?? 0;
    const uv = snapshot.daily[0]?.uvMax ?? 0;
    const temp = snapshot.current.temperatureC ?? 20;

    const outdoor = Math.max(0, 100 - rain * 0.8 - wind * 1.2 - Math.max(0, uv - 5) * 6);
    const run = Math.max(0, 100 - rain * 0.7 - wind * 1.3 - Math.abs(temp - 20) * 2.5);
    const cycling = Math.max(0, 100 - rain * 0.8 - wind * 1.7 - Math.abs(temp - 18) * 2);
    const stargazing = snapshot.current.isDay ? 5 : Math.max(0, 100 - rain);

    return [
      { label: "Outdoor", score: Math.round(outdoor) },
      { label: "Running", score: Math.round(run) },
      { label: "Cycling", score: Math.round(cycling) },
      { label: "Stargazing", score: Math.round(stargazing) },
    ];
  }, [snapshot, selectedHour]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("lat", String(selectedLocation.latitude));
    params.set("lon", String(selectedLocation.longitude));
    params.set("name", selectedLocation.name);
    params.set("temp", preferences.units.temperature);
    params.set("clock", preferences.clockFormat);
    params.set("module", activeModule);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [selectedLocation, preferences.units.temperature, preferences.clockFormat, activeModule]);

  const currentLocalTime = snapshot
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12,
        timeZone: snapshot.timezone,
      }).format(clockTick)
    : "-";

  const hourlyChartData = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.hourly.map((hour) => ({
      time: formatInZone(hour.time, snapshot.timezone, { hour: "numeric" }),
      temperature: toTemperature(hour.temperatureC, preferences.units.temperature),
      rain: hour.precipitationProbability,
    }));
  }, [snapshot, preferences.units.temperature, preferences.clockFormat]);

  const dayTempRange = useMemo(() => {
    if (!snapshot || snapshot.daily.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...snapshot.daily.map((d) => d.temperatureMinC ?? 0)),
      max: Math.max(...snapshot.daily.map((d) => d.temperatureMaxC ?? 0)),
    };
  }, [snapshot]);

  const onSelectLocation = (location: LocationOption) => {
    setSelectedLocation(location);
    addRecentSearch(location);
    setOpenResults(false);
    setSearch(locationLabel(location));
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!openResults || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const choice = results[activeIndex];
      if (choice) onSelectLocation(choice);
    }
    if (event.key === "Escape") setOpenResults(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(3));
        const longitude = Number(position.coords.longitude.toFixed(3));
        let name = "Current location";
        let admin1: string | undefined;
        let country: string | undefined;

        try {
          const label = await reverseGeocodeCoordinates(latitude, longitude);
          name = label.name;
          admin1 = label.admin1;
          country = label.country;
        } catch {
          // Use generic label on reverse geocode failure.
        }

        const location: LocationOption = {
          id: `geo_${latitude.toFixed(3)}_${longitude.toFixed(3)}`,
          name,
          admin1,
          country,
          latitude,
          longitude,
        };
        setSelectedLocation(location);
        addRecentSearch(location);
        setMessage(`Using ${locationLabel(location)}.`);
      },
      (error) => {
        setMessage(error.code === error.PERMISSION_DENIED ? "Location permission denied. Search manually." : "Unable to detect location.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const clearLocalData = () => {
    if (!window.confirm("Clear local preferences, favorites, and recent searches?")) return;
    clearFavorites();
    clearRecentSearches();
    clearPreferences();
    safeRemoveStorage(SELECTED_LOCATION_KEY);
    setSelectedLocation(defaultLocation);
    setMessage("Local data cleared.");
  };

  const shareDeepLink = async () => {
    const params = new URLSearchParams(window.location.search);
    params.set("lat", String(selectedLocation.latitude));
    params.set("lon", String(selectedLocation.longitude));
    params.set("name", selectedLocation.name);
    params.set("temp", preferences.units.temperature);
    params.set("clock", preferences.clockFormat);
    params.set("module", activeModule);
    const link = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Shareable link copied.");
    } catch {
      setMessage("Could not copy link.");
    }
  };

  const jumpToModule = (moduleId: string) => {
    setActiveModule(moduleId);
    document.getElementById(moduleId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setMessage("Notifications are not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    setNotificationsEnabled(enabled);
    setMessage(enabled ? "Notifications enabled." : "Notifications permission denied.");
  };

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-white"}`}>
      <header className="mx-auto w-full max-w-[1440px] px-4 pb-5 pt-6 md:px-8 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <p className={`text-sm tracking-[0.22em] ${isLight ? "text-cyan-700" : "text-cyan-200/90"}`}>ATMOS WEATHER</p>
            <p className={`text-3xl font-semibold leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>Cinematic weather intelligence</p>
          </div>

          <div className="relative min-w-0 lg:col-span-2 lg:order-3">
            <label htmlFor="city-search" className="sr-only">
              Search city or postcode
            </label>
            <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 backdrop-blur ${isLight ? "border-slate-300 bg-white/90" : "border-slate-700 bg-slate-900/70"}`}>
              <Search className={`h-4 w-4 ${isLight ? "text-slate-600" : "text-slate-300"}`} aria-hidden="true" />
              <input
                id="city-search"
                value={search}
                onFocus={() => setOpenResults(true)}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setOpenResults(true);
                }}
                onKeyDown={onSearchKeyDown}
                className={`min-w-0 flex-1 bg-transparent outline-none ${isLight ? "text-slate-900 placeholder:text-slate-500" : "text-white placeholder:text-slate-400"}`}
                placeholder="Search city or postcode"
                role="combobox"
                aria-expanded={openResults}
                aria-controls={listboxId}
              />
            </div>

            <AnimatePresence>
              {openResults && debouncedSearch.trim().length >= 2 && (
                <motion.ul
                  id={listboxId}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border p-1 shadow-2xl ${isLight ? "border-slate-300 bg-white/95" : "border-slate-700 bg-slate-900/95"}`}
                >
                  {searchQuery.isLoading && (
                    <li className={`px-3 py-2 text-sm ${subtleText}`}>
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Searching locations...
                      </span>
                    </li>
                  )}
                  {searchQuery.isError && <li className={`px-3 py-2 text-sm ${errorText}`}>Search failed. Try another query.</li>}
                  {!searchQuery.isLoading && results.length === 0 && <li className={`px-3 py-2 text-sm ${subtleText}`}>No matches found.</li>}
                  {results.map((result, index) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${isLight ? "hover:bg-slate-100" : "hover:bg-slate-800/70"}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onSelectLocation(result)}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-medium">{result.name}</span>
                          {index === 0 && (
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${isLight ? "border-slate-300 text-slate-600" : "border-slate-600 text-slate-300"}`}>
                              Top match
                            </span>
                          )}
                        </span>
                        <span className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>{[result.admin1, result.country].filter(Boolean).join(", ") || "Location"}</span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button onClick={handleUseMyLocation} className={`rounded-xl border px-3 py-2 text-sm backdrop-blur transition hover:-translate-y-0.5 ${isLight ? "border-slate-300 bg-white/90" : "border-slate-700 bg-slate-900/70"}`}>
              <span className="inline-flex items-center gap-2">
                <LocateFixed className="h-4 w-4" /> My location
              </span>
            </button>

            <button
              onClick={() => weatherQuery.refetch()}
              disabled={weatherQuery.isFetching}
              className={`rounded-xl border px-3 py-2 text-sm backdrop-blur transition hover:-translate-y-0.5 disabled:opacity-60 ${isLight ? "border-slate-300 bg-white/90" : "border-slate-700 bg-slate-900/70"}`}
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${weatherQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
              </span>
            </button>

            <button onClick={clearLocalData} className={`rounded-xl border px-3 py-2 text-sm backdrop-blur transition hover:-translate-y-0.5 ${isLight ? "border-slate-300 bg-white/90" : "border-slate-700 bg-slate-900/70"}`}>
              <span className="inline-flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Clear data
              </span>
            </button>

            <button onClick={shareDeepLink} className={`rounded-xl border px-3 py-2 text-sm backdrop-blur transition hover:-translate-y-0.5 ${isLight ? "border-slate-300 bg-white/90" : "border-slate-700 bg-slate-900/70"}`}>
              <span className="inline-flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Share
              </span>
            </button>

            <select
              aria-label="Theme mode"
              value={preferences.theme}
              onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")}
              className={`rounded-xl border px-3 py-2 text-sm backdrop-blur ${isLight ? "border-slate-300 bg-white/90" : "border-slate-700 bg-slate-900/70"}`}
            >
              <option value="system">System theme</option>
              <option value="light">Light theme</option>
              <option value="dark">Dark theme</option>
            </select>

            <select
              aria-label="Time format"
              value={preferences.clockFormat}
              onChange={(event) => setClockFormat(event.target.value as "system" | "12h" | "24h")}
              className={`rounded-xl border px-3 py-2 text-sm backdrop-blur ${isLight ? "border-slate-300 bg-white/90" : "border-slate-700 bg-slate-900/70"}`}
            >
              <option value="system">System</option>
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>

            <select
              aria-label="Temperature unit"
              value={preferences.units.temperature}
              onChange={(event) => setTemperatureUnit(event.target.value as "celsius" | "fahrenheit")}
              className={`rounded-xl border px-3 py-2 text-sm backdrop-blur ${isLight ? "border-slate-300 bg-white/90" : "border-slate-700 bg-slate-900/70"}`}
            >
              <option value="celsius">Celsius</option>
              <option value="fahrenheit">Fahrenheit</option>
            </select>
          </div>
        </div>

        {!online && (
          <p className={`mt-3 rounded-xl border px-3 py-2 text-sm ${isLight ? "border-amber-300 bg-amber-50 text-amber-800" : "border-amber-400/20 bg-amber-500/10 text-amber-200"}`}>
            Offline mode: cached weather may be shown.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {[
            ["overview", "Overview"],
            ["nowcast", "Nowcast"],
            ["insights", "Insights"],
            ["radar", "Radar"],
            ["reliability", "Reliability"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => jumpToModule(id)}
              className={`rounded-full border px-2.5 py-1 ${
                activeModule === id
                  ? isLight
                    ? "border-cyan-600 bg-cyan-100 text-cyan-800"
                    : "border-cyan-300 bg-cyan-500/10 text-cyan-200"
                  : isLight
                    ? "border-slate-300 text-slate-700"
                    : "border-slate-700 text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pb-10 md:px-8 lg:px-10">
        {weatherQuery.isLoading && <div className={`h-80 animate-pulse rounded-3xl ${isLight ? "bg-slate-200" : "bg-slate-800/70"}`} />}

        {snapshot && (
          <>
            <div className="flex flex-col gap-3">
              <WeatherMoodBanner
                weatherCode={snapshot.current.weatherCode}
                isDay={snapshot.current.isDay}
                temperatureC={snapshot.current.temperatureC}
                uvMax={snapshot.daily[0]?.uvMax ?? null}
                windSpeedKmh={snapshot.current.windSpeedKmh}
              />
              <div className={`panel-luxe rounded-2xl border p-4 backdrop-blur ${cardSurface}`}>
                 <h4 className="text-xs font-bold uppercase tracking-widest opacity-60">Daily Briefing</h4>
                 <p className="mt-2 text-sm leading-relaxed">{weatherStory}</p>
              </div>
            </div>
            {weatherAlerts.length > 0 && (
              <div className={`rounded-2xl border p-4 ${isLight ? "border-rose-300 bg-rose-50 text-rose-800" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Local Weather Advisories
                </h4>
                <ul className="mt-2 space-y-1 text-sm font-medium">
                  {weatherAlerts.map(alert => <li key={alert}>{alert}</li>)}
                </ul>
              </div>
            )}
          </>
        )}

        {weatherQuery.isError && (
          <section className={`rounded-3xl border p-5 ${cardSurface}`}>
            <h2 className="text-lg font-semibold">Unable to load weather</h2>
            <p className={`mt-1 text-sm ${subtleText}`}>Please retry or search another location.</p>
            <button onClick={() => weatherQuery.refetch()} className={`mt-3 rounded-xl border px-3 py-2 text-sm ${isLight ? "border-slate-300" : "border-slate-700"}`}>
              Retry
            </button>
          </section>
        )}

        {snapshot && (
          <>
            <section id="overview" className="relative overflow-hidden rounded-[28px] border border-slate-700">
              <motion.img
                key={`${snapshot.location.id}-${snapshot.current.weatherCode}-${snapshot.current.isDay}`}
                src={getHeroImage(snapshot.current.weatherCode, snapshot.current.isDay, snapshot.daily[0])}
                className="h-[24rem] w-full object-cover md:h-[27rem]"
                alt="Weather sky"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
              <WeatherBackground weatherCode={snapshot.current.weatherCode} isDay={snapshot.current.isDay} today={snapshot.daily[0] ?? null} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-900/15" />

              <div className="absolute inset-0 p-5 text-white md:p-8">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-100">{locationLabel(snapshot.location)}</p>
                      <p className="text-sm text-slate-200">{currentLocalTime} ({timeTag})</p>
                    </div>

                    <div className="relative flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => {
                          if (isFavorite(snapshot.location.id)) {
                            removeFavorite(snapshot.location.id);
                            setMessage("Removed favorite.");
                            return;
                          }
                          addFavorite(snapshot.location);
                          setMessage("Saved favorite.");
                        }}
                        className="rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm backdrop-blur transition hover:-translate-y-0.5"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Star className="h-4 w-4" /> Save favorite
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          const summary = `${snapshot.location.name}: ${formatValue(toTemperature(snapshot.current.temperatureC, preferences.units.temperature), 0)}${preferences.units.temperature === "celsius" ? "C" : "F"}, ${condition.label}.`;
                          void navigator.clipboard.writeText(summary).then(() => setMessage("Summary copied."));
                        }}
                        className="rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm backdrop-blur transition hover:-translate-y-0.5"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Clipboard className="h-4 w-4" /> Copy summary
                        </span>
                      </button>

                      <button
                        onClick={() => setShowMore((prev) => !prev)}
                        className="rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm backdrop-blur transition hover:-translate-y-0.5"
                        aria-expanded={showMore}
                      >
                        More details
                      </button>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`absolute right-0 top-12 z-20 w-[min(32rem,92vw)] rounded-2xl border p-4 text-xs shadow-2xl backdrop-blur-xl ${
                    isLight ? "border-slate-300 bg-white/95 text-slate-800" : "border-white/25 bg-slate-900/90 text-slate-100"
                  }`}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1">
                        <p>Wind direction: {windDirectionToLabel(snapshot.current.windDirectionDeg)}</p>
                        <p>Pressure: {formatValue(snapshot.current.pressureHpa, 0)} hPa</p>
                        <p>Visibility: {formatValue(snapshot.current.visibilityM === null ? null : snapshot.current.visibilityM / 1000, 1)} km</p>
                      </div>
                      <div className="space-y-1">
                        <p>Rain chance now: {formatValue(selectedHour?.precipitationProbability ?? null, 0)}%</p>
                        <p>Updated: {formatInZone(snapshot.fetchedAt, snapshot.timezone, { hour: "numeric", minute: "2-digit" })}</p>
                        <p>{stale ? "Using cached data" : "Live snapshot"}</p>
                      </div>
                      <div className={`lg:col-span-2 flex items-center justify-around border-l pl-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
                         <MoonPhaseDisplay phase={snapshot.daily[0]?.moonPhase} isLight={isLight} />
                         <div className="text-center">
                            <p className={`text-[10px] uppercase tracking-widest ${isLight ? "text-slate-500" : "text-slate-400"}`}>Moonrise</p>
                            <p className="text-sm font-medium">{formatInZone(snapshot.daily[0]?.moonrise ?? null, snapshot.timezone, { hour: "numeric", minute: "2-digit" })}</p>
                            <p className={`text-[10px] uppercase tracking-widest mt-2 ${isLight ? "text-slate-500" : "text-slate-400"}`}>Moonset</p>
                            <p className="text-sm font-medium">{formatInZone(snapshot.daily[0]?.moonset ?? null, snapshot.timezone, { hour: "numeric", minute: "2-digit" })}</p>
                         </div>
                      </div>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                      <p className="inline-flex rounded-full border border-white/35 bg-black/20 px-3 py-1 text-xs text-slate-100">{condition.label}</p>
                      <div className="mt-2 flex items-end gap-3">
                        <h1 className="tabular text-[clamp(3rem,10vw,6.4rem)] font-semibold leading-none">
                          {formatValue(toTemperature(snapshot.current.temperatureC, preferences.units.temperature), 0)}
                          {preferences.units.temperature === "celsius" ? "C" : "F"}
                        </h1>
                        <WeatherConditionIcon weatherCode={snapshot.current.weatherCode} isDay={snapshot.current.isDay} className="h-14 w-14" />
                      </div>
                      <p className="mt-1 text-base text-slate-100">
                        Feels like {formatValue(toTemperature(snapshot.current.apparentTemperatureC, preferences.units.temperature), 0)}
                        {preferences.units.temperature === "celsius" ? "C" : "F"}
                      </p>
                    </div>

                    <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/35 p-3 text-sm backdrop-blur-xl">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-100">
                        <p>
                          High/Low {formatValue(toTemperature(snapshot.daily[0]?.temperatureMaxC ?? null, preferences.units.temperature), 0)} / {formatValue(toTemperature(snapshot.daily[0]?.temperatureMinC ?? null, preferences.units.temperature), 0)}
                        </p>
                        <p>Humidity {formatValue(snapshot.current.humidity, 0)}%</p>
                        <p>Rain chance {formatValue(selectedHour?.precipitationProbability ?? null, 0)}%</p>
                        <p>Sunrise {formatInZone(snapshot.daily[0]?.sunrise ?? null, snapshot.timezone, { hour: "numeric", minute: "2-digit" })}</p>
                        <p>Sunset {formatInZone(snapshot.daily[0]?.sunset ?? null, snapshot.timezone, { hour: "numeric", minute: "2-digit" })}</p>
                        <p>Wind {formatValue(toWind(snapshot.current.windSpeedKmh, preferences.units.wind), 1)} {preferences.units.wind}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)] lg:items-start">
              <article className={`min-w-0 rounded-3xl border p-4 backdrop-blur ${cardSurface}`}>
                <h2 className="text-lg font-semibold">24-hour forecast</h2>
                <p className={`text-xs ${subtleText}`}>Temperature trend with precipitation context</p>

                <div className="mt-3 h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyChartData} margin={{ top: 12, right: 8, left: -18, bottom: 8 }}>
                      <defs>
                        <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#cbd5e1" : "#334155"} />
                      <XAxis dataKey="time" tick={{ fill: isLight ? "#475569" : "#a6b3c7", fontSize: 12 }} />
                      <YAxis tick={{ fill: isLight ? "#475569" : "#a6b3c7", fontSize: 12 }} width={36} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isLight ? "#ffffff" : "#0f172a",
                          color: isLight ? "#0f172a" : "#f8fafc",
                          border: `1px solid ${isLight ? "#cbd5e1" : "#334155"}`,
                          borderRadius: "12px",
                        }}
                        labelStyle={{ color: isLight ? "#334155" : "#cbd5e1" }}
                        itemStyle={{ color: isLight ? "#0f172a" : "#f8fafc" }}
                      />
                      <Area type="monotone" dataKey="temperature" stroke={isLight ? "#0284c7" : "#7dd3fc"} fill="url(#tempFill)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 w-full overflow-x-auto pb-1">
                  <ul className="flex w-max gap-2">
                    {snapshot.hourly.slice(0, 12).map((hour, index) => (
                      <li key={hour.time}>
                        <button
                          onClick={() => setSelectedHourIndex(index)}
                          className={`w-32 rounded-xl border px-2.5 py-2 text-left transition ${
                            selectedHourIndex === index
                              ? isLight
                                ? "border-cyan-400 bg-cyan-50"
                                : "border-cyan-300/70 bg-slate-800/80"
                              : isLight
                                ? "border-slate-300 bg-white hover:bg-slate-100"
                                : "border-slate-700 bg-slate-900/50 hover:bg-slate-800/60"
                          }`}
                        >
                          <p className={`text-[11px] ${subtleText}`}>{formatInZone(hour.time, snapshot.timezone, { hour: "numeric" })}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <WeatherConditionIcon weatherCode={hour.weatherCode} className="h-4 w-4" />
                            <p className={`tabular text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                              {formatValue(toTemperature(hour.temperatureC, preferences.units.temperature), 0)}
                              {preferences.units.temperature === "celsius" ? "C" : "F"}
                            </p>
                          </div>
                          <p className={`mt-1 truncate text-[11px] ${subtleText}`}>{weatherCodeMeta(hour.weatherCode).label}</p>
                          <p className={`text-[11px] ${isLight ? "text-cyan-700" : "text-cyan-200"}`}>Rain {formatValue(hour.precipitationProbability, 0)}%</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedHour && (
                  <div className={`mt-3 rounded-xl border p-3 text-sm ${isLight ? "border-slate-300 bg-slate-100 text-slate-700" : "border-slate-700 bg-slate-800/45 text-slate-200"}`}>
                    Selected {formatInZone(selectedHour.time, snapshot.timezone, { hour: "numeric", minute: "2-digit" })}: temp {formatValue(toTemperature(selectedHour.temperatureC, preferences.units.temperature), 0)}
                    {preferences.units.temperature === "celsius" ? "C" : "F"}, rain {formatValue(selectedHour.precipitationProbability, 0)}%, wind {formatValue(toWind(selectedHour.windSpeedKmh, preferences.units.wind), 1)} {preferences.units.wind}.
                  </div>
                )}
              </article>

              <article className={`min-w-0 rounded-3xl border p-4 backdrop-blur ${cardSurface}`}>
                <h2 className="text-lg font-semibold">7-day outlook</h2>
                <ul className="mt-3 space-y-1.5">
                  {snapshot.daily.map((day) => {
                    const dayMeta = weatherCodeMeta(day.weatherCode);
                    const min = day.temperatureMinC ?? dayTempRange.min;
                    const max = day.temperatureMaxC ?? dayTempRange.max;
                    const rangeWidth = Math.max(8, ((max - min) / Math.max(1, dayTempRange.max - dayTempRange.min)) * 100);
                    return (
                      <li key={day.time}>
                        <button
                          className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                            isLight ? "border-slate-300 hover:bg-slate-100" : "border-slate-700 hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{formatInZone(day.time, snapshot.timezone, { weekday: "short", month: "short", day: "numeric" })}</p>
                            <p className={`truncate text-xs ${subtleText}`}>{dayMeta.label}</p>
                            <div className={`mt-1 h-1.5 rounded-full ${isLight ? "bg-slate-200" : "bg-slate-700"}`}>
                              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${rangeWidth}%` }} />
                            </div>
                          </div>
                          <p className={`text-xs ${subtleText}`}>{formatValue(day.precipitationProbabilityMax, 0)}%</p>
                          <p className="tabular text-sm font-semibold">
                            {formatValue(toTemperature(day.temperatureMaxC, preferences.units.temperature), 0)} / {formatValue(toTemperature(day.temperatureMinC, preferences.units.temperature), 0)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </article>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric isLight={isLight} icon={Droplets} label="Humidity" value={`${formatValue(snapshot.current.humidity, 0)}%`} />
              <Metric isLight={isLight} icon={Wind} label="Wind" value={`${formatValue(toWind(snapshot.current.windSpeedKmh, preferences.units.wind), 1)} ${preferences.units.wind}`} subValue={windDirectionToLabel(snapshot.current.windDirectionDeg)} />
              <Metric isLight={isLight} icon={Wind} label="Wind Gusts" value={`${formatValue(toWind(snapshot.current.windGustsKmh, preferences.units.wind), 1)} ${preferences.units.wind}`} />
              <Metric isLight={isLight} icon={CloudRain} label="Precipitation" value={`${formatValue(snapshot.current.precipitationMm, 1)} mm`} />
              <Metric isLight={isLight} icon={Sunrise} label="Sunrise" value={formatInZone(snapshot.daily[0]?.sunrise ?? null, snapshot.timezone, { hour: "numeric", minute: "2-digit" })} />
              <Metric isLight={isLight} icon={Sunset} label="Sunset" value={formatInZone(snapshot.daily[0]?.sunset ?? null, snapshot.timezone, { hour: "numeric", minute: "2-digit" })} />
              <Metric isLight={isLight} icon={Droplets} label="Rain Chance" value={`${formatValue(snapshot.daily[0]?.precipitationProbabilityMax ?? null, 0)}%`} />
              <div className={`panel-luxe rounded-2xl border p-4 backdrop-blur transition hover:-translate-y-0.5 ${isLight ? "border-slate-300 bg-white" : "border-slate-700 bg-slate-900/50"}`}>
                 <p className={`inline-flex items-center gap-2 text-sm ${subtleText}`}>
                    <Moon className={`h-4 w-4 ${iconAccent}`} /> Moon Phase
                 </p>
                 <div className="mt-1 flex items-center justify-between">
                    <MoonPhaseDisplay phase={snapshot.daily[0]?.moonPhase} isLight={isLight} />
                    <p className={`tabular text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {formatValue((snapshot.daily[0]?.moonPhase ?? 0) * 100, 0)}%
                    </p>
                 </div>
              </div>
            </section>



            {/* Lifestyle & Summary Section */}
            <section className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1">
                 <OutfitRecommendation
                   temperatureC={snapshot.current.temperatureC}
                   precipProbability={snapshot.daily[0]?.precipitationProbabilityMax ?? null}
                   windSpeedKmh={snapshot.current.windSpeedKmh}
                   isLight={isLight}
                 />
              </div>
              <div className={`panel-luxe rounded-2xl border p-4 backdrop-blur lg:col-span-1 ${cardSurface}`}>
                <h3 className="text-sm font-semibold uppercase tracking-wider opacity-60">Activity Suitability</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {activityScores.map((score) => (
                    <div key={score.label} className={`rounded-xl border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-700 bg-slate-800/40"}`}>
                      <p className={`text-[10px] uppercase tracking-tighter ${subtleText}`}>{score.label}</p>
                      <div className="mt-1 flex items-center justify-between">
                         <span className="tabular text-lg font-bold">{score.score}</span>
                         <div className={`h-1.5 w-12 overflow-hidden rounded-full ${isLight ? "bg-slate-200" : "bg-slate-700"}`}>
                             <div className={`h-full ${isLight ? "bg-cyan-600" : "bg-cyan-400"}`} style={{ width: `${score.score}%` }} />
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-1">
                 <WeatherSummaryCard
                   snapshot={snapshot}
                   temperatureUnit={preferences.units.temperature}
                   windUnit={preferences.units.wind}
                   isLight={isLight}
                   onCopied={() => setMessage("Weather summary copied.")}
                 />
              </div>
            </section>

            {/* Sunrise/Sunset Arc + Enhanced Timeline */}
            <section className="grid gap-4 lg:grid-cols-2">
              <div className={`rounded-3xl border p-4 ${cardSurface}`}>
                <h3 className={`text-lg font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>☀️ Sunrise & Sunset</h3>
                <p className={`text-xs ${subtleText}`}>Daylight arc for today at {snapshot.location.name}</p>
                {snapshot.daily[0] ? (
                  <SunriseSunsetArc today={snapshot.daily[0]} timezone={snapshot.timezone} isLight={isLight} />
                ) : (
                  <p className={`mt-2 text-sm ${subtleText}`}>Sunrise/sunset not available.</p>
                )}
              </div>

              <div className={`rounded-3xl border p-4 ${cardSurface}`}>
                <h3 className={`text-lg font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>📈 Temp & Rain Timeline</h3>
                <p className={`text-xs ${subtleText}`}>Click a bar to select a forecast hour</p>
                <div className="mt-3">
                  <WeatherTimeline
                    hourly={snapshot.hourly}
                    timezone={snapshot.timezone}
                    temperatureUnit={preferences.units.temperature}
                    isLight={isLight}
                    selectedIndex={selectedHourIndex}
                  />
                </div>
              </div>
            </section>

            <section id="nowcast" className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className={`min-w-0 rounded-3xl border p-4 backdrop-blur ${cardSurface}`}>
                <h3 className="text-lg font-semibold">Minute-style nowcast (15-min)</h3>
                <p className={`text-xs ${subtleText}`}>Short-term precipitation signal for the next hours</p>
                <p className={`mt-1 text-xs font-medium ${accentText}`}>{nowcastSummary}</p>
                {nowcastQuery.isLoading && <p className={`mt-2 text-sm ${subtleText}`}>Loading nowcast...</p>}
                {nowcastQuery.isError && <p className={`mt-2 text-sm ${errorText}`}>Nowcast unavailable for this location.</p>}
                {!nowcastQuery.isLoading && !nowcastQuery.isError && (nowcastQuery.data?.length ?? 0) === 0 && (
                  <p className={`mt-2 text-sm ${subtleText}`}>No 15-minute precipitation data available from provider.</p>
                )}
                {nowcastQuery.data && nowcastQuery.data.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <ul className="flex min-w-max gap-2">
                      {nowcastQuery.data.slice(0, 12).map((point) => (
                        <li key={point.time} className={`w-24 rounded-lg border px-2 py-1 text-xs ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                          <p className={subtleText}>{formatInZone(point.time, snapshot.timezone, { hour: "numeric", minute: "2-digit" })}</p>
                          <p className="tabular mt-1 text-sm font-semibold">{point.precipitationMm === null ? "-" : `${point.precipitationMm.toFixed(2)} mm`}</p>
                          <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                            r:{point.rainMm == null ? "-" : point.rainMm.toFixed(2)} sh:{point.showersMm == null ? "-" : point.showersMm.toFixed(2)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className={`min-w-0 rounded-3xl border p-4 backdrop-blur ${cardSurface}`}>
                <h3 className="text-lg font-semibold">Historical context</h3>
                <p className={`text-xs ${subtleText}`}>Today vs yesterday (same location)</p>
                {historicalQuery.isLoading && <p className={`mt-2 text-sm ${subtleText}`}>Loading historical snapshot...</p>}
                {historicalQuery.isError && <p className={`mt-2 text-sm ${errorText}`}>Historical comparison currently unavailable.</p>}
                {!historicalQuery.isLoading && !historicalQuery.isError && !historicalQuery.data && (
                  <p className={`mt-2 text-sm ${subtleText}`}>Historical values are not available for this location.</p>
                )}
                {historicalQuery.data && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className={`rounded-xl border px-3 py-2 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                      <p className={`text-xs ${subtleText}`}>Yesterday High</p>
                      <p className="tabular mt-1 text-lg font-semibold break-words">
                        {formatValue(toTemperature(historicalQuery.data.yesterdayMaxC, preferences.units.temperature), 0)} {preferences.units.temperature === "celsius" ? "C" : "F"}
                      </p>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                      <p className={`text-xs ${subtleText}`}>Yesterday Low</p>
                      <p className="tabular mt-1 text-lg font-semibold break-words">
                        {formatValue(toTemperature(historicalQuery.data.yesterdayMinC, preferences.units.temperature), 0)} {preferences.units.temperature === "celsius" ? "C" : "F"}
                      </p>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 sm:col-span-2 lg:col-span-1 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                      <p className={`text-xs ${subtleText}`}>Yesterday Rain</p>
                      <p className="tabular mt-1 text-lg font-semibold break-words">{formatValue(historicalQuery.data.yesterdayPrecipMm, 1)} mm</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section id="insights" className="grid gap-4 lg:grid-cols-2 lg:items-start">
              {/* Left column: insights, comparison, next hours, air quality */}
              <div className="flex min-w-0 flex-col gap-4">
                <div className={`rounded-3xl border p-4 backdrop-blur ${cardSurface}`}>
                  <h3 className="text-lg font-semibold">Smart insights</h3>
                  <div className="mt-3 grid gap-2">
                    {insights.map((insight) => (
                      <p key={insight} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? "border-slate-300 bg-slate-100 text-slate-700" : "border-slate-700 bg-slate-800/45 text-slate-200"}`}>
                        {insight}
                      </p>
                    ))}
                  </div>
                </div>

                <div className={`rounded-3xl border p-4 backdrop-blur ${cardSurface}`}>
                  <h3 className="text-lg font-semibold">City comparison</h3>
                  <ul className="mt-2 space-y-1.5">
                    {comparisonLocations.map((location, index) => {
                      const item = comparisonQueries[index]?.data;
                      return (
                        <li key={location.id} className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-xl border px-3 py-2 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                          <button type="button" onClick={() => setSelectedLocation(location)} className="min-w-0 text-left">
                            <p className="truncate text-sm font-medium">{locationLabel(location)}</p>
                            <p className={`text-xs ${subtleText}`}>
                              {item ? formatInZone(item.current.time, item.timezone, { hour: "numeric", minute: "2-digit" }) : "Loading local time..."}
                            </p>
                          </button>
                          <p className={`text-xs ${subtleText}`}>{item ? weatherCodeMeta(item.current.weatherCode).label : "-"}</p>
                          <p className="tabular text-sm font-semibold">
                            {item ? `${formatValue(toTemperature(item.current.temperatureC, preferences.units.temperature), 0)}${preferences.units.temperature === "celsius" ? "C" : "F"}` : "-"}
                          </p>
                        </li>
                      );
                    })}
                  </ul>

                  <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${subtleText} ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                    <p className={`font-medium ${isLight ? "text-slate-700" : "text-slate-200"}`}>Quick switch cities</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {[...favorites, ...recentSearches]
                        .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index)
                        .slice(0, 8)
                        .map((item) => (
                          <button
                            key={`quick-${item.id}`}
                            type="button"
                            onClick={() => setSelectedLocation(item)}
                            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${isLight ? "border-slate-300 hover:bg-slate-100" : "border-slate-600 hover:bg-slate-800/70"}`}
                          >
                            {item.name}
                          </button>
                        ))}
                      {favorites.length === 0 && recentSearches.length === 0 && <span>No saved or recent locations yet.</span>}
                    </div>
                  </div>
                </div>

                <div className={`rounded-3xl border p-4 backdrop-blur ${cardSurface}`}>
                  <h3 className="text-lg font-semibold">Next 6 hours at {snapshot.location.name}</h3>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px] sm:grid-cols-6">
                    {snapshot.hourly.slice(0, 6).map((hour) => (
                      <div key={`mini-${hour.time}`} className={`rounded-lg border px-2 py-1 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                        <p className={subtleText}>{formatInZone(hour.time, snapshot.timezone, { hour: "numeric" })}</p>
                        <p className={`tabular font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>
                          {formatValue(toTemperature(hour.temperatureC, preferences.units.temperature), 0)}
                          {preferences.units.temperature === "celsius" ? "C" : "F"}
                        </p>
                        <p className={subtleText}>{formatValue(hour.precipitationProbability, 0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-3xl border p-4 backdrop-blur ${cardSurface}`}>
                  <h3 className="text-lg font-semibold">Air quality</h3>
                  <p className={`text-xs ${subtleText}`}>US AQI · Open-Meteo Air Quality API</p>
                  {airQualityQuery.isLoading && <p className={`mt-2 text-sm ${subtleText}`}>Loading air quality...</p>}
                  {airQualityQuery.isError && <p className={`mt-2 text-sm ${errorText}`}>Air quality is unavailable for this location.</p>}
                  {!airQualityQuery.isLoading && !airQualityQuery.isError && !airQualityQuery.data && (
                    <p className={`mt-2 text-sm ${subtleText}`}>No air quality data available for this location.</p>
                  )}
                  {airQualityQuery.data && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: aqiCategory?.color ?? "#94a3b8" }} aria-hidden="true" />
                        <p className="tabular text-4xl font-bold leading-none">{formatValue(airQualityQuery.data.usAqi, 0)}</p>
                      </div>
                      <p className="text-sm font-medium">{aqiCategory?.label ?? "Index unavailable"}</p>
                      <div className="grid flex-1 grid-cols-3 gap-2 text-center">
                        <div className={`rounded-lg border px-2 py-1.5 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                          <p className={`text-[10px] uppercase tracking-wide ${subtleText}`}>EU AQI</p>
                          <p className="tabular text-sm font-semibold">{formatValue(airQualityQuery.data.euAqi, 0)}</p>
                        </div>
                        <div className={`rounded-lg border px-2 py-1.5 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                          <p className={`text-[10px] uppercase tracking-wide ${subtleText}`}>PM2.5</p>
                          <p className="tabular text-sm font-semibold">{formatValue(airQualityQuery.data.pm2_5, 1)}</p>
                        </div>
                        <div className={`rounded-lg border px-2 py-1.5 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                          <p className={`text-[10px] uppercase tracking-wide ${subtleText}`}>PM10</p>
                          <p className="tabular text-sm font-semibold">{formatValue(airQualityQuery.data.pm10, 1)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: radar + notifications (natural height, no stretching) */}
              <div className="flex min-w-0 flex-col gap-4">
                <div id="radar">
                  <RadarPanel location={snapshot.location} timezone={snapshot.timezone} hour12={hour12} clockTag={timeTag} isLight={isLight} />
                </div>

                <div className={`rounded-3xl border p-4 backdrop-blur ${cardSurface}`}>
                  <h3 className="text-lg font-semibold">Smart notifications</h3>
                  <div className={`mt-2 rounded-xl border px-3 py-2 text-sm ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                    <p className={subtleText}>Opt in for alerts like rain starting soon, UV high, or sharp temperature drop.</p>
                    <button
                      onClick={enableNotifications}
                      className={`mt-2 rounded-lg border px-3 py-1.5 text-xs transition ${isLight ? "border-slate-300 hover:bg-slate-100" : "border-slate-600 hover:bg-slate-800/70"}`}
                    >
                      {notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Reliability: full-width strip so no column is left with dead space */}
              <div id="reliability" className={`rounded-3xl border p-4 backdrop-blur lg:col-span-2 ${cardSurface}`}>
                <h3 className="text-sm font-bold uppercase tracking-widest opacity-60">Reliability center</h3>
                <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div className={`rounded-xl border px-3 py-2 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                    <p className={subtleText}>Data source</p>
                    <p className="font-medium">Open-Meteo + RainViewer</p>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                    <p className={subtleText}>Freshness</p>
                    <p className="font-medium">{stale ? "Stale/Cached" : "Fresh"}</p>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                    <p className={subtleText}>Last update</p>
                    <p className="font-medium">{formatInZone(snapshot.fetchedAt, snapshot.timezone, { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                    <p className={subtleText}>Retry diagnostics</p>
                    <p className="font-medium">Manual + 10m auto</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <footer className={`mt-8 border-t ${isLight ? "border-slate-300 bg-white" : "border-slate-800 bg-slate-950/90"}`}>
        <div className={`mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-6 text-sm md:grid-cols-3 md:px-8 lg:px-10 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
          <div>
            <p className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>ATMOS WEATHER</p>
            <p className={`mt-1 text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>Created by Praveen Suthar</p>
            <p className={`text-[10px] uppercase tracking-widest mt-1 ${isLight ? "text-slate-500" : "text-slate-500"}`}>Weather Intelligence Architect</p>
            <p className="mt-3 text-xs">© 2026. All rights reserved.</p>
            {snapshot && <p className="mt-1 text-xs">Updated {formatInZone(snapshot.fetchedAt, snapshot.timezone, { hour: "numeric", minute: "2-digit" })} · {stale ? "stale cache" : "live"}.</p>}
          </div>

          <div className="space-y-1">
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className={`block ${isLight ? "hover:text-cyan-700" : "hover:text-cyan-300"}`}>
              Powered by Open-Meteo API
            </a>
            <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer" className={`block ${isLight ? "hover:text-cyan-700" : "hover:text-cyan-300"}`}>
              API Documentation
            </a>
            <a href="https://open-meteo.com/en/pricing" target="_blank" rel="noreferrer" className={`block ${isLight ? "hover:text-cyan-700" : "hover:text-cyan-300"}`}>
              Status
            </a>
          </div>

          <div className="space-y-1">
            <a href="#" className={`block ${isLight ? "hover:text-cyan-700" : "hover:text-cyan-300"}`}>
              Privacy Policy
            </a>
            <a href="#" className={`block ${isLight ? "hover:text-cyan-700" : "hover:text-cyan-300"}`}>
              Terms of Service
            </a>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-lg border p-2 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
                <Globe className="h-4 w-4" />
              </span>
              <span className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>Social placeholders</span>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {message && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-2 text-sm ${isLight ? "border-slate-300 bg-white text-slate-800" : "border-slate-700 bg-slate-900/95"}`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MetricProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subValue?: string;
  isLight: boolean;
}

function Metric({ icon: Icon, label, value, subValue, isLight }: MetricProps) {
  return (
    <article
      className={`rounded-2xl border p-4 backdrop-blur transition hover:-translate-y-0.5 ${
        isLight ? "border-slate-300 bg-white hover:bg-slate-100" : "border-slate-700 bg-slate-900/50 hover:bg-slate-800/60"
      }`}
    >
      <p className={`inline-flex items-center gap-2 text-sm ${isLight ? "text-slate-600" : "text-slate-300"}`}>
        <Icon className={`h-4 w-4 ${isLight ? "text-cyan-600" : "text-cyan-300"}`} /> {label}
      </p>
      <p className={`tabular mt-1 text-xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{value}</p>
      {subValue && <p className={`mt-1 text-xs ${isLight ? "text-slate-600" : "text-slate-300"}`}>{subValue}</p>}
    </article>
  );
}
