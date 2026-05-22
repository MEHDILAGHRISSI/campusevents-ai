// app/admin/_layout.tsx
import { useAuth } from '@/context/auth-context';
import { Redirect, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function AdminLayout() {
  const { logout, role, isAuthenticated, ready } = useAuth(); // ⭐ AJOUTÉ: isAuthenticated, ready

  // ⭐ AJOUTÉ: Attendre que l'auth soit prête
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  // ⭐ AJOUTÉ: Protection - Rediriger si pas authentifié
  if (!isAuthenticated) {
    console.log('🔒 Admin: Non authentifié, redirection vers login');
    return <Redirect href="/" />;
  }

  // ⭐ AJOUTÉ: Protection - Rediriger étudiant vers /student
  if (role !== 'admin') {
    console.log('🔒 Admin: Étudiant détecté, redirection vers /student');
    return <Redirect href="/student" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: 'Administration',
        headerRight: () => (
          <Pressable 
            onPress={() => {
              console.log('[ADMIN/logout] Déconnexion demandée');
              logout();
            }} 
            style={styles.logoutButton}
          >
            <Text style={styles.logoutLabel}>Se déconnecter</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="events" />
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