import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { EventSummary } from "./EventCard";

const markerIcon = new L.Icon({
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = markerIcon;

export function EventMap({ events }: { events: EventSummary[] }) {
  const pins = events.filter((e) => e.latitude != null && e.longitude != null);

  return (
    <div className="map-wrap" style={{ height: "clamp(420px, 68vh, 760px)" }}>
      <MapContainer center={[35.68, 139.69]} zoom={6} style={{ height: "100%", width: "100%" }}>
        {/* CartoDB Voyager – English labels, free, no key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        {pins.map((e) => (
          <Marker key={e.id} position={[e.latitude!, e.longitude!]}>
            <Popup>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div>
              <div style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}>
                {new Date(e.startsAt).toLocaleString()} - {new Date(e.endsAt).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, marginTop: 2, color: "#64748b" }}>
                {Math.max(0, e.maxParticipants - e.participantCount)} spots left
              </div>
              <div style={{ marginTop: 8 }}>
                <a
                  href={`/events/${e.id}`}
                  style={{
                    background: "#4f46e5",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  View →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
