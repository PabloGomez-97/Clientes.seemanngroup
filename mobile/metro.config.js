const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const mobileModules = path.resolve(projectRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [mobileModules];
config.resolver.extraNodeModules = {
  react: path.join(mobileModules, "react"),
  "react-native": path.join(mobileModules, "react-native"),
  expo: path.join(mobileModules, "expo"),
};

module.exports = config;
