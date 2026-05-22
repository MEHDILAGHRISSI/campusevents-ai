import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function StudentLayout() {
  const colorScheme = useColorScheme();
  const { logout, role, userId, isAuthenticated, ready } = useAuth();

  const studentTabsKey = isAuthenticated
    ? 'student:' + (role ?? 'none') + ':' + (userId ?? 'unknown')
    : 'student:guest';

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  if (role === 'admin') {
    return <Redirect href="/admin" />;
  }

  return (
    <Tabs
      key={studentTabsKey}
      screenOptions={{
        sceneStyle: { backgroundColor: '#FFFFFF' },
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        headerRight: () => (
          <Pressable
            onPress={() => {
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
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="checkmark.circle.fill" color={color} />,
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
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.crop.circle" color={color} />,
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