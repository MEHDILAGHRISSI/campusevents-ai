import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Screen } from '@/components/ui-kit';
import { useAuth } from '@/context/auth-context';
import { listEvents } from '@/database/events';
import { resetDatabase } from '@/database/init';
import { resetWebState } from '@/database/web-store';
import { formatDayRange, isPastDate } from '@/utils/date';

export default function AdminDashboardScreen() {
  const { role, logout, ready } = useAuth();

  const stats = useMemo(() => {
    const events = listEvents();
    const upcoming = events.filter((event) => !isPastDate(event.startDateTime));
    const past = events.filter((event) => isPastDate(event.startDateTime));
    const full = events.filter((event) => Boolean(event.capacity && event.registeredCount >= event.capacity));
    return {
      eventsCount: events.length,
      upcomingCount: upcoming.length,
      pastCount: past.length,
      fullCount: full.length,
      registrationsCount: events.reduce((sum, event) => sum + event.registeredCount, 0),
      capacityCount: events.reduce((sum, event) => sum + (event.capacity ?? 0), 0),
      latestEvent: events.slice().sort((a, b) => b.startDateTime.localeCompare(a.startDateTime))[0] ?? null,
    };
  }, []);

  if (!ready) return null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Admin</Text>
          <Text style={styles.title}>Tableau de bord</Text>
          <Text style={styles.subtitle}>Vue d’ensemble des événements et accès direct aux outils d’administration.</Text>
        </View>

        <View style={styles.grid}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>ÉVÉNEMENTS</Text>
            <Text style={styles.metricValue}>{stats.eventsCount}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>À VENIR</Text>
            <Text style={styles.metricValue}>{stats.upcomingCount}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>PASSÉS</Text>
            <Text style={styles.metricValue}>{stats.pastCount}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>COMPLETS</Text>
            <Text style={styles.metricValue}>{stats.fullCount}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>INSCRIPTIONS</Text>
            <Text style={styles.metricValue}>{stats.registrationsCount}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>CAPACITÉ</Text>
            <Text style={styles.metricValue}>{stats.capacityCount}</Text>
          </Card>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.profileInner}>
            <View style={styles.avatar}>
              <MaterialIcons name="admin-panel-settings" size={26} color="#4B5563" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Compte</Text>
              <Text style={styles.profileDetails}>Administrateur connecté</Text>
              <Text style={styles.profileDetails}>Rôle: {role}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <AppButton title="Voir les événements" onPress={() => router.push('/admin/events' as never)} style={styles.actionButton} />
          <AppButton title="Créer un événement" onPress={() => router.push('/admin/event-form')} style={styles.actionButton} />
          <AppButton
            title="Réinitialiser les données"
            variant="secondary"
            onPress={() => {
              Alert.alert('Réinitialiser les données', 'Voulez-vous vraiment réinitialiser les données de test ?', [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Réinitialiser',
                  style: 'destructive',
                  onPress: () => {
                    try {
                      if (Platform.OS === 'web') {
                        resetWebState();
                      } else {
                        resetDatabase();
                      }
                      Alert.alert('Terminé', 'Les données ont été réinitialisées.');
                      router.replace('/admin');
                    } catch (err) {
                      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur inconnue');
                    }
                  },
                },
              ]);
            }}
            style={styles.actionButton}
          />
          <AppButton title="Se déconnecter" variant="danger" onPress={logout} style={styles.actionButton} />
        </Card>

        {stats.latestEvent ? (
          <Card style={styles.latestCard}>
            <Text style={styles.sectionTitle}>Dernier événement</Text>
            <Text style={styles.latestTitle}>{stats.latestEvent.title}</Text>
            <Text style={styles.latestMeta}>{formatDayRange(stats.latestEvent.startDateTime, stats.latestEvent.endDateTime)}</Text>
            <Text style={styles.latestMeta}>{stats.latestEvent.locationName}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 32, gap: 16, paddingHorizontal: 16 },
  hero: { gap: 8 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: '#4B5563' },
  title: { fontSize: 30, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#5b6472' },
  grid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: {
    flexGrow: 1,
    flexBasis: '30%',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: '#60A5FA' },
  metricValue: { fontSize: 28, fontWeight: '800', color: '#111827' },
  card: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  body: { fontSize: 14, color: '#5b6472' },
  profileCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: 520,
  },
  profileInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  profileDetails: { fontSize: 13, color: '#6B7280' },
  actionButton: { alignSelf: 'stretch' },
  latestCard: { gap: 6 },
  latestTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  latestMeta: { fontSize: 13, color: '#6B7280' },
});