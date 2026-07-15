const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const mobileModules = path.resolve(projectRoot, "node_modules");
const srcRoot = path.resolve(workspaceRoot, "src");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [mobileModules];
config.resolver.extraNodeModules = {
  react: path.join(mobileModules, "react"),
  "react-native": path.join(mobileModules, "react-native"),
  expo: path.join(mobileModules, "expo"),
};

function resolveSrcAlias(relPath) {
  const cleaned = relPath.replace(/^\//, "");
  const base = path.join(srcRoot, cleaned);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.json`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { type: "sourceFile", filePath: candidate };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    const resolved = resolveSrcAlias(moduleName.slice(2));
    if (resolved) return resolved;
  }
  if (typeof defaultResolveRequest === "function") {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
