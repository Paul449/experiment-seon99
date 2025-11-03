import { requireNativeView } from 'expo';
import * as React from 'react';
const NativeView = requireNativeView('MyModule');
export default function MyModuleView(props) {
    return <NativeView {...props}/>;
}
//# sourceMappingURL=MyModuleView.js.map