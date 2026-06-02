import React from "react";
import { useTranslation } from "react-i18next";
import type { MapFilter } from "./KansaiMap";

interface Props {
  active: MapFilter;
  onChange: (f: MapFilter) => void;
}

export function MapFilterBar({ active, onChange }: Props) {
  const { t } = useTranslation();

  const FILTERS: { key: MapFilter; color: string }[] = [
    { key: "all", color: "var(--primary)" },
    { key: "events", color: "#3b82f6" },
    { key: "curated", color: "#22c55e" },
    { key: "myplaces", color: "#f97316" },
  ];

  const ICONS: Record<MapFilter, string> = {
    all: "",
    events: "🔵 ",
    curated: "🟢 ",
    myplaces: "🟠 ",
  };

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          style={{
            padding: "5px 14px",
            borderRadius: 999,
            border: active === f.key ? `2px solid ${f.color}` : "2px solid var(--border)",
            background: active === f.key ? f.color + "18" : "transparent",
            color: active === f.key ? f.color : "var(--text-secondary)",
            fontWeight: active === f.key ? 600 : 400,
            fontSize: 13,
            cursor: "pointer",
            transition: "all .15s",
          }}
        >
          {ICONS[f.key]}{t(`map.filter.${f.key}`)}
        </button>
      ))}
    </div>
  );
}
