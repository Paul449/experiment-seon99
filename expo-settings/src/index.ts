// Reexport the native module. On web, it will be resolved to ExpoSwiftModule.web.ts
// and on native platforms to ExpoSwiftModule.ts
export { default } from './ExpoSwiftModule';
export { default as ExpoSwiftView } from './ExpoSwiftView';
export * from  './ExpoSwift.types';
