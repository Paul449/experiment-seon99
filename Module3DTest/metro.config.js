const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure Metro can resolve the local module
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Disable package exports to suppress Three.js warnings
config.resolver.unstable_enablePackageExports = false;

module.exports = config;