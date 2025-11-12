import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
// Axios library for making HTTP client requests
import axios from "axios";
// Create an instance of Axios with default headers
const apiClient = axios.create({
  baseURL: 'https://api.minimax.io/v1/video_generation',
  headers: {
    'Authorization': `Bearer ${process.env.MY_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export default function HomeScreen() {


}


