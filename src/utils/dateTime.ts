export function formatLocalTime(value: string | null, timezone: string, options: Intl.DateTimeFormatOptions): string {
  if (!value) {
    return "-";
  }

  const hasOffset = /([zZ]|[+-]\d{2}:\d{2})$/.test(value);
  if (hasOffset) {
    const date = parseLocalDateTime(value);
    if (!date) {
      return "-";
    }
    return new Intl.DateTimeFormat(undefined, {
      ...options,
      timeZone: timezone,
    }).format(date);
  }

  const parts = parseApiLocalParts(value);
  if (!parts) {
    return "-";
  }
  // Open-Meteo time arrays are local times for the requested timezone and do not include offsets.
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  return new Intl.DateTimeFormat(undefined, {
    ...options,
    timeZone: "UTC",
  }).format(date);
}

export function parseLocalDateTime(value: string): Date | null {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  const withSeconds = `${value}:00`;
  const parsedWithSeconds = new Date(withSeconds);
  if (!Number.isNaN(parsedWithSeconds.getTime())) {
    return parsedWithSeconds;
  }
  return null;
}

function parseApiLocalParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  if ([year, month, day, hour, minute].some((item) => Number.isNaN(item))) {
    return null;
  }
  return { year, month, day, hour, minute };
}

export function formatRelativeAge(isoTime: string): string {
  const date = new Date(isoTime);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) {
    return "just now";
  }
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function minsFromIso(isoStr: string | null, timezone: string): number | null {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}
