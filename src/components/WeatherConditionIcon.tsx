import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, SunMoon } from "lucide-react";
import { weatherCodeMeta } from "@/utils/weatherCode";

interface WeatherConditionIconProps {
  weatherCode: number | null;
  isDay?: boolean | null;
  className?: string;
}

export function WeatherConditionIcon({ weatherCode, isDay, className }: WeatherConditionIconProps) {
  const meta = weatherCodeMeta(weatherCode);

  if (meta.mood === "clear") {
    return isDay ? <Sun className={className} aria-hidden="true" /> : <SunMoon className={className} aria-hidden="true" />;
  }
  if (meta.mood === "clouds") {
    return <Cloud className={className} aria-hidden="true" />;
  }
  if (meta.mood === "fog") {
    return <CloudFog className={className} aria-hidden="true" />;
  }
  if (meta.mood === "rain") {
    return weatherCode === 51 || weatherCode === 53 || weatherCode === 55 ? (
      <CloudDrizzle className={className} aria-hidden="true" />
    ) : (
      <CloudRain className={className} aria-hidden="true" />
    );
  }
  if (meta.mood === "snow") {
    return <CloudSnow className={className} aria-hidden="true" />;
  }
  if (meta.mood === "storm") {
    return <CloudLightning className={className} aria-hidden="true" />;
  }
  return <Cloud className={className} aria-hidden="true" />;
}
