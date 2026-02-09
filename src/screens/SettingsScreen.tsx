import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

 function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Setări</Text>
      <Text style={styles.smallText}>Settings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111', 
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  smallText: {
    fontSize: 16,
    color: 'grey',
  },
});
export default SettingsScreen;