const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure Metro can resolve the local module
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;