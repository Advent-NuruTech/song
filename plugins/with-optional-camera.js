const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Keep camera capture available without making a physical camera an install
 * requirement. Android otherwise infers a required camera feature from the
 * CAMERA permission contributed by expo-image-picker.
 */
module.exports = function withOptionalCamera(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;
    const features = manifest["uses-feature"] ?? [];
    const cameraFeature = features.find(
      (feature) => feature.$?.["android:name"] === "android.hardware.camera"
    );

    if (cameraFeature) {
      cameraFeature.$["android:required"] = "false";
    } else {
      features.push({
        $: {
          "android:name": "android.hardware.camera",
          "android:required": "false",
        },
      });
    }

    manifest["uses-feature"] = features;
    return androidConfig;
  });
};
