import { MyModuleView } from 'my-module';
import * as MyModule from 'my-module';
import { StyleSheet, View, Button, Alert } from 'react-native';

export default function App() {
  const testSwiftFunction = () => {
    try {
      const result = MyModule.hello();
      console.log('Result from Swift:', result);
      Alert.alert('Swift Says:', result);
    } catch (error) {
      console.error('Error calling Swift:', error);
      Alert.alert('Error', 'Could not call Swift function');
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Test Swift Function" onPress={testSwiftFunction} />
      <MyModuleView style={styles.box} />
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