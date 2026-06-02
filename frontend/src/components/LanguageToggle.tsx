import React from "react";
import { useAuth } from "../context/AuthContext";
import i18n from "../i18n/i18n";

export function LanguageToggle() {
  const { setLanguage } = useAuth();
  const lang = i18n.language === "ja" ? "ja" : "en";

  async function onChange(next: "en" | "ja") {
    await setLanguage(next);
  }

  return (
    <div className="lang-toggle">
      <button
        className={`lang-btn${lang === "en" ? " lang-btn-active" : ""}`}
        onClick={() => onChange("en")}
      >
        EN
      </button>
      <button
        className={`lang-btn${lang === "ja" ? " lang-btn-active" : ""}`}
        onClick={() => onChange("ja")}
      >
        日本語
      </button>
    </div>
  );
}
