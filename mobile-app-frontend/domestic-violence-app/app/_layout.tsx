import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Manrope_400Regular: require('@/assets/fonts/Manrope-Regular.ttf'),
    Manrope_500Medium: require('@/assets/fonts/Manrope-Medium.ttf'),
    Manrope_600SemiBold: require('@/assets/fonts/Manrope-SemiBold.ttf'),
    Manrope_700Bold: require('@/assets/fonts/Manrope-Bold.ttf'),
    Manrope_800ExtraBold: require('@/assets/fonts/Manrope-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="appearance" options={{ title: "Appearance" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
