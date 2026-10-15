import { Moon, MoonStar } from "lucide-react";

interface MoonPhaseProps {
  phase: number | null | undefined;
  isLight: boolean;
}

function getMoonPhaseName(phase: number): string {
  if (phase === 0 || phase === 1) return "New Moon";
  if (phase > 0 && phase < 0.25) return "Waxing Crescent";
  if (phase === 0.25) return "First Quarter";
  if (phase > 0.25 && phase < 0.5) return "Waxing Gibbous";
  if (phase === 0.5) return "Full Moon";
  if (phase > 0.5 && phase < 0.75) return "Waning Gibbous";
  if (phase === 0.75) return "Last Quarter";
  if (phase > 0.75 && phase < 1) return "Waning Crescent";
  return "Unknown";
}

export function MoonPhaseDisplay({ phase, isLight }: MoonPhaseProps) {
  if (phase === undefined || phase === null) return null;

  const phaseName = getMoonPhaseName(phase);
  const color = isLight ? "text-slate-600" : "text-indigo-300";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${color} opacity-90`}>
        {phase > 0.4 && phase < 0.6 ? <MoonStar className="h-8 w-8" /> : <Moon className="h-8 w-8" />}
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider">{phaseName}</p>
    </div>
  );
}
