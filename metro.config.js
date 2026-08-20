const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

// Supabase Realtime includes a Node-only WebSocket fallback. React Native has a
// global WebSocket, so replace only that fallback while preserving Expo's
// default resolver order for Expo Router and its URL implementation.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "ws" && platform !== "web") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/shims/ws.native.js"),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
