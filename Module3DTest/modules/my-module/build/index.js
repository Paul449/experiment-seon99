// Reexport the native module. On web, it will be resolved to MyModule.web.ts
// and on native platforms to MyModule.ts
export { default } from './MyModule';
export { default as MyModuleView } from './MyModuleView';
export * from './MyModule.types';
//# sourceMappingURL=index.js.map