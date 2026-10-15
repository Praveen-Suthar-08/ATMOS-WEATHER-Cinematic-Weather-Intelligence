import { useMemo, useState } from "react";
import type { LocationOption } from "@/types/models";
import { safeReadStorage, safeWriteStorage } from "@/utils/storage";

const KEY = "atmos-recent-searches-v1";

function sanitize(value: unknown): LocationOption[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is LocationOption => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const location = item as LocationOption;
    return typeof location.id === "string" && typeof location.name === "string" && typeof location.latitude === "number" && typeof location.longitude === "number";
  });
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<LocationOption[]>(() => sanitize(safeReadStorage(KEY, [])));

  const ids = useMemo(() => new Set(recentSearches.map((item) => item.id)), [recentSearches]);

  const persist = (next: LocationOption[]) => {
    setRecentSearches(next);
    safeWriteStorage(KEY, next);
  };

  return {
    recentSearches,
    addRecentSearch: (location: LocationOption) => {
      const without = ids.has(location.id) ? recentSearches.filter((item) => item.id !== location.id) : recentSearches;
      persist([location, ...without].slice(0, 8));
    },
    clearRecentSearches: () => persist([]),
  };
}
