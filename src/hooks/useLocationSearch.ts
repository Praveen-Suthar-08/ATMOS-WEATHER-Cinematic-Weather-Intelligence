import { useQuery } from "@tanstack/react-query";
import { searchLocations } from "@/services/openMeteoClient";

export function useLocationSearch(query: string) {
  const normalized = query.trim();
  return useQuery({
    queryKey: ["search", normalized],
    enabled: normalized.length >= 2,
    staleTime: 5 * 60 * 1000,
    queryFn: ({ signal }) => searchLocations(normalized, signal),
  });
}
