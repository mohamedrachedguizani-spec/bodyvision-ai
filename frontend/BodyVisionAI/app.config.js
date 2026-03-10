/**
 * app.config.js — Configuration dynamique Expo
 * Permet de gérer plusieurs variantes (dev / preview / production)
 * et d'injecter l'URL de l'API selon l'environnement.
 *
 * Usage EAS :
 *   APP_VARIANT=preview eas build --platform android --profile preview
 */

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getAppName = () => {
  if (IS_DEV) return 'BodyVision (Dev)';
  if (IS_PREVIEW) return 'BodyVision Bêta';
  return 'BodyVision AI';
};

const getPackageId = () => {
  if (IS_DEV) return 'com.bodyvision.ai.dev';
  if (IS_PREVIEW) return 'com.bodyvision.ai.preview';
  return 'com.bodyvision.ai';
};

export default ({ config }) => ({
  ...config,
  name: getAppName(),
  ios: {
    ...config.ios,
    bundleIdentifier: getPackageId(),
  },
  android: {
    ...config.android,
    package: getPackageId(),
  },
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || null,
    appVariant: process.env.APP_VARIANT || 'production',
    eas: {
      // Sera rempli automatiquement par "eas init"
      projectId: process.env.EAS_PROJECT_ID || config?.extra?.eas?.projectId || '',
    },
  },
});
