import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, AppInput, Card, HelperText, Pill, Screen, SectionTitle } from '@/components/ui-kit';
import { createEvent, getEventById, updateEvent } from '@/database/events';
import { categories, type EventCategory, type EventRecord } from '@/database/types';
import { validateEventForm } from '@/utils/validation';

function normalizeDateInput(value: string) {
  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function eventToForm(event: EventRecord) {
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    startDateTime: event.startDateTime.slice(0, 16).replace('T', ' '),
    endDateTime: event.endDateTime ? event.endDateTime.slice(0, 16).replace('T', ' ') : '',
    locationName: event.locationName,
    locationAddress: event.locationAddress ?? '',
    organizerName: event.organizerName,
    capacity: event.capacity ? String(event.capacity) : '',
    imageUrl: event.imageUrl ?? '',
    tags: event.tags.join(', '),
  };
}

export default function EventFormScreen() {
  const params = useLocalSearchParams<{ eventId?: string | string[] }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const [loading, setLoading] = useState(Boolean(eventId));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('Workshop');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ endDateTime?: string; capacity?: string }>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const existing = getEventById(eventId);
    if (!existing) {
      setError('Événement introuvable.');
      setLoading(false);
      return;
    }

    const form = eventToForm(existing);
    setTitle(form.title);
    setDescription(form.description);
    setCategory(form.category);
    setStartDateTime(form.startDateTime);
    setEndDateTime(form.endDateTime);
    setLocationName(form.locationName);
    setLocationAddress(form.locationAddress);
    setOrganizerName(form.organizerName);
    setCapacity(form.capacity);
    setImageUrl(form.imageUrl);
    setTags(form.tags);
    setLoading(false);
  }, [eventId]);

  function validate() {
    // ✅ FIXED: Using centralized validation utilities
    const parsedCapacityForValidation = capacity.trim() ? Number(capacity.trim()) : undefined;
    const result = validateEventForm({
      title: title.trim(),
      description: description.trim(),
      startDateTime,
      endDateTime,
      locationName: locationName.trim(),
      capacity: parsedCapacityForValidation,
      imageUrl: imageUrl.trim() || undefined,
    });

    const nextFieldErrors = {
      endDateTime: result.errors.find((e) => e.field === 'endDateTime')?.message,
      capacity: result.errors.find((e) => e.field === 'capacity')?.message,
    };
    setFieldErrors(nextFieldErrors);

    if (!result.isValid) {
      const messages = result.errors.map((e) => e.message).join('\n');
      setError(messages || 'Veuillez corriger les erreurs ci-dessous.');
      return false;
    }

    setError(null);
    setFieldErrors({});
    return true;
  }

  function submit() {
    if (!validate()) {
      return;
    }

    const normalizedStart = normalizeDateInput(startDateTime);
    const normalizedEnd = normalizeDateInput(endDateTime);

    if (!normalizedStart) {
      setError('La date de début est invalide.');
      return;
    }

    const parsedCapacity = capacity.trim() ? parseInt(capacity.trim(), 10) : undefined;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      startDateTime: normalizedStart.toISOString(),
      endDateTime: normalizedEnd ? normalizedEnd.toISOString() : undefined,
      locationName: locationName.trim(),
      locationAddress: locationAddress.trim() || undefined,
      organizerName: organizerName.trim() || undefined,
      capacity: parsedCapacity,
      imageUrl: imageUrl.trim() || undefined,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      if (eventId) {
        updateEvent(eventId, payload);
      } else {
        createEvent(payload);
      }
      setSuccess(true);
      setError(null);
      // Auto-redirect after 1 second
      setTimeout(() => {
        router.replace('/admin');
      }, 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d\'enregistrer l\'événement.');
    }
  }

  if (loading) {
    return (
      <Screen>
        <SectionTitle title={eventId ? 'Modifier un événement' : 'Créer un événement'} subtitle="Chargement du formulaire..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title={eventId ? 'Modifier un événement' : 'Créer un événement'} subtitle="Les champs obligatoires doivent être remplis." />

        {success ? <HelperText tone="success">✅ Événement sauvegardé avec succès ! Redirection...</HelperText> : null}
        {error ? <HelperText tone="error">{error}</HelperText> : null}

        <Card style={styles.card}>
          <AppInput value={title} onChangeText={setTitle} placeholder="Titre *" />
          <AppInput value={description} onChangeText={setDescription} placeholder="Description *" multiline style={styles.multiline} />
          {Platform.OS === 'web' ? (
            <View>
              <Text style={{ marginBottom: 6, color: '#9ca3af', fontSize: 12 }}>Début *</Text>
              <input
                type="datetime-local"
                value={startDateTime ? (startDateTime.includes('T') ? startDateTime : startDateTime.replace(' ', 'T')) : ''}
                onChange={(e: any) => setStartDateTime(e.target.value ? e.target.value.replace('T', ' ') : '')}
                style={{ width: '100%', padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', color: '#111827', marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
              />
            </View>
          ) : (
            <AppInput value={startDateTime} onChangeText={setStartDateTime} placeholder="Début * (2026-05-30 14:00)" />
          )}

          {Platform.OS === 'web' ? (
            <View>
              <Text style={{ marginBottom: 6, color: '#9ca3af', fontSize: 12 }}>Fin (optionnelle)</Text>
              <input
                type="datetime-local"
                value={endDateTime ? (endDateTime.includes('T') ? endDateTime : endDateTime.replace(' ', 'T')) : ''}
                onChange={(e: any) => setEndDateTime(e.target.value ? e.target.value.replace('T', ' ') : '')}
                style={{ width: '100%', padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', color: '#111827', marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
              />
            </View>
          ) : (
            <AppInput value={endDateTime} onChangeText={setEndDateTime} placeholder="Fin optionnelle (2026-05-30 16:00)" />
          )}
          {fieldErrors.endDateTime ? <HelperText tone="error">{fieldErrors.endDateTime}</HelperText> : null}
          <AppInput value={locationName} onChangeText={setLocationName} placeholder="Lieu *" />
          <AppInput value={locationAddress} onChangeText={setLocationAddress} placeholder="Adresse optionnelle" />
          <AppInput value={organizerName} onChangeText={setOrganizerName} placeholder="Organisateur optionnel" />
          <AppInput value={capacity} onChangeText={setCapacity} placeholder="Capacité optionnelle" keyboardType="number-pad" />
          {fieldErrors.capacity ? <HelperText tone="error">{fieldErrors.capacity}</HelperText> : null}
          <AppInput value={imageUrl} onChangeText={setImageUrl} placeholder="Image URL optionnelle" autoCapitalize="none" />
          <AppInput value={tags} onChangeText={setTags} placeholder="Tags séparés par des virgules" />
          {tags.trim() && (
            <View style={styles.tagsPreview}>
              <Text style={styles.tagsLabel}>Tags ({tags.split(',').filter((t) => t.trim()).length}):</Text>
              <View style={styles.tagsPillRow}>
                {tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((tag, idx) => (
                    <View key={idx} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Catégorie</Text>
          <View style={styles.pillRow}>
            {categories.map((value) => (
              <Pill key={value} label={value} active={category === value} onPress={() => setCategory(value)} />
            ))}
          </View>
        </Card>

        <AppButton title={eventId ? 'Mettre à jour' : 'Créer'} onPress={submit} disabled={success} />
        <AppButton title="Retour" variant="secondary" onPress={() => router.back()} disabled={success} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 24,
  },
  card: {
    gap: 10,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagsPreview: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tagsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#4B5563',
    borderRadius: 12,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
