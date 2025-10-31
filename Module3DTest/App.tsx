import { MyModuleView } from 'my-module';
import MyModule from 'my-module';
import { StyleSheet, View, Button, Alert } from 'react-native';

export default function App() {
  const testSwiftFunction = () => {
    try {
      // Check if module exists before calling
      if (MyModule && typeof MyModule.hello === 'function') {
        const result = MyModule.hello();
        console.log('Result from Swift:', result);
        Alert.alert('Swift Says:', result);
      } else {
        throw new Error('MyModule.hello is not available');
      }
    } catch (error) {
      console.error('Error calling Swift:', error);
      Alert.alert('Error', `Could not call Swift function: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Test Swift Function" onPress={testSwiftFunction} />
      <MyModuleView 
        url="https://example.com/model.obj" 
        onLoad={(event) => console.log('Model loaded:', event.nativeEvent.url)}
        style={styles.box} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 300,
    height: 300,
  },
});