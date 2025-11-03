const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add the parent directory to watch folders so Metro can find the local module
config.watchFolders = [
  path.resolve(__dirname, '../Module3D'),
  path.resolve(__dirname, '../Module3D/node_modules'),
];

// Add node modules paths
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

// Ensure Metro can resolve the local module
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;