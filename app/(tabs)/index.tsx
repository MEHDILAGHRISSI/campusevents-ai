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
  
  // ✅ FIX: On récupère ready et userId
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

  const openEventDetails = useCallback((id: string) => { router.push(`/(tabs)/event/${id}`); }, [router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f59e0b" />
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
                  <Text style={styles.eventMeta}>{formatDayRange(event.startDateTime, event.endDateTime)}</Text>
                  <Text style={styles.eventMeta}>{event.locationName}</Text>
                  <Text style={styles.eventDescription} numberOfLines={3}>{event.description}</Text>
                  <View style={styles.tagRow}>
                    {event.tags.slice(0, 3).map((tag) => (
                      <View key={tag} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  <AppButton title="Voir les détails" variant="secondary" onPress={() => openEventDetails(event.id)} style={styles.detailsButton} />
                </Card>
              </View>
            ))
          : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000000' },
  content: { paddingBottom: 28, gap: 14 },
  debugBanner: { borderRadius: 24, backgroundColor: '#050505', borderWidth: 1, borderColor: '#2f2f2f', padding: 18, gap: 4 },
  debugBannerLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, color: '#7dd3fc', textTransform: 'uppercase' },
  debugBannerTitle: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: '#ffffff' },
  debugBannerSubtitle: { fontSize: 13, color: '#d1d5db' },
  filterCard: { backgroundColor: '#0b0b0b', borderColor: '#2d2d2d' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eventCard: { gap: 10, backgroundColor: '#111111', borderColor: '#2b2b2b' },
  detailsButton: { alignSelf: 'stretch', backgroundColor: '#f59e0b' },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  eventTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#ffffff' },
  eventCategory: { fontSize: 12, fontWeight: '700', color: '#7dd3fc', textTransform: 'uppercase' },
  eventMeta: { fontSize: 13, color: '#cbd5e1' },
  eventDescription: { fontSize: 14, lineHeight: 20, color: '#f3f4f6' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#1f2937' },
  tagText: { fontSize: 12, fontWeight: '600', color: '#7dd3fc' },
});