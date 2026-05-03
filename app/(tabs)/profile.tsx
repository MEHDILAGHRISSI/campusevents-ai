import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionTitle } from '@/components/ui-kit';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function ProfileScreen() {
  const { role, userId, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <ActivityIndicator style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!userId) return null;

  return (
    <Screen>
      <View style={styles.content}>
        <SectionTitle title="Profil" subtitle="Session locale et déconnexion." />

        <Card style={styles.card}>
          <Text style={styles.label}>Compte connecté</Text>
          <Text style={styles.value}>{userId}</Text>
          <Text style={styles.label}>Rôle</Text>
          <Text style={styles.value}>{role === 'admin' ? 'Admin' : 'Étudiant'}</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Contrainte locale</Text>
          <Text style={styles.value}>
            Les deux comptes partagent la même base SQLite sur l&apos;appareil, ce qui suffit pour la démonstration.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  card: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: '#0a7ea4' },
  value: { fontSize: 15, lineHeight: 22, color: '#111827' },
});