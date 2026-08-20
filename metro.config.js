const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

// Supabase 2.45 ships separate CommonJS (Node) and ES module (browser/native)
// builds but has no package exports map. Prefer its module build so Metro does
// not follow the Node-only `ws` package and attempt to bundle `stream`.
config.resolver.resolverMainFields = ["react-native", "browser", "module", "main"];
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
