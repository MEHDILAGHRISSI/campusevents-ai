import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { initDatabase } from '../database/init';

export const unstable_settings = { anchor: 'index' };

let databaseInitError: unknown = null;

try {
  initDatabase();
} catch (error) {
  databaseInitError = error;
  console.error("Erreur lors de l'initialisation de la DB :", error);
}

export default function RootLayout() {
  if (databaseInitError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialisation SQLite impossible</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, role, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // On récupère l'état du routeur pour savoir s'il est prêt
  const rootNavState = useRootNavigationState();

  useEffect(() => {
    console.log('[ROOT/nav:effect_triggered]', { ready, navKey: rootNavState?.key, seg0: segments[0], isAuthenticated, role });

    // On bloque si l'Auth n'est pas prête ou si le routeur n'a pas sa clé
    if (!ready || !rootNavState?.key) return;

    const seg0 = segments[0];
    const inTabsGroup = seg0 === '(tabs)';
    const inAdminGroup = seg0 === 'admin';
    const inProtectedArea = inTabsGroup || inAdminGroup;

    const performNavigation = () => {
      if (!isAuthenticated) {
        if (inProtectedArea) {
          router.replace('/');
        }
      } else {
        if (!inProtectedArea) {
          router.replace(role === 'admin' ? '/admin' : '/(tabs)');
        } else if (role === 'student' && inAdminGroup) {
          router.replace('/(tabs)');
        } else if (role === 'admin' && inTabsGroup) {
          router.replace('/admin');
        }
      }
    };

    if (segments.length <= 1 && segments[0] === undefined) {
      const timer = setTimeout(performNavigation, 10);
      return () => clearTimeout(timer);
    }

    performNavigation();
  }, [isAuthenticated, role, ready, segments, rootNavState?.key]);

  // ✅ On affiche TOUJOURS le Stack.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 24, 
    backgroundColor: '#ffffff'
  },
  errorTitle: {
    fontSize: 20, 
    fontWeight: '700', 
    color: '#111827', 
    textAlign: 'center'
  },
});