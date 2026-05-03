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

  console.log('[EVENT/detail:render]', { ts: Date.now(), isAuthenticated, ready });

  const blocked = !isAuthenticated;
  if (blocked) return null;

  const handleFavoritePress = async () => {
    if (!userId || !event) {
      return;
    }

    try {
      setFavoriteBusy(true);
      await Haptics.selectionAsync();

      if (favorite) {
        removeFavorite(event.id, userId);
      } else {
        addFavorite(event.id, userId);
      }

      syncEvent();
    } catch (cause) {
      Alert.alert('Action impossible', cause instanceof Error ? cause.message : 'Erreur inconnue.');
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleRegistrationPress = async () => {
    if (!userId || !event) {
      return;
    }

    const eventIsPast = isPastDate(event.startDateTime);
    const eventIsFull = Boolean(event.capacity && event.registeredCount >= event.capacity);
    const canRegister = registered || (!eventIsPast && !eventIsFull);

    if (!canRegister) {
      return;
    }

    try {
      setRegistrationBusy(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (registered) {
        cancelRegistration(event.id, userId);
        await cancelEventReminder(event.id);
      } else {
        registerForEvent(event.id, userId);

        try {
          await scheduleEventReminder(event);
        } catch (notificationError) {
          console.warn('Impossible de planifier la notification locale :', notificationError);
        }
      }

      syncEvent();
    } catch (cause) {
      Alert.alert('Action impossible', cause instanceof Error ? cause.message : 'Erreur inconnue.');
    } finally {
      setRegistrationBusy(false);
    }
  };

  const handleSharePress = async () => {
    if (!event) {
      return;
    }

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
    return (
      <Screen>
        <LoadingState label="Chargement de l'événement..." />
      </Screen>
    );
  }

  if (error || !event) {
    return (
      <Screen>
        <View style={styles.errorState}>
          <EmptyState title="Détail indisponible" subtitle={error ?? 'Impossible d\'ouvrir cet événement.'} />
          <AppButton title="Retour" variant="secondary" onPress={() => router.back()} style={styles.footerButton} />
        </View>
      </Screen>
    );
  }

  const eventIsPast = isPastDate(event.startDateTime);
  const eventIsFull = Boolean(event.capacity && event.registeredCount >= event.capacity);
  const eventBlocked = !registered && (eventIsPast || eventIsFull);

  const heroContent = (
    <View style={styles.heroOverlay}>
      <Pill label={event.category} active />
      <Text style={styles.heroTitle}>{event.title}</Text>
      <Text style={styles.heroMeta}>{formatDayRange(event.startDateTime, event.endDateTime)}</Text>
      <Text style={styles.heroMeta}>{event.locationName}</Text>
    </View>
  );

  return (
    <Screen style={styles.screen}>
      <View style={styles.layout}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SectionTitle title="Détail événement" subtitle={event.organizerName} />

          <Card style={styles.heroCard}>
            {event.imageUrl ? (
              <ImageBackground source={{ uri: event.imageUrl }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
                {heroContent}
              </ImageBackground>
            ) : (
              <View style={styles.heroFallback}>{heroContent}</View>
            )}
          </Card>

          <Card>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Description</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Date et heure</Text>
              <Text style={styles.metaValue}>{formatDayRange(event.startDateTime, event.endDateTime)}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Lieu</Text>
              <Text style={styles.metaValue}>{event.locationName}</Text>
              {event.locationAddress ? <Text style={styles.metaValue}>{event.locationAddress}</Text> : null}
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Capacité</Text>
              <Text style={styles.metaValue}>
                {event.capacity ? `${event.registeredCount}/${event.capacity}` : `${event.registeredCount} inscrit(s)`}
              </Text>
            </View>
            <View style={styles.pillRow}>
              {event.tags.map((tag) => (
                <Pill key={tag} label={tag} active={false} />
              ))}
            </View>
            <HelperText tone={eventIsPast ? 'warning' : eventIsFull ? 'error' : 'success'}>
              {eventIsPast
                ? 'Cet événement est passé.'
                : eventIsFull
                  ? 'La capacité maximale est atteinte.'
                  : 'L’inscription est disponible.'}
            </HelperText>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton title="Partager 📤" variant="secondary" onPress={() => void handleSharePress()} disabled={shareBusy} style={styles.footerButton} />
          <AppButton
            title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            variant="secondary"
            onPress={() => void handleFavoritePress()}
            disabled={favoriteBusy}
            style={styles.footerButton}
          />
          <AppButton
            title={registered ? 'Annuler l’inscription' : 'S’inscrire'}
            variant={registered ? 'danger' : 'primary'}
            onPress={() => void handleRegistrationPress()}
            disabled={registrationBusy || eventBlocked}
            style={styles.footerButton}
          />
          <HelperText tone={eventBlocked && !registered ? 'warning' : 'neutral'}>
            {registered
              ? 'Votre place est confirmée, vous pouvez annuler à tout moment.'
              : eventBlocked
                ? 'Cette action est désactivée pour un événement passé ou complet.'
                : 'Appuyez pour agir, le retour haptique confirme la sélection.'}
          </HelperText>
          <AppButton title="Retour au catalogue" variant="secondary" onPress={() => router.back()} style={styles.footerButton} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  layout: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingBottom: 24,
  },
  heroCard: {
    padding: 0,
    overflow: 'hidden',
  },
  heroImage: {
    minHeight: 210,
    justifyContent: 'flex-end',
  },
  heroImageRadius: {
    borderRadius: 20,
  },
  heroFallback: {
    minHeight: 210,
    justifyContent: 'flex-end',
    backgroundColor: '#0f172a',
  },
  heroOverlay: {
    gap: 10,
    padding: 18,
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 30,
  },
  heroMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 18,
  },
  metaBlock: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5b6472',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 21,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    gap: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  footerButton: {
    alignSelf: 'stretch',
  },
  errorState: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
});