import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hu from './locales/hu.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      hu: {
        translation: hu,
      },
    },
    fallbackLng: 'en',
    debug: true,
    load: 'languageOnly',

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;