import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

export function initI18n() {
  const saved = localStorage.getItem("lang");
  const initial =
    saved === "ja" || saved === "en"
      ? saved
      : navigator.language?.toLowerCase().startsWith("ja")
        ? "ja"
        : "en";

  i18n.use(initReactI18next).init({
    lng: initial,
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      ja: { translation: ja },
    },
    interpolation: { escapeValue: false },
  });
}

export default i18n;

