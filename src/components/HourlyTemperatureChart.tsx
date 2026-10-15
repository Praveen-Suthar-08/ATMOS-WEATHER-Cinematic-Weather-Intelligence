import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HourlyWeather, PrecipitationUnit, TemperatureUnit } from "@/types/models";
import { formatLocalTime } from "@/utils/dateTime";
import { toPrecipitation, toTemperature } from "@/utils/units";

export type HourlyChartMode = "temperature" | "precipitation" | "both";

interface HourlyTemperatureChartProps {
  hourly: HourlyWeather[];
  timezone: string;
  temperatureUnit: TemperatureUnit;
  precipitationUnit: PrecipitationUnit;
  mode?: HourlyChartMode;
  hour12?: boolean;
}

export function HourlyTemperatureChart({
  hourly,
  timezone,
  temperatureUnit,
  precipitationUnit,
  mode = "both",
  hour12,
}: HourlyTemperatureChartProps) {
  if (hourly.length === 0) {
    return <p className="text-sm text-muted">Hourly forecast is not available for this location.</p>;
  }

  const data = hourly.map((item) => ({
    hour: formatLocalTime(item.time, timezone, { hour: "numeric", hour12 }),
    temperature: toTemperature(item.temperatureC, temperatureUnit),
    precipitation: toPrecipitation(item.precipitationMm, precipitationUnit),
  }));

  return (
    <div className="h-64 w-full min-w-0" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="hour" tick={{ fill: "var(--text-muted)", fontSize: 12 }} interval={3} />
          <YAxis yAxisId="temp" tick={{ fill: "var(--text-muted)", fontSize: 12 }} width={38} />
          <YAxis yAxisId="rain" orientation="right" hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
            }}
            formatter={(value, name) => {
              const numeric = typeof value === "number" ? value : Number(value ?? 0);
              const suffix = name === "temperature" ? (temperatureUnit === "celsius" ? "C" : "F") : precipitationUnit;
              return [`${numeric.toFixed(1)} ${suffix}`, name === "temperature" ? "Temp" : "Precip"];
            }}
          />
          {(mode === "both" || mode === "temperature") && (
            <Area yAxisId="temp" type="monotone" dataKey="temperature" stroke="var(--accent)" fill="color-mix(in srgb, var(--accent) 30%, transparent)" />
          )}
          {(mode === "both" || mode === "precipitation") && (
            <Area
              yAxisId="rain"
              type="monotone"
              dataKey="precipitation"
              stroke="var(--accent-soft)"
              fill="color-mix(in srgb, var(--accent-soft) 24%, transparent)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
