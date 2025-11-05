import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Button, Alert, Text, ScrollView, ActivityIndicator } from 'react-native';
import { MyModuleView } from './modules/my-module';
import PhotogrammetryModule from './modules/my-module';
import MyModule from './modules/my-module';

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deviceSupported, setDeviceSupported] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [modelUrl, setModelUrl] = useState<string>('https://example.com/model.obj');
  const [capturedPhotos, setCapturedPhotos] = useState<number>(0);

  useEffect(() => {
    checkDeviceSupport();
    setupEventListeners();
    return () => {
      try {
        if (PhotogrammetryModule.removeAllListeners) {
          PhotogrammetryModule.removeAllListeners('onChange');
        }
      } catch (error) {
        console.log('Error removing listeners:', error);
      }
    };
  }, []);

  const checkDeviceSupport = async () => {
    try {
      const isSupported = await PhotogrammetryModule.isSupported();
      let info = null;
      if (PhotogrammetryModule.getDeviceInfo) {
        info = await PhotogrammetryModule.getDeviceInfo();
      }
      setDeviceSupported(isSupported);
      setDeviceInfo(info);
    } catch (error) {
      console.error('Error checking device support:', error);
      setDeviceSupported(false);
    }
  };

  const setupEventListeners = () => {
    try {
      if (PhotogrammetryModule.addListener) {
        PhotogrammetryModule.addListener('onChange', (event: any) => {
          if (event.type === 'progress') {
            setProgress(event.progress || 0);
          } else if (event.type === 'complete') {
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

  // 🧩 Step 1: Simulate capturing photos with native camera
  const capturePhotos = async () => {
    try {
      // Simulate photo capture process
      Alert.alert(
        'Camera Capture',
        'This will use your device camera to capture photos for 3D reconstruction.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Start Capture', 
            onPress: () => simulatePhotoCapture()
          }
        ]
      );
    } catch (error) {
      console.error('Camera capture error:', error);
      Alert.alert('Error', 'Failed to access camera.');
    }
  };

  const simulatePhotoCapture = () => {
    // Simulate capturing multiple photos
    const photoCount = Math.floor(Math.random() * 30) + 20; // 20-50 photos
    setCapturedPhotos(photoCount);
    Alert.alert('Photos Captured', `${photoCount} photos captured successfully!`);
  };

  // 🧩 Step 2: Process captured photos into 3D model
  const processCapturedPhotos = async () => {
    if (!deviceSupported) {
      Alert.alert('Not Supported', 'Photogrammetry is not supported on this device');
      return;
    }

    if (capturedPhotos === 0) {
      Alert.alert('No Photos', 'Please capture photos first');
      return;
    }

    try {
      // Use captured photos for processing
      const inputFolder = '/path/to/photos/';
      const outputPath = '/path/to/output/model.usdz';

      Alert.alert(
        'Ready to Process',
        `You captured ${capturedPhotos} photo(s).\n\nStarting 3D reconstruction...`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Processing',
            onPress: () => startPhotogrammetryProcess(inputFolder, outputPath),
          },
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to start processing.');
    }
  };

  const startPhotogrammetryProcess = async (inputFolder: string, outputPath: string) => {
    try {
      setIsProcessing(true);
      setProgress(0);
      const result = await PhotogrammetryModule.startObjectCapture(inputFolder, outputPath, 'medium');
      if (result && result.success) {
        setModelUrl(outputPath);
      }
    } catch (error) {
      console.error('Photogrammetry error:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Processing failed.');
    }
  };

  const cancelProcessing = async () => {
    try {
      if (PhotogrammetryModule.cancelCapture) {
        await PhotogrammetryModule.cancelCapture();
        setIsProcessing(false);
        setProgress(0);
        Alert.alert('Cancelled', 'Object capture has been cancelled');
      }
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const testSwiftFunction = async () => {
    try {
      if (MyModule && typeof MyModule.hello === 'function') {
        const result = await MyModule.hello();
        Alert.alert('Swift Says:', result);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not call Swift function');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Device Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Information</Text>
        {deviceInfo ? (
          <View style={styles.deviceInfo}>
            <Text>Model: {deviceInfo.model || 'Unknown'}</Text>
            <Text>iOS: {deviceInfo.systemVersion || 'Unknown'}</Text>
            <Text>Photogrammetry: {deviceSupported ? '✅ Supported' : '❌ Not Supported'}</Text>
            <Text>LiDAR: {deviceInfo.hasLiDAR ? '✅ Available' : '❌ Not Available'}</Text>
          </View>
        ) : (
          <Text>Loading device info...</Text>
        )}
      </View>

      {/* Camera Capture Section */}
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

      {/* Controls Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Controls</Text>
        <Button title="Test Swift Function" onPress={testSwiftFunction} />
        <View style={styles.buttonSpacing} />
        <Button title="Start Object Capture" onPress={processCapturedPhotos} disabled={isProcessing} />
        {isProcessing && (
          <View style={styles.buttonSpacing}>
            <Button title="Cancel Processing" onPress={cancelProcessing} color="red" />
          </View>
        )}
      </View>

      {/* Progress Section */}
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

      {/* 3D Model Viewer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3D Model Viewer</Text>
        <MyModuleView
          url={modelUrl}
          onLoad={(event) => console.log('Model loaded:', event.nativeEvent?.url)}
          style={styles.modelViewer}
        />
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