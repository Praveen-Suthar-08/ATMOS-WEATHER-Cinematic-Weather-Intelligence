import type { PrecipitationUnit, TemperatureUnit, WindUnit } from "@/types/models";

export function toTemperature(valueC: number | null, unit: TemperatureUnit): number | null {
  if (valueC === null) {
    return null;
  }
  if (unit === "fahrenheit") {
    return (valueC * 9) / 5 + 32;
  }
  return valueC;
}

export function toWind(valueKmh: number | null, unit: WindUnit): number | null {
  if (valueKmh === null) {
    return null;
  }
  if (unit === "mph") {
    return valueKmh / 1.609344;
  }
  if (unit === "ms") {
    return valueKmh / 3.6;
  }
  return valueKmh;
}

export function toPrecipitation(valueMm: number | null, unit: PrecipitationUnit): number | null {
  if (valueMm === null) {
    return null;
  }
  if (unit === "in") {
    return valueMm / 25.4;
  }
  return valueMm;
}

export function formatValue(value: number | null, digits = 0): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(digits);
}

export function windDirectionToLabel(degrees: number | null): string {
  if (degrees === null || Number.isNaN(degrees)) {
    return "-";
  }
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((degrees % 360) + 360) % 360;
  return labels[Math.round(normalized / 45) % 8];
}
