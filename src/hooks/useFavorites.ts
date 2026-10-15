import { useMemo, useState } from "react";
import type { LocationOption } from "@/types/models";
import { safeReadStorage, safeWriteStorage } from "@/utils/storage";

const KEY = "atmos-favorites-v1";

function normalize(raw: unknown): LocationOption[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is LocationOption => {
    return (
      typeof item === "object" &&
      item !== null &&
      typeof (item as LocationOption).id === "string" &&
      typeof (item as LocationOption).name === "string" &&
      typeof (item as LocationOption).latitude === "number" &&
      typeof (item as LocationOption).longitude === "number"
    );
  });
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<LocationOption[]>(() => normalize(safeReadStorage(KEY, [])));

  const ids = useMemo(() => new Set(favorites.map((location) => location.id)), [favorites]);

  const persist = (next: LocationOption[]) => {
    setFavorites(next);
    safeWriteStorage(KEY, next);
  };

  return {
    favorites,
    isFavorite: (locationId: string) => ids.has(locationId),
    addFavorite: (location: LocationOption) => {
      if (ids.has(location.id)) {
        return false;
      }
      persist([...favorites, location]);
      return true;
    },
    removeFavorite: (locationId: string) => {
      persist(favorites.filter((location) => location.id !== locationId));
    },
    clearFavorites: () => persist([]),
  };
}
