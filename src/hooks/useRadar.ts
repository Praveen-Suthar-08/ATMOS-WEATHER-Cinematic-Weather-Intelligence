import { useQuery } from "@tanstack/react-query";
import { fetchRainViewerMetadata } from "@/services/rainViewer";

export function useRadar() {
  return useQuery({
    queryKey: ["rainviewer-metadata"],
    staleTime: 5 * 60 * 1000,
    queryFn: ({ signal }) => fetchRainViewerMetadata(signal),
  });
}
