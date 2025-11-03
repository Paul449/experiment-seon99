// Web fallback for MyModule
export default {
    PI: 3.14159,
    hello() {
        console.log('🌐 [Web] MyModule.hello() called');
        return 'Hello from Web fallback! 👋';
    },
    async setValueAsync(value) {
        console.log('🌐 [Web] MyModule.setValueAsync called with:', value);
        return Promise.resolve();
    },
};
//# sourceMappingURL=MyModule.web.js.map