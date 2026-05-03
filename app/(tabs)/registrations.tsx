import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, EmptyState, LoadingState, Screen, SectionTitle } from '@/components/ui-kit';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { database, mapRowToEvent } from '@/database/init';
import { cancelRegistration } from '@/database/registrations';
import type { EventRecord } from '@/database/types';
import { formatDayRange } from '@/utils/date';

function loadRegisteredEvents(userId: string) {
  const rows = database.getAllSync<Record<string, unknown>>(
    `SELECT e.*
     FROM events e
     INNER JOIN registrations r ON r.eventId = e.id
     WHERE r.userId = ? AND r.status = 'confirmed'
     ORDER BY r.createdAt DESC;`,
    [userId]
  );

  return rows.map((row) => mapRowToEvent(row));
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
      <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
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
                <Pressable onPress={() => router.push(`/(tabs)/event/${event.id}`)}>
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
                <View style={styles.actions}>
                  <AppButton
                    title="Voir les détails"
                    variant="secondary"
                    onPress={() => router.push(`/(tabs)/event/${event.id}`)}
                    style={styles.actionButton}
                  />
                  <AppButton
                    title="Annuler l'inscription"
                    variant="danger"
                    onPress={() => {
                      if (!userId) return;
                      cancelRegistration(event.id, userId);
                      refresh();
                    }}
                    style={styles.actionButton}
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
  },
  card: {
    gap: 10,
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
    color: '#0a7ea4',
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
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});