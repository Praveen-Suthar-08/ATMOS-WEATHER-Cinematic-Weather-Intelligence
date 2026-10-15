interface OutfitProps {
  temperatureC: number | null;
  precipProbability: number | null;
  windSpeedKmh: number | null;
  isLight: boolean;
}

interface Outfit {
  items: string[];
  advice: string;
}

function getOutfit(tempC: number, rain: number, wind: number): Outfit {
  const items: string[] = [];
  let advice = "";

  if (tempC >= 28) {
    items.push("🩳 Light shorts", "👕 Breathable T-shirt", "🧴 Sunscreen", "🕶️ Sunglasses");
    advice = "Light and breathable clothing recommended. Stay hydrated.";
  } else if (tempC >= 20) {
    items.push("👖 Light trousers or jeans", "👕 T-shirt or light blouse");
    advice = "Comfortable everyday clothing. No heavy layers needed.";
  } else if (tempC >= 12) {
    items.push("👖 Trousers", "👕 Long-sleeve shirt", "🧥 Light jacket");
    advice = "Layer up with a light jacket for cool moments.";
  } else if (tempC >= 5) {
    items.push("🧥 Warm jacket", "🧣 Scarf", "👖 Jeans");
    advice = "Wrap up with a warm jacket and scarf.";
  } else {
    items.push("🧥 Heavy winter coat", "🧤 Gloves", "🧣 Scarf", "🧢 Warm hat", "🥾 Winter boots");
    advice = "Full winter gear needed. It's very cold outside.";
  }

  if (rain > 50) {
    items.push("☂️ Umbrella", "🥾 Waterproof boots");
    advice += " Rain is likely — carry an umbrella.";
  } else if (rain > 25) {
    items.push("🌂 Compact umbrella");
  }

  if (wind > 40) {
    items.push("🧥 Windproof layer");
    advice += " Strong winds expected — a windbreaker is useful.";
  }

  return { items, advice };
}

export function OutfitRecommendation({ temperatureC, precipProbability, windSpeedKmh, isLight }: OutfitProps) {
  if (temperatureC === null) {
    return null;
  }

  const outfit = getOutfit(temperatureC, precipProbability ?? 0, windSpeedKmh ?? 0);

  const cardBg = isLight ? "bg-white border-slate-300" : "bg-slate-900/50 border-slate-700";
  const titleColor = isLight ? "text-slate-900" : "text-white";
  const adviceColor = isLight ? "text-slate-600" : "text-slate-300";
  const pillBg = isLight ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-slate-800/70 border-slate-700 text-slate-200";

  return (
    <div className={`rounded-2xl border p-4 ${cardBg}`}>
      <p className={`text-sm font-semibold ${titleColor}`}>🧳 Outfit suggestion</p>
      <p className={`mt-1 text-xs ${adviceColor}`}>{outfit.advice}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {outfit.items.map((item) => (
          <span key={item} className={`rounded-full border px-2.5 py-1 text-xs ${pillBg}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
