import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoSwiftViewProps } from './ExpoSwift.types';

const NativeView: React.ComponentType<ExpoSwiftViewProps> =
  requireNativeView('ExpoSwift');

export default function ExpoSwiftView(props: ExpoSwiftViewProps) {
  return <NativeView {...props} />;
}
