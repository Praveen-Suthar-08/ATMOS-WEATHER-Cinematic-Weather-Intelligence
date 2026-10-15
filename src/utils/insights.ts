import type { DailyWeather, HourlyWeather, WindUnit } from "@/types/models";
import { toWind } from "@/utils/units";

export interface Insight {
  title: string;
  text: string;
}

export function buildInsights(hourly: HourlyWeather[], daily: DailyWeather[], windUnit: WindUnit): Insight[] {
  const insights: Insight[] = [];

  const rainPeak = [...hourly]
    .filter((row) => typeof row.precipitationProbability === "number")
    .sort((a, b) => (b.precipitationProbability ?? 0) - (a.precipitationProbability ?? 0))[0];
  if (rainPeak && (rainPeak.precipitationProbability ?? 0) >= 35) {
    insights.push({
      title: "Rain window",
      text: `Precipitation risk peaks around ${rainPeak.precipitationProbability?.toFixed(0)}% in the near-term window.`,
    });
  }

  const uvPeak = [...daily]
    .filter((row) => typeof row.uvMax === "number")
    .sort((a, b) => (b.uvMax ?? 0) - (a.uvMax ?? 0))[0];
  if (uvPeak && (uvPeak.uvMax ?? 0) >= 6) {
    insights.push({
      title: "UV protection",
      text: `High UV potential detected (up to ${uvPeak.uvMax?.toFixed(1)}). Consider SPF and shade planning.`,
    });
  }

  const windPeak = [...hourly]
    .filter((row) => typeof row.windSpeedKmh === "number")
    .sort((a, b) => (b.windSpeedKmh ?? 0) - (a.windSpeedKmh ?? 0))[0];
  const convertedWindPeak = toWind(windPeak?.windSpeedKmh ?? null, windUnit);
  if (convertedWindPeak && convertedWindPeak > 22) {
    insights.push({
      title: "Wind caution",
      text: `Stronger winds are expected, peaking near ${convertedWindPeak.toFixed(1)} ${windUnit}.`,
    });
  }

  const currentTemp = hourly[0]?.temperatureC ?? null;
  const eveningTemp = hourly[10]?.temperatureC ?? null;
  if (typeof currentTemp === "number" && typeof eveningTemp === "number") {
    const drop = currentTemp - eveningTemp;
    if (drop >= 5) {
      insights.push({
        title: "Temperature shift",
        text: `Temperatures may drop by about ${drop.toFixed(0)} degrees later today.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      title: "Stable outlook",
      text: "No significant weather spikes detected in available near-term forecast data.",
    });
  }

  return insights.slice(0, 4);
}
