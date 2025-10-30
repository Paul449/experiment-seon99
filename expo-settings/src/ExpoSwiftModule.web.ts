import { registerWebModule, NativeModule } from 'expo';

import { ExpoSwiftModuleEvents } from './ExpoSwift.types';

class ExpoSwiftModule extends NativeModule<ExpoSwiftModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ExpoSwiftModule, 'ExpoSwiftModule');
