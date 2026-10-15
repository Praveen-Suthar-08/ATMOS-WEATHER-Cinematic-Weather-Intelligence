import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HourlyWeather, TemperatureUnit } from "@/types/models";
import { formatLocalTime } from "@/utils/dateTime";
import { toTemperature } from "@/utils/units";

interface WeatherTimelineProps {
  hourly: HourlyWeather[];
  timezone: string;
  temperatureUnit: TemperatureUnit;
  isLight: boolean;
  selectedIndex: number;
}

export function WeatherTimeline({ hourly, timezone, temperatureUnit, isLight, selectedIndex }: WeatherTimelineProps) {
  if (hourly.length === 0) {
    return <p className={`text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>Hourly data unavailable.</p>;
  }

  const data = hourly.map((h, i) => ({
    index: i,
    time: formatLocalTime(h.time, timezone, { hour: "numeric" }),
    temp: toTemperature(h.temperatureC, temperatureUnit),
    rain: h.precipitationProbability ?? 0,
    uv: h.uvIndex ?? 0,
  }));

  const selectedTime = formatLocalTime(hourly[selectedIndex]?.time ?? null, timezone, { hour: "numeric" });
  const gridColor = isLight ? "#cbd5e1" : "#1e293b";
  const axisColor = isLight ? "#475569" : "#94a3b8";
  const tempStroke = isLight ? "#0284c7" : "#38bdf8";
  const rainStroke = isLight ? "#059669" : "#34d399";

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tlTempFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={tempStroke} stopOpacity={0.35} />
              <stop offset="95%" stopColor={tempStroke} stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="tlRainFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={rainStroke} stopOpacity={0.28} />
              <stop offset="95%" stopColor={rainStroke} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="time" tick={{ fill: axisColor, fontSize: 11 }} interval={3} />
          <YAxis yAxisId="temp" tick={{ fill: axisColor, fontSize: 11 }} width={32} />
          <YAxis yAxisId="rain" orientation="right" domain={[0, 100]} tick={{ fill: axisColor, fontSize: 11 }} width={28} />
          <ReferenceLine yAxisId="temp" x={selectedTime} stroke={isLight ? "#f59e0b" : "#fbbf24"} strokeWidth={2} strokeDasharray="4 3" />
          <Tooltip
            contentStyle={{ backgroundColor: isLight ? "#fff" : "#0f172a", border: `1px solid ${gridColor}`, borderRadius: "10px", fontSize: 12 }}
            labelStyle={{ color: isLight ? "#334155" : "#cbd5e1", fontWeight: 600 }}
            itemStyle={{ color: isLight ? "#0f172a" : "#f8fafc" }}
          />
          <Area yAxisId="temp" type="monotone" dataKey="temp" name="Temp" stroke={tempStroke} fill="url(#tlTempFill)" strokeWidth={2.2} dot={false} />
          <Area yAxisId="rain" type="monotone" dataKey="rain" name="Rain %" stroke={rainStroke} fill="url(#tlRainFill)" strokeWidth={1.8} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
