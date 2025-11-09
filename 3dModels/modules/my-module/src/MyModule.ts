import { NativeModule, requireNativeModule } from 'expo';

import { MyModuleEvents, PhotogrammetryOptions } from './MyModule.types';

declare class MyModule extends NativeModule<MyModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
  processPhotogrammetry(options: PhotogrammetryOptions): Promise<string>;
  cancelPhotogrammetry(): void;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MyModule>('MyModule');
