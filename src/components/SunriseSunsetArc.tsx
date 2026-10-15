import type { DailyWeather } from "@/types/models";
import { minsFromIso } from "@/utils/dateTime";

interface SunriseSunsetArcProps {
  today: DailyWeather;
  timezone: string;
  isLight: boolean;
}

function nowMinsInZone(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function formatHM(isoStr: string | null, timezone: string): string {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(d);
}

export function SunriseSunsetArc({ today, timezone, isLight }: SunriseSunsetArcProps) {
  const riseMin = minsFromIso(today.sunrise, timezone);
  const setMin = minsFromIso(today.sunset, timezone);
  const nowMin = nowMinsInZone(timezone);

  const W = 340;
  const H = 110;
  const cx = W / 2;
  const cy = H + 10;
  const r = H;

  const arcX = (frac: number) => cx - r * Math.cos(Math.PI * frac);
  const arcY = (frac: number) => cy - r * Math.sin(Math.PI * frac);

  const progress =
    riseMin !== null && setMin !== null && setMin > riseMin
      ? Math.max(0, Math.min(1, (nowMin - riseMin) / (setMin - riseMin)))
      : 0;

  const isDay = riseMin !== null && setMin !== null && nowMin >= riseMin && nowMin <= setMin;

  const sunX = arcX(progress);
  const sunY = arcY(progress);

  const daylightHours =
    riseMin !== null && setMin !== null && setMin > riseMin
      ? `${Math.floor((setMin - riseMin) / 60)}h ${(setMin - riseMin) % 60}m`
      : null;

  const trackColor = isLight ? "#cbd5e1" : "#1e293b";
  const progressColor = isLight ? "#f59e0b" : "#fbbf24";
  const glowColor = isLight ? "#fde68a" : "#fef9c3";
  const labelColor = isLight ? "#475569" : "#94a3b8";
  const valueColor = isLight ? "#b45309" : "#fbbf24";
  const nightColor = isLight ? "#bfdbfe" : "#312e81";

  return (
    <div className="w-full select-none">
      <svg viewBox={`0 0 ${W} ${H + 36}`} className="w-full" role="img" aria-label="Sunrise and sunset arc">
        {/* sky gradient background */}
        <defs>
          <linearGradient id="skygrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDay ? (isLight ? "#bae6fd" : "#0c4a6e") : nightColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor="transparent" stopOpacity={0} />
          </linearGradient>
        </defs>
        <ellipse cx={cx} cy={cy} rx={r + 6} ry={r * 0.55} fill="url(#skygrad)" />

        {/* horizon line */}
        <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke={trackColor} strokeWidth={1.5} />

        {/* track arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={trackColor}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* progress arc */}
        {isDay && progress > 0 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sunX} ${sunY}`}
            fill="none"
            stroke={progressColor}
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}

        {/* sun glow */}
        <circle cx={sunX} cy={sunY} r={14} fill={glowColor} fillOpacity={isDay ? 0.38 : 0.12} />
        {/* sun dot */}
        <circle cx={sunX} cy={sunY} r={7} fill={isDay ? progressColor : labelColor} />
        <circle cx={sunX} cy={sunY} r={3.5} fill="white" fillOpacity={0.7} />

        {/* sunrise label */}
        <text x={cx - r} y={cy + 18} textAnchor="middle" fontSize={11} fill={labelColor}>
          ⬆ {formatHM(today.sunrise, timezone)}
        </text>

        {/* sunset label */}
        <text x={cx + r} y={cy + 18} textAnchor="middle" fontSize={11} fill={labelColor}>
          ⬇ {formatHM(today.sunset, timezone)}
        </text>

        {/* center label */}
        {daylightHours && (
          <text x={cx} y={cy - r * 0.42} textAnchor="middle" fontSize={12} fill={isDay ? valueColor : labelColor} fontWeight="600">
            {daylightHours}
          </text>
        )}
        {daylightHours && (
          <text x={cx} y={cy - r * 0.42 + 14} textAnchor="middle" fontSize={10} fill={labelColor}>
            {isDay ? "above horizon" : "nighttime"}
          </text>
        )}
      </svg>
    </div>
  );
}
