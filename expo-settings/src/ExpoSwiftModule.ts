import { NativeModule, requireNativeModule } from 'expo';

import { ExpoSwiftModuleEvents } from './ExpoSwift.types';

declare class ExpoSwiftModule extends NativeModule<ExpoSwiftModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoSwiftModule>('ExpoSwift');

