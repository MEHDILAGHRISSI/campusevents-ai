import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, AppInput, Card, EmptyState, Screen, SectionTitle } from '@/components/ui-kit';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { listEvents } from '@/database/events';
import {
    askAboutEvents,
    generateSchedule,
    getRecommendations,
    searchEvents,
    type PlanningAssistantResult,
    type RecommendationAssistantResult,
    type SearchAssistantResult
} from '@/services/llm';
import { useRouter } from 'expo-router';

/** Type pour un message du chat */
type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  explanation?: string;
  events?: Array<{ eventId: string; title: string; startDateTime: string; endDateTime: string }>;
  plan?: Array<{ day: string; eventId: string; title: string; slot: string; reason: string }>;
  conflicts?: Array<{ eventId?: string; title: string; reason: string; type: string }>;
};

type LastAction = {
  query: string;
};

/** Composant carte événement avec bouton Détails */
function EventCardBubble({ event }: { event: Message['events'][0] }) {
  const router = useRouter();
  const startTime = new Date(event.startDateTime);
  const timeStr = startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable onPress={() => router.push(`/student/event/${event.eventId}`)}>
      <Card style={styles.eventCardBubble}>
        <View style={styles.eventCardContent}>
          <Text style={styles.eventCardTitle} numberOfLines={2}>{event.title}</Text>
          {event.startDateTime && <Text style={styles.eventCardTime}>{timeStr}</Text>}
        </View>
        <MaterialIcons name="info" size={18} color="#4B5563" />
      </Card>
    </Pressable>
  );
}

/** Composant carte de planning */
function PlanningCard({ slot }: { slot: Message['plan'][0] }) {
  const start = slot.slot; // slot is human-readable (e.g., "Lundi 10:00-11:00")
  return (
    <Card style={styles.planningCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.planDay}>{slot.day}</Text>
        <Text style={styles.planTime}>{slot.slot}</Text>
        <Text style={styles.planTitle} numberOfLines={2}>{slot.title}</Text>
      </View>
    </Card>
  );
}

/** Composant bulle de message */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageBubbleContainer, isUser ? styles.userBubbleContainer : styles.aiBubbleContainer]}>
      {!isUser && message.explanation && (
        <View style={styles.explanationBubble}>
          <Text style={styles.explanationText}>{message.explanation}</Text>
        </View>
      )}

      {message.text && (
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {message.text}
          </Text>
        </View>
      )}

      {/* Events (search / recommendation) */}
      {!isUser && message.events && message.events.length > 0 && (
        <View style={styles.eventsContainer}>
          {message.events.map((event) => (
            <EventCardBubble key={event.eventId} event={event} />
          ))}
        </View>
      )}

      {/* Planning cards */}
      {!isUser && message.plan && message.plan.length > 0 && (
        <View style={styles.plansContainer}>
          {message.plan.map((slot, idx) => (
            <PlanningCard key={`${slot.eventId}-${idx}`} slot={slot} />
          ))}
        </View>
      )}

      {/* Conflicts */}
      {!isUser && message.conflicts && message.conflicts.length > 0 && (
        <View style={styles.conflictsContainer}>
          {message.conflicts.map((conflict, idx) => (
            <View key={`${conflict.title}-${idx}`} style={styles.conflictRow}>
              <MaterialIcons name="warning" size={18} color="#B91C1C" />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.conflictTitle}>{conflict.title}</Text>
                <Text style={styles.conflictReason}>{conflict.reason}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}


/** Analyse l'intention de l'utilisateur et appelle le bon assistant */
async function orchestrateAssistant(
  userId: string,
  query: string
): Promise<{ data: any; type: string; textualResponse: string }> {
  const lowerQuery = query.toLowerCase();

  const isPlanningQuery = /planning|emploi du temps|horaire|semaine|jour|agenda|schedule/.test(lowerQuery);
  const isPersonalQuery = /conseil|recommand|suggest|besoin|propose|avis/.test(lowerQuery);
  const isQaQuery = /quoi|quel|comment|pourquoi|existe|disponib|place|dispo|ouvert/.test(lowerQuery);

  try {
    if (isPlanningQuery) {
      console.log('[Assistant] Detected planning query');
      const result = await generateSchedule(userId, query);
      return {
        data: result,
        type: 'planning',
        textualResponse: `Voici un planning adapté à tes contraintes. ${result.conflicts.length > 0 ? `J'ai détecté ${result.conflicts.length} conflit(s) que j'ai signalé(s) ci-dessous.` : 'Aucun conflit détecté !'}`,
      };
    }

    if (isPersonalQuery) {
      console.log('[Assistant] Detected recommendation query');
      const result = await getRecommendations(userId);
      return {
        data: result,
        type: 'recommendation',
        textualResponse: `Basé sur tes favoris et inscriptions, voici ${result.suggestions.length} événement(s) qui pourrait(ent) t'intéresser.`,
      };
    }

    if (isQaQuery) {
      console.log('[Assistant] Detected Q&A query');
      const result = await askAboutEvents(userId, query);
      return {
        data: result,
        type: 'qa',
        textualResponse: result.answer || 'Désolé, je n\'ai pas trouvé de réponse.',
      };
    }

    console.log('[Assistant] Default to search');
    const result = await searchEvents(userId, query);
    return {
      data: result,
      type: 'search',
      textualResponse: `J'ai trouvé ${result.matches.length} événement(s) correspondant à ta recherche.`,
    };
  } catch (error) {
    console.error('[Assistant] orchestrateAssistant error:', error);
    throw error;
  }
}

export default function StudentAssistantScreen() {
  const { userId, ready } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAIError, setHasAIError] = useState(false);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <ActivityIndicator style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!userId) return null;

  async function runAssistantQuery(query: string, options?: { addUserMessage?: boolean }) {
    const shouldAddUserMessage = options?.addUserMessage ?? false;
    setIsLoading(true);
    setHasAIError(false);
    try {
      const result = await orchestrateAssistant(userId, query);
      console.log('[Assistant] Result:', result);

      const allEvents = listEvents();
      const eventMap = new Map(allEvents.map((e) => [e.id, e]));

      let aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: result.type === 'qa' ? result.textualResponse : '', // Pour QA, affiche la réponse comme texte
        explanation: result.type !== 'qa' ? result.textualResponse : '', // Pour autres, affiche comme explication
      };

      if (result.type === 'search' && 'matches' in result.data) {
        const matches = (result.data as SearchAssistantResult).matches;
        aiMessage.events = matches
          .map((m) => {
            const fullEvent = eventMap.get(m.eventId);
            return {
              eventId: m.eventId,
              title: m.title,
              startDateTime: fullEvent?.startDateTime || '',
              endDateTime: fullEvent?.endDateTime || '',
            };
          })
          .slice(0, 5);
      } else if (result.type === 'recommendation' && 'suggestions' in result.data) {
        const suggestions = (result.data as RecommendationAssistantResult).suggestions;
        aiMessage.events = suggestions
          .map((s) => {
            const fullEvent = eventMap.get(s.eventId);
            return {
              eventId: s.eventId,
              title: s.title,
              startDateTime: fullEvent?.startDateTime || '',
              endDateTime: fullEvent?.endDateTime || '',
            };
          })
          .slice(0, 5);
      } else if (result.type === 'planning' && 'plan' in result.data) {
        // result.data is a PlanningAssistantResult
        const plan = (result.data as PlanningAssistantResult).plan || [];
        const conflicts = (result.data as PlanningAssistantResult).conflicts || [];
        aiMessage.plan = plan.map((p) => ({ day: p.day, eventId: p.eventId, title: p.title, slot: p.slot, reason: p.reason }));
        aiMessage.conflicts = conflicts.map((c) => ({ eventId: c.eventId, title: c.title, reason: c.reason, type: c.type }));
      }

      setMessages((prev) => {
        const next = [...prev];
        if (shouldAddUserMessage) {
          next.push({
            id: `user-${Date.now()}`,
            role: 'user',
            text: query,
          });
        }
        next.push(aiMessage);
        return next;
      });
      setHasAIError(false);
    } catch (error) {
      console.error('[Assistant] request failed:', error);
      setHasAIError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!inputValue.trim() || isLoading) return;
    const query = inputValue.trim();
    setLastAction({ query });
    setInputValue('');
    await runAssistantQuery(query, { addUserMessage: true });
  }

  async function handleRetry() {
    if (!lastAction || isLoading) return;
    await runAssistantQuery(lastAction.query, { addUserMessage: false });
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <SectionTitle title="Assistant IA" subtitle="Pose tes questions ou décris ce que tu cherches" />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        scrollEventThrottle={16}
      >
        {hasAIError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Une erreur est survenue lors de la communication avec l'assistant IA</Text>
            <AppButton title="Réessayer" onPress={handleRetry} disabled={isLoading || !lastAction} />
          </Card>
        ) : null}

        {messages.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <EmptyState title="Aucun message" subtitle="Pose une question à l'assistant pour commencer" />
          </View>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        {isLoading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#4B5563" />
            <Text style={styles.loadingText}>L'assistant réfléchit...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputZone}>
        <AppInput
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Pose une question ou décris ce que tu cherches..."
          multiline
        />
        <AppButton
          title="Envoyer"
          onPress={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  messagesContainer: { flex: 1 },
  messagesContent: { gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  emptyStateContainer: { flex: 1, justifyContent: 'center' },
  messageBubbleContainer: { gap: 8 },
  userBubbleContainer: { alignItems: 'flex-end' },
  aiBubbleContainer: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '85%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  userBubble: { backgroundColor: '#4B5563' },
  aiBubble: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#FFFFFF' },
  aiText: { color: '#111827' },
  explanationBubble: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '85%' },
  explanationText: { fontSize: 13, color: '#92400E', fontStyle: 'italic' },
  eventsContainer: { gap: 8, marginTop: 4, maxWidth: '90%' },
  eventCardBubble: { 
    backgroundColor: '#F9FAFB', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    padding: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  eventCardContent: { flex: 1 },
  eventCardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  eventCardTime: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  plansContainer: { gap: 8, marginTop: 6 },
  planningCard: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  planDay: { fontSize: 12, fontWeight: '700', color: '#4B5563', textTransform: 'uppercase' },
  planTime: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  planTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 6 },
  conflictsContainer: { marginTop: 8, gap: 8, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 },
  conflictRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  conflictTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B' },
  conflictReason: { fontSize: 13, color: '#7F1D1D' },
  loadingBubble: { 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    maxWidth: '85%'
  },
  loadingText: { fontSize: 14, color: '#6B7280' },
  errorCard: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    gap: 10,
  },
  errorTitle: {
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '700',
  },
  inputZone: { 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    backgroundColor: '#FFFFFF', 
    borderTopWidth: 1, 
    borderTopColor: '#E5E7EB', 
    gap: 8 
  },
});