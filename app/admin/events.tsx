import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Screen, SectionTitle } from '@/components/ui-kit';
import { listEvents } from '@/database/events';
import type { EventRecord } from '@/database/types';
import { formatDayRange, isPastDate } from '@/utils/date';

function sortEvents(events: EventRecord[]) {
  return events.slice().sort((a, b) => b.startDateTime.localeCompare(a.startDateTime));
}

export default function AdminEventsScreen() {
  const events = useMemo(() => sortEvents(listEvents()), []);

  const stats = useMemo(() => {
    const upcoming = events.filter((event) => !isPastDate(event.startDateTime));
    const past = events.filter((event) => isPastDate(event.startDateTime));
    const full = events.filter((event) => Boolean(event.capacity && event.registeredCount >= event.capacity));

    return {
      total: events.length,
      upcoming: upcoming.length,
      past: past.length,
      full: full.length,
      registrations: events.reduce((sum, event) => sum + event.registeredCount, 0),
    };
  }, [events]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Événements" subtitle="Vue complète du catalogue et indicateurs globaux." />

        <View style={styles.grid}>
          <Card style={styles.metricCard}><Text style={styles.metricLabel}>TOTAL</Text><Text style={styles.metricValue}>{stats.total}</Text></Card>
          <Card style={styles.metricCard}><Text style={styles.metricLabel}>À VENIR</Text><Text style={styles.metricValue}>{stats.upcoming}</Text></Card>
          <Card style={styles.metricCard}><Text style={styles.metricLabel}>PASSÉS</Text><Text style={styles.metricValue}>{stats.past}</Text></Card>
          <Card style={styles.metricCard}><Text style={styles.metricLabel}>PLEINS</Text><Text style={styles.metricValue}>{stats.full}</Text></Card>
          <Card style={styles.metricCard}><Text style={styles.metricLabel}>INSCR.</Text><Text style={styles.metricValue}>{stats.registrations}</Text></Card>
        </View>

        <AppButton title="Créer un événement" onPress={() => router.push('/admin/event-form')} style={styles.primaryAction} />

        {events.map((event) => {
          const eventIsFull = Boolean(event.capacity && event.registeredCount >= event.capacity);
          return (
            <Card key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventCategory}>{event.category}</Text>
                </View>
                <View style={[styles.badge, eventIsFull ? styles.badgeFull : styles.badgeOpen]}>
                  <MaterialIcons name={eventIsFull ? 'warning' : 'event'} size={16} color="#ffffff" />
                </View>
              </View>

              <View style={styles.metaRow}>
                <MaterialIcons name="calendar-today" size={16} color="#6B7280" />
                <Text style={styles.eventMeta}>{formatDayRange(event.startDateTime, event.endDateTime)}</Text>
              </View>
              <Text style={styles.eventMeta}>{event.locationName}</Text>

              <View style={styles.statsRow}>
                <Text style={styles.statText}>Inscrits {event.registeredCount}</Text>
                <Text style={styles.statText}>{event.capacity ? `Capacité ${event.capacity}` : 'Capacité illimitée'}</Text>
              </View>

              <View style={styles.actionRow}>
                <AppButton title="Modifier" onPress={() => router.push(`/admin/event-form?eventId=${event.id}`)} style={styles.actionButton} />
                <AppButton title="Voir" variant="secondary" onPress={() => router.push(`/student/event/${event.id}`)} style={styles.actionButton} />
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flexGrow: 1, flexBasis: '30%', alignItems: 'center', gap: 4, padding: 12 },
  metricLabel: { fontSize: 12, fontWeight: '700', color: '#60A5FA', textTransform: 'uppercase' },
  metricValue: { fontSize: 26, fontWeight: '800', color: '#111827' },
  primaryAction: { alignSelf: 'stretch' },
  eventCard: { gap: 10, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  eventHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  eventTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  eventCategory: { fontSize: 12, fontWeight: '700', color: '#4B5563', textTransform: 'uppercase' },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  badgeOpen: { backgroundColor: '#4B5563' },
  badgeFull: { backgroundColor: '#DC2626' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventMeta: { fontSize: 13, color: '#6B7280' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, alignSelf: 'stretch' },
});