import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, EmptyState, HelperText, LoadingState, Pill, Screen, SectionTitle } from '@/components/ui-kit';
import { useAuth } from '@/context/auth-context';
import { getEventById } from '@/database/events';
import { addFavorite, isFavorite, removeFavorite } from '@/database/favorites';
import { cancelRegistration, isRegistered, registerForEvent } from '@/database/registrations';
import type { EventRecord } from '@/database/types';
import { formatDayRange, isPastDate } from '@/utils/date';
import { shareEventInvite } from '@/utils/native-share';
import { cancelEventReminder, scheduleEventReminder } from '@/utils/notifications';

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { userId, isAuthenticated, ready } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);

  const syncEvent = useCallback(() => {
    if (!eventId) {
      setEvent(null);
      setError('Événement introuvable.');
      return;
    }

    try {
      const row = getEventById(eventId);
      if (!row) {
        setEvent(null);
        setError('Événement introuvable.');
        return;
      }

      setEvent(row);
      setFavorite(Boolean(userId && isFavorite(eventId, userId)));
      setRegistered(Boolean(userId && isRegistered(eventId, userId)));
      setError(null);
    } catch (cause) {
      setEvent(null);
      setError(cause instanceof Error ? cause.message : 'Impossible de charger l\'événement.');
    }
  }, [eventId, userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      syncEvent();
      setLoading(false);
    }, [syncEvent])
  );

  if (!ready) {
    return (
      <Screen>
        <LoadingState label="Chargement de l'événement..." />
      </Screen>
    );
  }

  if (!isAuthenticated) return <Screen><EmptyState title="Accès restreint" subtitle="Veuillez vous connecter." /><AppButton title="Retour" variant="secondary" onPress={() => router.replace('/')} /></Screen>;

  const handleFavoritePress = async () => {
    if (!userId || !event) return;
    try {
      setFavoriteBusy(true);
      await Haptics.selectionAsync();
      if (favorite) removeFavorite(event.id, userId); else addFavorite(event.id, userId);
      syncEvent();
    } catch (cause) {
      Alert.alert('Action impossible', cause instanceof Error ? cause.message : 'Erreur inconnue.');
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleRegistrationPress = async () => {
    if (!userId || !event) return;
    const eventIsPast = isPastDate(event.startDateTime);
    const eventIsFull = Boolean(event.capacity && event.registeredCount >= event.capacity);
    const canRegister = registered || (!eventIsPast && !eventIsFull);
    if (!canRegister) return;
    try {
      setRegistrationBusy(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (registered) {
        cancelRegistration(event.id, userId);
        await cancelEventReminder(event.id);
      } else {
        registerForEvent(event.id, userId);
        try { await scheduleEventReminder(event); } catch (notificationError) { console.warn('Impossible de planifier la notification locale :', notificationError); }
      }
      syncEvent();
    } catch (cause) {
      Alert.alert('Action impossible', cause instanceof Error ? cause.message : 'Erreur inconnue.');
    } finally {
      setRegistrationBusy(false);
    }
  };

  const handleSharePress = async () => {
    if (!event) return;
    try {
      setShareBusy(true);
      await Haptics.selectionAsync();
      await shareEventInvite(event);
    } catch (cause) {
      Alert.alert('Partage impossible', cause instanceof Error ? cause.message : 'Erreur inconnue.');
    } finally {
      setShareBusy(false);
    }
  };

  if (loading) {
    return <Screen><LoadingState label="Chargement de l'événement..." /></Screen>;
  }

  if (error || !event) {
    return <Screen><View style={styles.errorState}><EmptyState title="Détail indisponible" subtitle={error ?? 'Impossible d\'ouvrir cet événement.'} /><AppButton title="Retour" variant="secondary" onPress={() => router.back()} style={styles.footerButton} /></View></Screen>;
  }

  const eventIsPast = isPastDate(event.startDateTime);
  const eventIsFull = Boolean(event.capacity && event.registeredCount >= event.capacity);
  const eventBlocked = !registered && (eventIsPast || eventIsFull);

  

  return (
    <Screen style={styles.screen}>
      <View style={styles.layout}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SectionTitle title="Détail événement" subtitle={event.organizerName} />
          <Card style={styles.mainCard}>
            <View style={styles.mainCardInner}>
              {event.imageUrl ? (
                <ImageBackground source={{ uri: event.imageUrl }} style={styles.mainImage} imageStyle={styles.mainImageRadius}>
                  <View style={styles.imageOverlay} />
                </ImageBackground>
              ) : (
                <View style={styles.mainImageFallback} />
              )}

              <View style={styles.mainContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.mainTitle} numberOfLines={2}>{event.title}</Text>
                  <View style={styles.capacityBadge}><Text style={styles.capacityText}>{event.capacity ? `${event.registeredCount}/${event.capacity}` : `${event.registeredCount}`}</Text></View>
                </View>

                <View style={styles.dateRow}>
                  <MaterialIcons name="calendar-today" size={18} color="#6B7280" />
                  <Text style={styles.mainDate}>{formatDayRange(event.startDateTime, event.endDateTime)}</Text>
                </View>

                <Text style={styles.mainLocation}>{event.locationName}</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.descriptionCard}>
            <View style={styles.metaBlock}><Text style={styles.metaLabel}>Description</Text><Text style={styles.description}>{event.description}</Text></View>
            <View style={styles.pillRow}>{event.tags.map((tag) => <Pill key={tag} label={tag} active={false} />)}</View>
            <HelperText tone={eventIsPast ? 'warning' : eventIsFull ? 'error' : 'success'}>{eventIsPast ? 'Cet événement est passé.' : eventIsFull ? 'La capacité maximale est atteinte.' : 'L’inscription est disponible.'}</HelperText>
          </Card>
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <AppButton title="Partager" variant="secondary" onPress={() => void handleSharePress()} disabled={shareBusy} style={[styles.footerSmallButton, { backgroundColor: '#F3F4F6' }]} />
            <AppButton title={favorite ? 'Retirer des favoris' : 'Favoris'} variant="secondary" onPress={() => void handleFavoritePress()} disabled={favoriteBusy} style={[styles.footerSmallButton, { backgroundColor: '#F3F4F6' }]} />
            <AppButton title={registered ? 'Annuler l’inscription' : 'S’inscrire'} variant={registered ? 'danger' : 'primary'} onPress={() => void handleRegistrationPress()} disabled={registrationBusy || eventBlocked} style={[styles.footerSmallButton, registered ? { backgroundColor: '#DC2626' } : { backgroundColor: '#4B5563' }]} />
          </View>

          <HelperText tone={eventBlocked && !registered ? 'warning' : 'neutral'}>{registered ? 'Votre place est confirmée, vous pouvez annuler à tout moment.' : eventBlocked ? 'Cette action est désactivée pour un événement passé ou complet.' : 'Appuyez pour agir, le retour haptique confirme la sélection.'}</HelperText>

          <AppButton title="Retour au catalogue" onPress={() => router.back()} style={styles.returnButton} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  layout: { flex: 1 },
  content: { gap: 16, paddingBottom: 24, paddingHorizontal: 16 },
  errorState: { gap: 16, flex: 1, justifyContent: 'center' },
  footerButton: { width: '100%' },
  /* Main card */
  mainCard: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  mainCardInner: { position: 'relative' },
  mainImage: { height: 220, width: '100%' },
  mainImageRadius: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  mainImageFallback: { height: 220, backgroundColor: '#F3F4F6' },
  imageOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 },
  mainContent: { padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  mainTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#111827' },
  capacityBadge: { position: 'absolute', right: 12, top: 12, minWidth: 46, height: 46, borderRadius: 23, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  capacityText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  mainDate: { fontSize: 16, fontWeight: '700', color: '#111827' },
  mainLocation: { fontSize: 14, color: '#6B7280', marginTop: 6 },

  /* Description card */
  descriptionCard: { marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 12 },

  metaBlock: { gap: 4, marginBottom: 14 },
  metaLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: '#4B5563' },
  metaValue: { fontSize: 14, lineHeight: 22, color: '#111827' },
  description: { fontSize: 15, lineHeight: 22, color: '#111827' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  /* Footer */
  footer: { gap: 10, paddingBottom: 24 },
  footerRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  footerSmallButton: { flex: 1, minHeight: 44, borderRadius: 10 },
  returnButton: { alignSelf: 'center', backgroundColor: '#4B5563', borderRadius: 12, minHeight: 44, paddingHorizontal: 22, marginTop: 8 },
});