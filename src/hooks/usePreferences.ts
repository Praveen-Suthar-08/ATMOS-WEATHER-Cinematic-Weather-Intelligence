import { useEffect, useMemo, useState } from "react";
import type { ClockFormat, PreferencesState, ThemeMode } from "@/types/models";
import { safeReadStorage, safeWriteStorage } from "@/utils/storage";

const KEY = "atmos-preferences-v1";

const defaultPrefs: PreferencesState = {
  theme: "system",
  units: {
    temperature: "celsius",
    wind: "kmh",
    precipitation: "mm",
  },
  clockFormat: "system",
};

function sanitizeTheme(value: unknown): ThemeMode {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function sanitizePreferences(value: unknown): PreferencesState {
  if (!value || typeof value !== "object") {
    return defaultPrefs;
  }
  const candidate = value as Partial<PreferencesState>;
  const units = candidate.units ?? defaultPrefs.units;
  return {
    theme: sanitizeTheme(candidate.theme),
    units: {
      temperature: units.temperature === "fahrenheit" ? "fahrenheit" : "celsius",
      wind: units.wind === "mph" || units.wind === "ms" ? units.wind : "kmh",
      precipitation: units.precipitation === "in" ? "in" : "mm",
    },
    clockFormat: candidate.clockFormat === "12h" || candidate.clockFormat === "24h" || candidate.clockFormat === "system" ? candidate.clockFormat : "system",
  };
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<PreferencesState>(() => sanitizePreferences(safeReadStorage(KEY, defaultPrefs)));
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false,
  );

  useEffect(() => {
    safeWriteStorage(KEY, preferences);
  }, [preferences]);

  // Track OS theme changes live so "system" mode updates without a reload.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = useMemo(() => {
    if (preferences.theme === "system") {
      return systemDark ? "dark" : "light";
    }
    return preferences.theme;
  }, [preferences.theme, systemDark]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  return {
    preferences,
    resolvedTheme,
    setTheme: (theme: ThemeMode) => setPreferences((prev) => ({ ...prev, theme })),
    setTemperatureUnit: (temperature: PreferencesState["units"]["temperature"]) =>
      setPreferences((prev) => ({ ...prev, units: { ...prev.units, temperature } })),
    setWindUnit: (wind: PreferencesState["units"]["wind"]) => setPreferences((prev) => ({ ...prev, units: { ...prev.units, wind } })),
    setPrecipitationUnit: (precipitation: PreferencesState["units"]["precipitation"]) =>
      setPreferences((prev) => ({ ...prev, units: { ...prev.units, precipitation } })),
    setClockFormat: (clockFormat: ClockFormat) => setPreferences((prev) => ({ ...prev, clockFormat })),
    clearPreferences: () => setPreferences(defaultPrefs),
  };
}
