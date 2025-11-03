import * as React from 'react';
import { View, StyleSheet, Text } from 'react-native';

import { MyModuleViewProps } from './MyModule.types';

export default function MyModuleView(props: MyModuleViewProps) {
  React.useEffect(() => {
    console.log('🌐 [Web] MyModuleView created with URL:', props.url);
    
    // Simulate loading after a short delay
    setTimeout(() => {
      if (props.onLoad) {
        props.onLoad({ nativeEvent: { url: props.url } });
      }
    }, 1000);
  }, [props.url, props.onLoad]);

  return (
    <View style={[styles.container, props.style]}>
      <Text style={styles.title}>3D Module View (Web)</Text>
      <Text style={styles.url}>URL: {props.url}</Text>
      <Text style={styles.placeholder}>🌐 Web Placeholder for 3D Model</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  url: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholder: {
    fontSize: 24,
    color: '#999',
  },
});