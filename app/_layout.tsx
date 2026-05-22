// app/_layout.tsx
import { AuthProvider, useAuth } from '@/context/auth-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { initDatabase } from '../database/init';

export const unstable_settings = { anchor: 'index' };

// Initialisation de la base de données
let databaseInitError: unknown = null;
try {
  initDatabase();
  console.log('✅ Base de données initialisée');
} catch (error) {
  databaseInitError = error;
  console.error("❌ Erreur lors de l'initialisation de la DB:", error);
}

// Composant interne qui a accès au contexte d'authentification
function RootLayoutContent() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* La clé change selon l'authentification pour forcer le remontage de l'écran index */}
      <Stack.Screen name="index" key={isAuthenticated ? 'auth' : 'anon'} />
      <Stack.Screen name="student" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}

export default function RootLayout() {
  console.log('[RootLayout] render, databaseInitError:', databaseInitError);

  if (databaseInitError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialisation SQLite impossible</Text>
        <Text style={styles.errorMessage}>
          {databaseInitError instanceof Error ? databaseInitError.message : 'Erreur inconnue'}
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <RootLayoutContent />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#5b6472',
    textAlign: 'center',
  },
});