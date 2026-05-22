import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, EmptyState, LoadingState, Screen, SectionTitle } from '@/components/ui-kit';
import { useAuth } from '@/context/auth-context';
import { getEventById } from '@/database/events';
import { cancelRegistration, listRegistrationsByUser } from '@/database/registrations';
import type { EventRecord } from '@/database/types';
import { formatDayRange } from '@/utils/date';

function loadRegisteredEvents(userId: string) {
  const ids = listRegistrationsByUser(userId).map((r) => r.eventId);
  return ids.map((id) => getEventById(id)).filter(Boolean) as import('@/database/types').EventRecord[];
}

export default function RegistrationsScreen() {
  const { userId, ready } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback((mode: 'screen' | 'pull' = 'screen') => {
    if (!userId) {
      setEvents([]);
      setError(null);
      setRefreshing(false);
      setLoading(false);
      return;
    }

    try {
      if (mode === 'pull') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setEvents(loadRegisteredEvents(userId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les inscriptions.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const emptyMessage = useMemo(() => 'Vos événements inscrits apparaîtront ici après validation.', []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!userId) return null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh('pull')} />}>
        <SectionTitle title="Mes inscriptions" subtitle={`${events.length} événement${events.length > 1 ? 's' : ''}`} />

        {loading ? <LoadingState label="Chargement des inscriptions..." /> : null}
        {!loading && error ? <EmptyState title="Erreur" subtitle={error} /> : null}
        {!loading && !error && events.length === 0 ? <EmptyState title="Aucune inscription" subtitle={emptyMessage} /> : null}

        {!loading && !error
          ? events.map((event) => (
              <View key={event.id} style={styles.item}>
                <Pressable onPress={() => router.push(`/student/event/${event.id}`)}>
                  <Card style={styles.card}>
                    <View style={styles.header}>
                      <Text style={styles.title} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <Text style={styles.category}>{event.category}</Text>
                    </View>
                    <Text style={styles.meta}>{formatDayRange(event.startDateTime, event.endDateTime)}</Text>
                    <Text style={styles.meta}>{event.locationName}</Text>
                    <Text style={styles.description} numberOfLines={2}>
                      {event.description}
                    </Text>
                  </Card>
                </Pressable>

                <View style={styles.badgeContainer} pointerEvents="none">
                  <View style={styles.badge}><MaterialIcons name="check" size={14} color="#ffffff" /></View>
                </View>

                <View style={styles.actions}>
                  <AppButton
                    title="Voir les détails"
                    variant="secondary"
                    onPress={() => router.push(`/student/event/${event.id}`)}
                    style={[styles.actionButton, styles.ghostButton]}
                  />
                  <AppButton
                    title="Annuler l'inscription"
                    onPress={() => {
                      if (!userId) return;
                      cancelRegistration(event.id, userId);
                      refresh();
                    }}
                    style={[styles.actionButton, { backgroundColor: '#DC2626' }]}
                  />
                </View>
              </View>
            ))
          : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 24,
  },
  item: {
    gap: 10,
    position: 'relative',
  },
  card: {
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  meta: {
    fontSize: 13,
    color: '#5b6472',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  ghostButton: {
    backgroundColor: '#F3F4F6',
  },
  badgeContainer: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});