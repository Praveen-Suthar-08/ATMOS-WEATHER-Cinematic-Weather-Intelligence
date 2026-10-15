interface ReverseGeoResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

export async function reverseGeocodeCoordinates(latitude: number, longitude: number, signal?: AbortSignal) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    localityLanguage: "en",
  });

  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Reverse geocode failed with status ${response.status}`);
  }

  const data = (await response.json()) as ReverseGeoResponse;
  const name = data.city || data.locality || "Current location";
  const admin1 = data.principalSubdivision;
  const country = data.countryName;

  return { name, admin1, country };
}
