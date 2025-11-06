import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Button,
  Alert,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MyModuleView } from './modules/my-module';
import { requireNativeModule } from 'expo-modules-core';
import * as ImagePicker from 'expo-image-picker';
import Model3DViewer from './components/Model3DViewer';

const PhotogrammetryHelper = requireNativeModule('PhotogrammetryHelper');
const MyModule = requireNativeModule('MyModule');

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deviceSupported, setDeviceSupported] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [modelUrl, setModelUrl] = useState<string>('https://example.com/model.obj');
  const [capturedPhotos, setCapturedPhotos] = useState<number>(0);
  const [selectedPhotos, setSelectedPhotos] = useState<{ uri: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'You need to grant photo library access to upload photos.'
        );
      }
    })();

    checkDeviceSupport();
    setupEventListeners();

    return () => {
      try {
        if (PhotogrammetryHelper.removeAllListeners) {
          PhotogrammetryHelper.removeAllListeners('onChange');
        }
      } catch (error) {
        console.log('Error removing listeners:', error);
      }
    };
  }, []);

  const checkDeviceSupport = async () => {
    try {
      const isSupported = await PhotogrammetryHelper.isSupported?.();
      const info = await PhotogrammetryHelper.getDeviceInfo?.();
      setDeviceSupported(!!isSupported);
      setDeviceInfo(info);
    } catch (error) {
      console.error('Error checking device support:', error);
      setDeviceSupported(false);
    }
  };

  const setupEventListeners = () => {
    try {
      if (PhotogrammetryHelper.addListener) {
        PhotogrammetryHelper.addListener('onChange', (event: any) => {
          if (event.type === 'progress') setProgress(event.progress || 0);
          else if (event.type === 'complete') {
            setIsProcessing(false);
            setProgress(1);
            Alert.alert('Success!', 'Object capture completed successfully!');
          } else if (event.type === 'error') {
            setIsProcessing(false);
            Alert.alert('Error', event.error || 'An error occurred');
          }
        });
      }
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  };

  const capturePhotos = async () => {
    Alert.alert(
      'Camera Capture',
      'This will use your device camera to capture photos for 3D reconstruction.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Capture', onPress: simulatePhotoCapture },
      ]
    );
  };

  const simulatePhotoCapture = () => {
    const photoCount = Math.floor(Math.random() * 30) + 20;
    setCapturedPhotos(photoCount);
    Alert.alert('Photos Captured', `${photoCount} photos captured successfully!`);
  };

  const uploadPhotos = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    quality: 1,
  });

  if (!result.canceled) {
    setSelectedPhotos(result.assets);
  }
};

  const processCapturedPhotos = async () => {
    /*
    if (!deviceSupported) {
      Alert.alert('Not Supported', 'Photogrammetry is not supported on this device');
      return;
    }
*/
    const totalPhotos = capturedPhotos + selectedPhotos.length;
    if (totalPhotos === 0) {
      Alert.alert('No Photos', 'Please capture or upload photos first');
      return;
    }

    const inputFolder = '/path/to/photos/';
    const outputPath = '/path/to/output/model.usdz';

    Alert.alert(
      'Ready to Process',
      `You have ${totalPhotos} photo(s).\nStarting 3D reconstruction...`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Processing',
          onPress: () => startPhotogrammetryProcess(inputFolder, outputPath),
        },
      ]
    );
  };

  const startPhotogrammetryProcess = async (inputFolder: string, outputPath: string) => {
    try {
      setIsProcessing(true);
      setProgress(0);
      const result = await PhotogrammetryHelper.startPhotogrammetrySession();
      console.log('Photogrammetry result:', result);
      setIsProcessing(false);
      setProgress(1);
      Alert.alert('Success!', result || 'Object capture completed!');
      setModelUrl(outputPath);
    } catch (error) {
      console.error('Photogrammetry error:', error);
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Processing failed.';
      Alert.alert('Error', errorMessage);
    }
  };

  const cancelProcessing = async () => {
    try {
      await PhotogrammetryHelper.cancelCapture?.();
      setIsProcessing(false);
      setProgress(0);
      Alert.alert('Cancelled', 'Object capture has been cancelled');
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const testSwiftFunction = async () => {
    try {
      if (MyModule?.hello) {
        const result = await MyModule.hello();
        Alert.alert('Swift Says:', result);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not call Swift function');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Device Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Information</Text>
        {deviceInfo ? (
          <View style={styles.deviceInfo}>
            <Text>Model: {deviceInfo.model || 'Unknown'}</Text>
            <Text>iOS: {deviceInfo.systemVersion || 'Unknown'}</Text>
            <Text>
              Photogrammetry: {deviceSupported ? '✅ Supported' : '❌ Not Supported'}
            </Text>
            <Text>
              LiDAR: {deviceInfo.hasLiDAR ? '✅ Available' : '❌ Not Available'}
            </Text>
          </View>
        ) : (
          <Text>Loading device info...</Text>
        )}
      </View>

      {/* Capture Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo Capture</Text>
        <Button title="Capture Photos" onPress={capturePhotos} />
        {capturedPhotos > 0 && (
          <View style={styles.photoInfo}>
            <Text style={styles.photoCount}>📸 {capturedPhotos} photos captured</Text>
            <Text style={styles.photoStatus}>Ready for 3D processing</Text>
          </View>
        )}
      </View>

      {/* Upload Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Existing Photos</Text>
        <Button title="Upload Photos" onPress={uploadPhotos} />
        {selectedPhotos.length > 0 && (
          <ScrollView horizontal style={{ marginTop: 10 }}>
            {selectedPhotos.map((photo, index) => (
              <View key={`photo-${index}`}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{
                    width: 100,
                    height: 100,
                    marginRight: 8,
                    borderRadius: 8,
                  }}
                />
              </View>
            ))}
          </ScrollView>
        )}
  </View>


      {/* Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Controls</Text>
        <Button title="Test Swift Function" onPress={testSwiftFunction} />
        <View style={styles.buttonSpacing} />
        <Button
          title="Start Object Capture"
          onPress={processCapturedPhotos}
          disabled={isProcessing}
        />
        {isProcessing && (
          <View style={styles.buttonSpacing}>
            <Button title="Cancel Processing" onPress={cancelProcessing} color="red" />
          </View>
        )}
      </View>

      {/* Progress */}
      {isProcessing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.progressText}>{Math.round(progress * 100)}% Complete</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      )}

      {/* Model Viewer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3D Model Viewer</Text>
        <Model3DViewer modelUrl={modelUrl} style={styles.modelViewer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 20 },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  deviceInfo: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 5 },
  photoInfo: { backgroundColor: '#e8f5e8', padding: 10, marginTop: 10, borderRadius: 5 },
  photoCount: { fontSize: 16, fontWeight: '600', color: '#2e7d32' },
  photoStatus: { fontSize: 14, color: '#558b2f', marginTop: 2 },
  buttonSpacing: { height: 15 },
  progressText: { textAlign: 'center', marginTop: 10, fontSize: 16, fontWeight: '500' },
  progressBar: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, marginTop: 10 },
  progressFill: { height: '100%', backgroundColor: '#4caf50', borderRadius: 4 },
  modelViewer: { width: '100%', height: 250, backgroundColor: '#000', borderRadius: 10 },
});
