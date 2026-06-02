import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { KANSAI_CENTER, KANSAI_DEFAULT_ZOOM, KANSAI_MAX_BOUNDS, KANSAI_VIEWBOX, isInKansai } from "../geo/kansai";

const markerIcon = new L.Icon({
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
    const res = await fetch(url, { headers: { "User-Agent": "exchange-events-app/1.0" } });
    const data = await res.json();
    return (data.display_name as string) || "";
  } catch {
    return "";
  }
}

async function forwardGeocode(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=en&viewbox=${KANSAI_VIEWBOX}&bounded=1`;
    const res = await fetch(url, { headers: { "User-Agent": "exchange-events-app/1.0" } });
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

type InputMode = "address" | "coords";

type Props = {
  address: string;
  onAddressChange: (a: string) => void;
  lat: number | null;
  lon: number | null;
  onLatLonChange: (lat: number, lon: number) => void;
  label?: string;
  hint?: string;
};

export function LocationPicker({ address, onAddressChange, lat, lon, onLatLonChange, label, hint }: Props) {
  const [mode, setMode] = useState<InputMode>("address");
  const [searching, setSearching] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  // Local coordinate string inputs
  const [latStr, setLatStr] = useState(lat != null ? String(lat) : "");
  const [lonStr, setLonStr] = useState(lon != null ? String(lon) : "");
  const [coordErr, setCoordErr] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const mapRef = useRef<L.Map | null>(null);

  // Keep coordinate inputs in sync when the pin changes via map click or address search
  useEffect(() => {
    if (lat != null) setLatStr(lat.toFixed(6));
    if (lon != null) setLonStr(lon.toFixed(6));
  }, [lat, lon]);

  useEffect(() => {
    if (lat != null && lon != null && mapRef.current) {
      mapRef.current.setView([lat, lon], Math.max(mapRef.current.getZoom(), 14));
    }
  }, [lat, lon]);

  async function handleSearch() {
    if (!address.trim()) return;
    setSearching(true);
    setGeoErr(null);
    const geo = await forwardGeocode(address.trim());
    setSearching(false);
    if (!geo) { setGeoErr("Address not found in Kansai."); return; }
    if (!isInKansai(geo.lat, geo.lon)) { setGeoErr("Location is outside the Kansai region."); return; }
    onLatLonChange(geo.lat, geo.lon);
  }

  async function handleMapClick(clickLat: number, clickLng: number) {
    if (!isInKansai(clickLat, clickLng)) return;
    onLatLonChange(clickLat, clickLng);
    const name = await reverseGeocode(clickLat, clickLng);
    if (name) onAddressChange(name);
  }

  async function handleCoordsApply() {
    setCoordErr(null);
    const parsedLat = parseFloat(latStr);
    const parsedLon = parseFloat(lonStr);

    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      setCoordErr("Enter valid numbers for latitude and longitude.");
      return;
    }
    if (parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
      setCoordErr("Coordinates out of valid range (lat ±90, lon ±180).");
      return;
    }
    if (!isInKansai(parsedLat, parsedLon)) {
      setCoordErr("Coordinates are outside the Kansai region.");
      return;
    }

    onLatLonChange(parsedLat, parsedLon);
    setGeocoding(true);
    const name = await reverseGeocode(parsedLat, parsedLon);
    setGeocoding(false);
    if (name) onAddressChange(name);
  }

  const modeBtn = (m: InputMode, label: string) => (
    <button
      type="button"
      onClick={() => { setMode(m); setGeoErr(null); setCoordErr(null); }}
      style={{
        padding: "5px 16px",
        borderRadius: 999,
        border: mode === m ? "2px solid var(--primary)" : "2px solid var(--border)",
        background: mode === m ? "var(--primary)" : "transparent",
        color: mode === m ? "#fff" : "var(--text-secondary)",
        fontWeight: mode === m ? 600 : 400,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {label && <label className="form-label">{label}</label>}

      {/* Mode switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {modeBtn("address", "📍 Address")}
        {modeBtn("coords", "🔢 Coordinates")}
      </div>

      {/* Address mode */}
      {mode === "address" && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
              placeholder="e.g. Fushimi Inari, Kyoto"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ whiteSpace: "nowrap" }}
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? "…" : "🔍 Find"}
            </button>
          </div>
          {hint && <p className="form-hint">{hint}</p>}
          {geoErr && <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 4 }}>{geoErr}</p>}
        </>
      )}

      {/* Coordinates mode */}
      {mode === "coords" && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ marginBottom: 4, fontSize: 12 }}>
                Latitude <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(34.0 – 36.0)</span>
              </label>
              <input
                className="input"
                type="number"
                step="any"
                value={latStr}
                onChange={(e) => { setLatStr(e.target.value); setCoordErr(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCoordsApply(); } }}
                placeholder="e.g. 34.9949"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ marginBottom: 4, fontSize: 12 }}>
                Longitude <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(134.0 – 136.5)</span>
              </label>
              <input
                className="input"
                type="number"
                step="any"
                value={lonStr}
                onChange={(e) => { setLonStr(e.target.value); setCoordErr(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCoordsApply(); } }}
                placeholder="e.g. 135.7556"
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ whiteSpace: "nowrap", marginBottom: 0 }}
              onClick={handleCoordsApply}
              disabled={geocoding}
            >
              {geocoding ? "…" : "✓ Set"}
            </button>
          </div>
          {coordErr && <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 6 }}>{coordErr}</p>}
          {geocoding && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Looking up address…</p>}
          {hint && <p className="form-hint">{hint}</p>}
        </>
      )}

      {/* Map — always visible */}
      <div className="map-wrap" style={{ height: 260, marginTop: 10 }}>
        <MapContainer
          center={lat != null && lon != null ? [lat, lon] : KANSAI_CENTER}
          zoom={lat != null ? 14 : KANSAI_DEFAULT_ZOOM}
          maxBounds={KANSAI_MAX_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={8}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef as any}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <ClickCatcher onPick={handleMapClick} />
          {lat != null && lon != null && (
            <Marker position={[lat, lon]} icon={markerIcon} />
          )}
        </MapContainer>
      </div>

      {lat != null && lon != null && (
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
          📍 {lat.toFixed(6)}, {lon.toFixed(6)} — or click the map to reposition
        </p>
      )}
    </div>
  );
}
