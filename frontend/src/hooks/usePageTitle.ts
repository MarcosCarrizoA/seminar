import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Sets document.title to "Kizuna – <translatedKey>" and resets on unmount.
 * Pass a dot-notation i18n key, e.g. "nav.home".
 */
export function usePageTitle(key: string) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = `Kizuna – ${t(key)}`;
    return () => {
      document.title = "Kizuna";
    };
  }, [key, i18n.language]);
}
