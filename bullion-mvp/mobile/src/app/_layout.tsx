import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack 
        screenOptions={{
          headerStyle: { backgroundColor: '#1a237e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="buy" options={{ title: 'Buy Bullion' }} />
        <Stack.Screen name="sell" options={{ title: 'Sell Bullion' }} />
        <Stack.Screen name="orders" options={{ title: 'My Orders' }} />
      </Stack>
    </SafeAreaProvider>
  );
}