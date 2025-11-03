// Web fallback for MyModule
export default {
  PI: 3.14159,
  hello(): string {
    console.log('🌐 [Web] MyModule.hello() called');
    return 'Hello from Web fallback! 👋';
  },
  async setValueAsync(value: string): Promise<void> {
    console.log('🌐 [Web] MyModule.setValueAsync called with:', value);
    return Promise.resolve();
  },
};