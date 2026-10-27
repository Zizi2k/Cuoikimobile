const fs = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  // EAS file variable takes precedence; local Firebase config also works without .env.
  const localFirebaseFile = "./google-services.json";
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync(path.resolve(__dirname, localFirebaseFile)) ? localFirebaseFile : config.android?.googleServicesFile);
  return {
    ...config,
    extra: {
      ...config.extra,
      eas: {
        ...config.extra?.eas,
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId,
      },
    },
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
