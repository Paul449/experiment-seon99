import * as React from 'react';

import { ExpoSwiftViewProps } from './ExpoSwift.types';

export default function ExpoSwiftView(props: ExpoSwiftViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
