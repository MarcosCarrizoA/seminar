import React from "react";
import { useTranslation } from "react-i18next";
import type { MapFilter } from "./KansaiMap";
import type { Playlist } from "../api/client";

interface Props {
  active: MapFilter;
  onChange: (f: MapFilter) => void;
  playlists: Playlist[];
}

export function MapFilterBar({ active, onChange, playlists }: Props) {
  const { t } = useTranslation();

  return (
    <div className="map-filter-bar">
      <button
        onClick={() => onChange("events")}
        className={`map-filter-chip${active === "events" ? " active" : ""}`}
      >
        🔵 {t("map.eventsOnly")}
      </button>
      {playlists.map((p) => {
        const key = `playlist:${p.id}` as MapFilter;
        return (
        <button
          key={p.id}
          onClick={() => onChange(key)}
          className={`map-filter-chip${active === key ? " active" : ""}`}
        >
          🟠 {p.name}
        </button>
      )})}
    </div>
  );
}
