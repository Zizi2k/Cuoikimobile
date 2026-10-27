const base = require("./app.json");
module.exports = () => ({
  ...base.expo,
  extra: {
    ...base.expo.extra,
    eas: {
      projectId:
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
        base.expo.extra?.eas?.projectId,
    },
  },
  android: {
    ...base.expo.android,
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
  },
});
