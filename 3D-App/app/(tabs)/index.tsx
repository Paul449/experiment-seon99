import * as ExpoSwift from '@/expo-settings/src';
// Remove duplicate import: import PI  from '@/expo-settings/src'
import { Text, View, ScrollView } from 'react-native';

export default function HomeScreen() {
  try {

    return(
      <ScrollView>
        <View>
          <Text>hello</Text>
          <Text>Value of Pi from ExpoSwift:</Text>
          <Text>PI from swift: {}</Text>
          <Text>Type: {}</Text>
        </View>
      </ScrollView>
    )
  } catch (error) {
    console.error('ExpoSwift error:', error);
    return (
      <ScrollView>
        <View>
          <Text>Error loading Swift module: {String(error)}</Text>
        </View>
      </ScrollView>
    );
  }
}



