import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as SecureStore from "expo-secure-store";

import esTranslations from "../src/locales/es/translation.json";
import enTranslations from "../src/locales/en/translation.json";

const LANGUAGE_KEY = "app_language";

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  init: () => undefined,
  detect: (callback: (lang: string) => void) => {
    SecureStore.getItemAsync(LANGUAGE_KEY)
      .then((stored) => callback(stored || "es"))
      .catch(() => callback("es"));
  },
  cacheUserLanguage: async (lang: string) => {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  },
};

void i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    interpolation: { escapeValue: false },
    resources: {
      es: { translation: esTranslations },
      en: { translation: enTranslations },
    },
  });

export default i18n;
