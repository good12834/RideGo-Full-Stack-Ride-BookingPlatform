import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Crosshair, X } from "lucide-react";

// Demo gazetteer — in production this hits a geocoding API (Nominatim / Google Places)
export const DEMO_PLACES = [
  { address: "Downtown Central Station", latitude: 40.758, longitude: -73.9855 },
  { address: "International Airport Terminal 3", latitude: 40.6413, longitude: -73.7781 },
  { address: "Grandview Shopping Mall", latitude: 40.7411, longitude: -73.9897 },
  { address: "Riverside University Campus", latitude: 40.809, longitude: -73.9605 },
  { address: "City Stadium North Gate", latitude: 40.7736, longitude: -73.9566 },
  { address: "Innovation Tech Park", latitude: 40.7081, longitude: -73.9571 },
  { address: "St. Mary General Hospital", latitude: 40.7691, longitude: -73.9712 },
  { address: "Old Harbor Waterfront", latitude: 40.7005, longitude: -74.0149 },
  { address: "Museum of Modern Art", latitude: 40.7614, longitude: -73.9776 },
  { address: "Central Park Boathouse", latitude: 40.7735, longitude: -73.9703 },
];

export default function LocationSearch({
  value,
  onChange,
  placeholder = "Search a location...",
  icon = "pin",
  allowCurrentLocation = false,
  className = "",
}) {
  const [query, setQuery] = useState(value?.address || "");
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value?.address || "");
  }, [value]);

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = query.trim()
    ? DEMO_PLACES.filter((p) => p.address.toLowerCase().includes(query.trim().toLowerCase()))
    : DEMO_PLACES;

  function select(place) {
    onChange(place);
    setQuery(place.address);
    setOpen(false);
  }

  function useCurrent() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const place = {
          address: "My current location",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        select(place);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  const Icon = icon === "target" ? MapPin : icon === "search" ? Search : MapPin;

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-500" />
        <input
          className="input-base pl-11 pr-20"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full p-1 text-night-400 hover:bg-night-100"
            onClick={() => {
              setQuery("");
              onChange(null);
            }}
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {allowCurrentLocation && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-night-500 hover:bg-primary-50 hover:text-primary-600"
            onClick={useCurrent}
            disabled={locating}
            title="Use my current location"
          >
            <Crosshair className={`h-4 w-4 ${locating ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-night-100 bg-white shadow-card">
          {results.map((p) => (
            <button
              key={p.address}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-primary-50"
              onClick={() => select(p)}
            >
              <MapPin className="h-4 w-4 shrink-0 text-night-400" />
              <span className="truncate">{p.address}</span>
            </button>
          ))}
          {query.trim() && !results.length && (
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-primary-50"
              onClick={() =>
                select({
                  address: query.trim(),
                  latitude: DEMO_PLACES[0].latitude + (Math.random() - 0.5) * 0.02,
                  longitude: DEMO_PLACES[0].longitude + (Math.random() - 0.5) * 0.02,
                })
              }
            >
              <Search className="h-4 w-4 shrink-0 text-night-400" />
              Use "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
