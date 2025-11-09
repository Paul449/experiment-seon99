import { useEffect, useState } from 'react';

import { Image } from 'expo-image';
import { Platform, StyleSheet, Button } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { requireNativeModule } from 'expo-modules-core';

const MyModule = requireNativeModule('MyModule');

export default function HomeScreen() {
  const [progress, setProgress] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [datasetPath, setDatasetPath] = useState<string | null>(null);

  useEffect(() => {
    const subscriptions = [
      MyModule.addListener('onProgress', (event: { fractionComplete: number }) => {
        setProgress(event.fractionComplete);
      }),
      MyModule.addListener('onLog', (event: { message: string }) => {
        setLogs((current) => [event.message, ...current].slice(0, 5));
      }),
      MyModule.addListener('onError', (event: { message: string }) => {
        alert(`Photogrammetry error: ${event.message}`);
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  const handleHello = () => {
    const result = MyModule.hello();
    alert(result);
  };

  const handleSetValue = async () => {
    await MyModule.setValueAsync('Test Value');
  };

  const ensureDatasetPath = async () => {
    try {
      const path = await MyModule.prepareBundledDataset('Rock36Images');
      setDatasetPath(path);
      return path;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to prepare dataset: ${message}`);
      throw error;
    }
  };

  const handlePhotogrammetry = async () => {
    try {
      const inputFolder = datasetPath ?? (await ensureDatasetPath());
      const outputFile = `${inputFolder}/output.usdz`;
      const result = await MyModule.processPhotogrammetry({
        inputFolder,
        outputFile,
        detail: 'preview',
      });
      alert(`Model created at: ${result}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Photogrammetry failed', error);
      alert(`Photogrammetry failed: ${message}`);
    }
  };

  const handlePhotogrammetryCancel = () => {
    MyModule.cancelPhotogrammetry();
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">MyModule Test</ThemedText>
        <Button title="Call Hello" onPress={handleHello} />
        <Button title="Set Value Async" onPress={handleSetValue} />
        <ThemedText>PI constant: {MyModule.PI}</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Photogrammetry</ThemedText>
        <Button title="Start Photogrammetry" onPress={handlePhotogrammetry} />
        <Button title="Cancel Photogrammetry" onPress={handlePhotogrammetryCancel} />
        {progress !== null && (
          <ThemedText>
            Progress: {(progress * 100).toFixed(1)}%
          </ThemedText>
        )}
        {logs.length > 0 && (
          <ThemedView style={styles.logsContainer}>
            {logs.map((entry, index) => (
              <ThemedText key={index} style={styles.logItem}>
                {entry}
              </ThemedText>
            ))}
          </ThemedView>
        )}
        {datasetPath && (
          <ThemedText numberOfLines={2} style={styles.datasetPath}>
            Dataset copied to: {datasetPath}
          </ThemedText>
        )}
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  logsContainer: {
    gap: 4,
    paddingVertical: 4,
  },
  logItem: {
    fontSize: 12,
  },
  datasetPath: {
    fontSize: 12,
  },
});
