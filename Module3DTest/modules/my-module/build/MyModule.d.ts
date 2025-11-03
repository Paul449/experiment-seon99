import { NativeModule } from 'expo';
import { MyModuleEvents } from './MyModule.types';
declare class MyModule extends NativeModule<MyModuleEvents> {
    PI: number;
    hello(): string;
    setValueAsync(value: string): Promise<void>;
}
declare const _default: MyModule;
export default _default;
//# sourceMappingURL=MyModule.d.ts.map