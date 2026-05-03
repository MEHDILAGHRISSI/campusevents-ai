// app/admin/_layout.tsx
import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAuth } from '@/context/auth-context';

export default function AdminLayout() {
  const { logout } = useAuth();

  // ✅ Pas de useEffect de garde. Pas de router.replace dans handleLogout.
  // RootNavigator gère tout.

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: 'Administration',
        headerRight: () => (
          <Pressable onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutLabel}>Se déconnecter</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="event-form" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#b42318',
  },
  logoutLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});