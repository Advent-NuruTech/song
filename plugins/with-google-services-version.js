const { createRunOncePlugin, withProjectBuildGradle } = require("@expo/config-plugins");

const GOOGLE_SERVICES_VERSION = "4.5.0";

function withGoogleServicesVersion(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== "groovy") return mod;
    mod.modResults.contents = mod.modResults.contents.replace(
      /com\.google\.gms:google-services:[0-9]+(?:\.[0-9]+){1,3}/g,
      `com.google.gms:google-services:${GOOGLE_SERVICES_VERSION}`
    );
    return mod;
  });
}

module.exports = createRunOncePlugin(
  withGoogleServicesVersion,
  "advent-pro-google-services-version",
  GOOGLE_SERVICES_VERSION
);
