// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { logout, role } = useAuth();

  // ✅ PAS de garde ici. Pas de <Redirect>. Pas de useEffect de navigation.
  // RootNavigator dans app/_layout.tsx garantit qu'on n'arrive ici
  // que si isAuthenticated === true && role === 'student'.

  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: '#000000' },
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        headerRight: () => (
          // ✅ On appelle simplement logout(). RootNavigator gère la redirection.
          <Pressable
            onPress={() => {
              console.log('[TABS/logout:btn_clicked]', { ts: Date.now(), role });
              logout();
            }}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutLabel}>Se déconnecter</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Catalogue',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoris',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="heart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="registrations"
        options={{
          title: 'Inscriptions',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="checkmark.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="sparkles" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.crop.circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen name="event/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#b42318',
    marginRight: 12,
  },
  logoutLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});