import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en/translation.json';
import esTranslations from './locales/es/translation.json';
import enExecutiveReporting from './locales/en/executiveReporting.json';
import esExecutiveReporting from './locales/es/executiveReporting.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    debug: false,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      convertDetectedLanguage: (lng: string) => lng.split('-')[0],
    },
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: { ...enTranslations, ...enExecutiveReporting }
      },
      es: {
        translation: { ...esTranslations, ...esExecutiveReporting }
      }
    }
  });

export default i18n;