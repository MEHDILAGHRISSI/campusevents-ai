import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, AppInput, Card, EmptyState, HelperText, LoadingState, Pill, Screen, SectionTitle } from '@/components/ui-kit';
import { useAuth } from '@/context/auth-context';
import { listEvents } from '@/database/events';
import { categories, type EventCategory, type EventRecord } from '@/database/types';
import { formatDayRange } from '@/utils/date';

const periodFilters = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'past', label: 'Passés' },
  { key: 'all', label: 'Tous' },
] as const;

type PeriodFilter = (typeof periodFilters)[number]['key'];

function loadFilteredEvents(
  searchText: string,
  selectedCategory: 'Tous' | EventCategory,
  selectedPeriod: PeriodFilter,
): EventRecord[] {
  const normalizedSearch = searchText.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  let results = listEvents();

  if (selectedCategory !== 'Tous') {
    results = results.filter((e) => e.category === selectedCategory);
  }

  if (selectedPeriod === 'upcoming') {
    results = results.filter((e) => e.startDateTime >= nowIso);
  } else if (selectedPeriod === 'past') {
    results = results
      .filter((e) => e.startDateTime < nowIso)
      .sort((a, b) => b.startDateTime.localeCompare(a.startDateTime));
  }

  if (normalizedSearch.length > 0) {
    results = results.filter(
      (e) =>
        e.title.toLowerCase().includes(normalizedSearch) ||
        e.description.toLowerCase().includes(normalizedSearch) ||
        e.locationName.toLowerCase().includes(normalizedSearch) ||
        e.organizerName.toLowerCase().includes(normalizedSearch) ||
        e.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch)),
    );
  }

  return results;
}

export default function StudentEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Tous' | EventCategory>('Tous');
  const [period, setPeriod] = useState<PeriodFilter>('upcoming');
  const { ready, userId } = useAuth();

  const refresh = useCallback(
    (mode: 'screen' | 'pull' = 'screen') => {
      try {
        if (mode === 'pull') setRefreshing(true);
        else setLoading(true);
        setEvents(loadFilteredEvents(query, category, period));
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Impossible de charger le catalogue.');
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [category, period, query],
  );

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filteredCountLabel = `${events.length} événement${events.length > 1 ? 's' : ''}`;

  const setCategoryWithHaptics = useCallback(async (next: 'Tous' | EventCategory) => {
    await Haptics.selectionAsync();
    setCategory(next);
  }, []);

  const setPeriodWithHaptics = useCallback(async (next: PeriodFilter) => {
    await Haptics.selectionAsync();
    setPeriod(next);
  }, []);

  const openEventDetails = useCallback((id: string) => { router.push(`/student/event/${id}`); }, [router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4B5563" />
      </View>
    );
  }

  if (!userId) return null;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh('pull')} />}
      >
        <View style={styles.debugBanner}>
          <Text style={styles.debugBannerLabel}>ETUDIANT</Text>
          <Text style={styles.debugBannerTitle}>Catalogue interactif actif</Text>
          <Text style={styles.debugBannerSubtitle}>{filteredCountLabel}</Text>
        </View>

        <SectionTitle title="Catalogue" subtitle="Filtrez et explorez les événements du campus." />

        <Card style={styles.filterCard}>
          <AppInput value={query} onChangeText={setQuery} placeholder="Rechercher un événement" />
          <HelperText>La liste se met à jour instantanément selon vos filtres.</HelperText>
          <View style={styles.pillRow}>
            {(['Tous', ...categories] as const).map((value) => (
              <Pill key={value} label={value} active={category === value} onPress={() => void setCategoryWithHaptics(value)} />
            ))}
          </View>
          <View style={styles.pillRow}>
            {periodFilters.map((f) => (
              <Pill key={f.key} label={f.label} active={period === f.key} onPress={() => void setPeriodWithHaptics(f.key)} />
            ))}
          </View>
          <AppButton
            title="Réinitialiser"
            variant="secondary"
            onPress={() => { setQuery(''); setCategory('Tous'); setPeriod('upcoming'); }}
          />
        </Card>

        {loading ? <LoadingState label="Chargement du catalogue..." /> : null}
        {!loading && error ? <EmptyState title="Erreur" subtitle={error} /> : null}
        {!loading && !error && events.length === 0 ? (
          <EmptyState title="Aucun événement" subtitle="Aucun résultat ne correspond à vos filtres actuels." />
        ) : null}

        {!loading && !error
          ? events.map((event) => (
              <View key={event.id}>
                <Card style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                    <Text style={styles.eventCategory}>{event.category}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name="calendar-today" size={16} color="#6B7280" />
                    <Text style={styles.eventMeta}>{formatDayRange(event.startDateTime, event.endDateTime)}</Text>
                  </View>
                  <Text style={styles.eventMeta}>{event.locationName}</Text>
                  <Text style={styles.eventDescription} numberOfLines={3}>{event.description}</Text>
                  <View style={styles.tagRow}>
                    {event.tags.slice(0, 3).map((tag) => (
                      <View key={tag} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  <AppButton title="Voir les détails" onPress={() => openEventDetails(event.id)} style={styles.detailsButton} />
                </Card>
              </View>
            ))
          : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 28, gap: 14, paddingHorizontal: 16 },
  debugBanner: { borderRadius: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', padding: 14, gap: 4 },
  debugBannerLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#4B5563', textTransform: 'uppercase' },
  debugBannerTitle: { fontSize: 20, lineHeight: 24, fontWeight: '800', color: '#111827' },
  debugBannerSubtitle: { fontSize: 13, color: '#6B7280' },
  filterCard: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eventCard: { gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  detailsButton: { alignSelf: 'center', backgroundColor: '#4B5563', paddingHorizontal: 18, borderRadius: 10, minHeight: 40 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  eventTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  eventCategory: { fontSize: 12, fontWeight: '700', color: '#4B5563', textTransform: 'uppercase' },
  eventMeta: { fontSize: 13, color: '#6B7280' },
  eventDescription: { fontSize: 14, lineHeight: 20, color: '#374151' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F3F4F6' },
  tagText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
});