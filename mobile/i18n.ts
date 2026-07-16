import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import esTranslations from "../src/locales/es/translation.json";

void i18n.use(initReactI18next).init({
  lng: "es",
  fallbackLng: "es",
  supportedLngs: ["es"],
  interpolation: { escapeValue: false },
  resources: {
    es: { translation: esTranslations },
  },
});

export default i18n;
