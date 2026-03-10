/**
 * app.config.js — Config dynamique Expo (prend priorité sur app.json)
 *
 * Permet d'injecter l'EAS project ID et d'autres valeurs
 * via variables d'environnement (GitHub Actions secrets, EAS env vars).
 *
 * Le paramètre `config` contient automatiquement le contenu de app.json.
 */
module.exports = ({ config }) => {
  const easProjectId =
    process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId || '';

  return {
    ...config,

    extra: {
      ...config.extra,
      eas: {
        projectId: easProjectId,
      },
    },

    // OTA Updates (activé uniquement si le project ID est connu)
    ...(easProjectId
      ? {
          updates: {
            url: `https://u.expo.dev/${easProjectId}`,
          },
          runtimeVersion: {
            policy: 'appVersion',
          },
        }
      : {}),
  };
};
