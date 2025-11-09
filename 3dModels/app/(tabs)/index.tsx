import { useEffect, useState } from 'react';

import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Platform, StyleSheet, Button, View } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { requireNativeModule } from 'expo-modules-core';

import MyModuleView from '@/modules/my-module/src/MyModuleView';

const MyModule = requireNativeModule('MyModule');

export default function HomeScreen() {
  const [progress, setProgress] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [datasetUri, setDatasetUri] = useState<string | null>(null);
  const [datasetFilesystemPath, setDatasetFilesystemPath] = useState<string | null>(null);
  const [datasetKind, setDatasetKind] = useState<'sample' | 'user' | null>(null);
  const [imageCount, setImageCount] = useState<number>(0);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const toFileUri = (value: string) => {
    if (value.startsWith('file://')) {
      return value;
    }
    const trimmed = value.replace(/^\/*/, '');
    const encoded = trimmed
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `file:///${encoded}`;
  };

  const toFilesystemPath = (value: string) => {
    if (value.startsWith('file://')) {
      const decoded = decodeURIComponent(value.replace('file://', ''));
      return decoded.startsWith('/') ? decoded : `/${decoded}`;
    }
    return value;
  };

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

  const refreshImageStats = async (uri: string) => {
    try {
      const entries = await FileSystem.readDirectoryAsync(toFileUri(uri));
      const count = entries.filter((entry) => /\.(?:jpe?g|png|heic)$/i.test(entry)).length;
      setImageCount(count);
      return count;
    } catch (error) {
      console.warn('Unable to read dataset contents', error);
      setImageCount(0);
      return 0;
    }
  };

  const prepareSampleDataset = async (): Promise<{ uri: string; fsPath: string }> => {
    try {
      const fsPath = await MyModule.prepareBundledDataset('Rock36Images');
      const uri = toFileUri(fsPath);
      setDatasetFilesystemPath(fsPath);
      setDatasetUri(uri);
      setDatasetKind('sample');
      setModelPath(null);
      setProgress(null);
      const count = await refreshImageStats(uri);
      setLogs((current) => [`Sample dataset ready with ${count} image${count === 1 ? '' : 's'}.`, ...current].slice(0, 5));
      return { uri, fsPath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to prepare dataset: ${message}`);
      throw error;
    }
  };

  const handleUseSampleDataset = async () => {
    await prepareSampleDataset();
  };

  const handlePickImages = async () => {
  const pickerPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!pickerPermission.granted) {
      alert('Permission to access the photo library is required.');
      return;
    }

    const mediaPermission = await MediaLibrary.requestPermissionsAsync();
    if (!mediaPermission.granted) {
      alert('Permission to read photo assets is required.');
      return;
    }

    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      selectionLimit: 0,
    });

    if (selection.canceled || !selection.assets?.length) {
      return;
    }

    const documentDirectory = FileSystem.documentDirectory ?? null;
    if (!documentDirectory) {
      alert('Document directory is not available on this device.');
      return;
    }

  const datasetRootUri = `${documentDirectory}UserPhotogrammetryDataset`;
  await FileSystem.deleteAsync(datasetRootUri, { idempotent: true });
  await FileSystem.makeDirectoryAsync(datasetRootUri, { intermediates: true });

    let copied = 0;

    for (const asset of selection.assets) {
      if (!asset.uri) {
        continue;
      }

      let sourceUri = asset.uri;

      if (sourceUri.startsWith('ph://')) {
        if (asset.assetId) {
          const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
          if (info.localUri) {
            sourceUri = info.localUri;
          } else if (info.uri) {
            const tempFileName = asset.fileName ?? `asset-${Date.now()}-${copied}`;
            const cacheDirectory = FileSystem.cacheDirectory ?? documentDirectory;
            const tempTarget = `${cacheDirectory}${tempFileName}`;
            const download = await FileSystem.downloadAsync(info.uri, tempTarget);
            sourceUri = download.uri;
          } else {
            continue;
          }
        } else {
          continue;
        }
      }

      const extension = asset.fileName?.split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : 'jpg';
      const targetPath = `${datasetRootUri}/image-${String(copied).padStart(3, '0')}.${safeExtension}`;

      try {
        await FileSystem.copyAsync({ from: sourceUri, to: targetPath });
        copied += 1;
      } catch (error) {
        console.warn('Failed to copy asset', error);
      }
    }

    if (copied === 0) {
      await FileSystem.deleteAsync(datasetRootUri, { idempotent: true });
      alert('Could not copy the selected images. Please try again.');
      return;
    }

    const fsPath = toFilesystemPath(datasetRootUri);
    setDatasetUri(datasetRootUri);
    setDatasetFilesystemPath(fsPath);
    setDatasetKind('user');
    setModelPath(null);
    setProgress(null);

    await refreshImageStats(datasetRootUri);

    setLogs((current) => [`User dataset prepared with ${copied} image${copied === 1 ? '' : 's'}.`, ...current].slice(0, 5));
  };

  const handlePhotogrammetry = async () => {
    setIsProcessing(true);
    try {
      const dataset = datasetFilesystemPath && datasetUri
        ? { fsPath: datasetFilesystemPath, uri: datasetUri }
        : await prepareSampleDataset();
      if (!dataset) {
        return;
      }

      const { fsPath, uri } = dataset;
      const count = await refreshImageStats(uri);
      if (count === 0) {
        alert('Dataset is empty. Add images before processing.');
        return;
      }

      setModelPath(null);
      setProgress(0);
      setLogs((current) => [`Processing dataset with ${count} image${count === 1 ? '' : 's'}.`, ...current].slice(0, 5));

      const outputFile = `${fsPath}/output.usdz`;
      const result = await MyModule.processPhotogrammetry({
        inputFolder: fsPath,
        outputFile,
        detail: 'preview',
      });
      setModelPath(result);
      alert(`Model created at: ${result}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Photogrammetry failed', error);
      alert(`Photogrammetry failed: ${message}`);
      setProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotogrammetryCancel = () => {
    MyModule.cancelPhotogrammetry();
    setIsProcessing(false);
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
        <View style={styles.buttonRow}>
          <Button title="Select Images" onPress={handlePickImages} />
          <Button title="Use Sample Dataset" onPress={handleUseSampleDataset} />
        </View>
        <Button
          title={isProcessing ? 'Processing...' : 'Start Photogrammetry'}
          onPress={handlePhotogrammetry}
          disabled={isProcessing}
        />
        <Button
          title="Cancel Photogrammetry"
          onPress={handlePhotogrammetryCancel}
          disabled={!isProcessing}
        />
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
        {(datasetUri || datasetFilesystemPath) && (
          <ThemedView style={styles.datasetInfo}>
            <ThemedText numberOfLines={2} style={styles.datasetPath}>
              Dataset location: {datasetFilesystemPath ?? datasetUri}
            </ThemedText>
            <ThemedText style={styles.infoText}>
              Source: {datasetKind === 'user' ? 'User selection' : 'Sample bundle'}
            </ThemedText>
            <ThemedText style={styles.infoText}>Images detected: {imageCount}</ThemedText>
          </ThemedView>
        )}
        {modelPath && (
          <View style={styles.viewerContainer}>
            <ThemedText type="defaultSemiBold">Model Preview</ThemedText>
            <MyModuleView
              style={styles.viewer}
              modelPath={modelPath}
              onLoad={(event) => {
                const { url, error } = event.nativeEvent;
                if (error) {
                  alert(`Preview error: ${error}`);
                } else if (url) {
                  setLogs((current) => [`Preview loaded from ${url}`, ...current].slice(0, 5));
                }
              }}
            />
          </View>
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
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  datasetInfo: {
    gap: 4,
  },
  infoText: {
    fontSize: 12,
  },
  viewerContainer: {
    gap: 8,
    height: 260,
  },
  viewer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
});
