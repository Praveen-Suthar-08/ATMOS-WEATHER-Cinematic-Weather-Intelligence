import { useQuery } from "@tanstack/react-query";
import { fetchWeather, readCachedSnapshot } from "@/services/openMeteoClient";
import type { LocationOption } from "@/types/models";

export function useWeather(location: LocationOption | null) {
  return useQuery({
    queryKey: ["weather", location?.id],
    enabled: Boolean(location),
    staleTime: 10 * 60 * 1000,
    queryFn: async ({ signal }) => {
      if (!location) {
        throw new Error("No location selected");
      }
      try {
        return await fetchWeather(location, signal);
      } catch (error) {
        const cached = readCachedSnapshot(location.id);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },
  });
}
