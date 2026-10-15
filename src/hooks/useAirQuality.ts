import { useQuery } from "@tanstack/react-query";
import { fetchAirQuality } from "@/services/openMeteoClient";
import type { LocationOption } from "@/types/models";

export function useAirQuality(location: LocationOption | null) {
  return useQuery({
    queryKey: ["air-quality", location?.id],
    enabled: Boolean(location),
    staleTime: 10 * 60 * 1000,
    queryFn: ({ signal }) => {
      if (!location) {
        return null;
      }
      return fetchAirQuality(location, signal);
    },
  });
}
