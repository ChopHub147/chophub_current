"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { type LngLatLike, type Map as MapboxMap, type Marker as MapboxMarker } from "mapbox-gl";

type Coordinates = { latitude: number; longitude: number };
type MapboxFeature = { id: string; place_name?: string; text?: string; center?: [number, number] };

const calabarCenter: LngLatLike = [8.3417, 4.975];

export default function DeliveryMapPicker({
  value,
  onSelect,
}: {
  value: Coordinates | null;
  onSelect: (coordinates: Coordinates, address?: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const onSelectRef = useRef(onSelect);
  const initialValueRef = useRef(value);
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const hasToken = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;
    const initialValue = initialValueRef.current;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialValue ? [initialValue.longitude, initialValue.latitude] : calabarCenter,
      zoom: initialValue ? 16 : 13,
      attributionControl: true,
    });
    mapRef.current = map;

    const marker = new mapboxgl.Marker({ color: "#15803d", draggable: true });
    marker.setLngLat(initialValue ? [initialValue.longitude, initialValue.latitude] : calabarCenter);
    marker.addTo(map);
    markerRef.current = marker;

    const savePoint = (longitude: number, latitude: number) => onSelectRef.current({ latitude, longitude });
    map.on("click", (event) => {
      marker.setLngLat(event.lngLat);
      savePoint(event.lngLat.lng, event.lngLat.lat);
    });
    marker.on("dragend", () => {
      const point = marker.getLngLat();
      savePoint(point.lng, point.lat);
    });

    return () => {
      marker.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return;
    const point: LngLatLike = [value.longitude, value.latitude];
    markerRef.current.setLngLat(point);
    mapRef.current.easeTo({ center: point });
  }, [value]);

  useEffect(() => {
    const query = searchText.trim();
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || query.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
        url.searchParams.set("access_token", token);
        url.searchParams.set("country", "ng");
        url.searchParams.set("language", "en");
        url.searchParams.set("proximity", "8.3417,4.975");
        url.searchParams.set("types", "address,poi,poi.landmark,neighborhood,locality,place");
        url.searchParams.set("limit", "5");
        url.searchParams.set("autocomplete", "true");
        const response = await fetch(url, { signal: controller.signal });
        const result = await response.json() as { features?: MapboxFeature[] };
        if (!response.ok) throw new Error("We couldn’t search that location.");
        setSuggestions((result.features ?? []).filter((feature) => Array.isArray(feature.center) && feature.center.length === 2));
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSearchError(error instanceof Error ? error.message : "We couldn’t search that location.");
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchText]);

  const chooseSuggestion = (feature: MapboxFeature) => {
    const center = feature.center;
    const address = feature.place_name || feature.text || "";
    if (!center) return;
    const coordinates = { longitude: center[0], latitude: center[1] };
    markerRef.current?.setLngLat(center);
    mapRef.current?.flyTo({ center, zoom: 17 });
    setSearchText(address);
    setSuggestions([]);
    onSelectRef.current(coordinates, address);
  };

  if (!hasToken) return <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to .env.local, then restart the local site to use the map.</p>;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-green-200">
      <div className="relative z-10 bg-white p-3">
        <label className="mb-1 block text-xs font-semibold text-green-900" htmlFor="delivery-map-search">Search address or landmark</label>
        <input
          id="delivery-map-search"
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="e.g. Marian Road or a nearby landmark"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          className="w-full rounded-lg border border-green-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
        />
        {isSearching && <p className="mt-1 text-xs text-gray-500">Searching locations…</p>}
        {searchError && <p role="status" className="mt-1 text-xs text-red-700">{searchError}</p>}
        {searchText.trim().length > 0 && searchText.trim().length < 3 && <p className="mt-1 text-xs text-gray-500">Type at least 3 characters to search.</p>}
        {suggestions.length > 0 && (
          <ul role="listbox" className="absolute left-3 right-3 top-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {suggestions.map((feature) => (
              <li key={feature.id} role="option" aria-selected="false">
                <button type="button" onClick={() => chooseSuggestion(feature)} className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-green-50">
                  <span className="block font-medium text-gray-900">{feature.text || feature.place_name}</span>
                  {feature.place_name && feature.place_name !== feature.text && <span className="block text-xs text-gray-600">{feature.place_name}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={containerRef} className="h-72 w-full" aria-label="Choose your delivery location on the map" />
      <p className="bg-white px-3 py-2 text-xs text-gray-600">Search for an address or landmark, then adjust the pin to the exact delivery point. You can also tap the map or drag the pin.</p>
    </div>
  );
}
