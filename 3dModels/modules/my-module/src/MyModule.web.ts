import { registerWebModule, NativeModule } from 'expo';

import type {
  ChangeEventPayload,
  ErrorEventPayload,
  MyModuleEvents,
  PhotogrammetryOptions,
} from './MyModule.types';

class MyModule extends NativeModule<MyModuleEvents> {
  PI = Math.PI;

  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value } satisfies ChangeEventPayload);
  }

  hello(): string {
    return 'Hello world! 👋';
  }

  async processPhotogrammetry(_: PhotogrammetryOptions): Promise<string> {
    const message = 'Photogrammetry is not supported on web.';
    this.emit('onError', { message } satisfies ErrorEventPayload);
    throw new Error(message);
  }

  cancelPhotogrammetry(): void {
    this.emit('onError', { message: 'Photogrammetry is not supported on web.' });
  }
}

export default registerWebModule(MyModule, 'MyModule');
