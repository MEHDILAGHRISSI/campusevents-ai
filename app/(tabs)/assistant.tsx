import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, AppInput, Card, EmptyState, ErrorState, HelperText, LoadingState, Screen, SectionTitle } from '@/components/ui-kit';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { getLlmConfig, setSetting } from '@/database/settings';
import {
    runPlanningAssistant,
    runQaAssistant,
    runRecommendationAssistant,
    runSearchAssistant,
    type PlanningAssistantResult,
    type QaAssistantResult,
    type RecommendationAssistantResult,
    type SearchAssistantResult,
} from '@/services/llm';

type ResultState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T };

function makeIdleState<T>(): ResultState<T> {
  return { status: 'idle' };
}

export default function AssistantScreen() {
  const [baseUrl, setBaseUrl] = useState(getLlmConfig().baseUrl);
  const [model, setModel] = useState(getLlmConfig().model);
  const [apiKey, setApiKey] = useState(getLlmConfig().apiKey);
  const [searchPrompt, setSearchPrompt] = useState('quelque chose sur l\'IA ce weekend');
  const [planningPrompt, setPlanningPrompt] = useState('J\'ai cours lundi et mercredi matin, un exam jeudi. Aide-moi à planifier ma semaine.');
  const [qaPrompt, setQaPrompt] = useState('Quels événements ont encore des places disponibles ?');
  const [searchState, setSearchState] = useState<ResultState<SearchAssistantResult>>(makeIdleState());
  const [recommendationState, setRecommendationState] = useState<ResultState<RecommendationAssistantResult>>(makeIdleState());
  const [planningState, setPlanningState] = useState<ResultState<PlanningAssistantResult>>(makeIdleState());
  const [qaState, setQaState] = useState<ResultState<QaAssistantResult>>(makeIdleState());

  const busy = useMemo(
    () =>
      [searchState, recommendationState, planningState, qaState].some((state) => state.status === 'loading'),
    [planningState, qaState, recommendationState, searchState]
  );

  const { userId, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
        <ActivityIndicator style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!userId) return null;

  async function saveConfig() {
    setSetting('llm_base_url', baseUrl.trim());
    setSetting('llm_model', model.trim());
    setSetting('llm_api_key', apiKey.trim());
    Alert.alert('Configuration enregistrée', 'Les paramètres de l\'assistant sont stockés localement.');
  }

  async function runSearch() {
    if (!userId) {
      return;
    }

    if (!searchPrompt.trim()) {
      setSearchState({ status: 'error', error: 'Saisissez une requête de recherche.' });
      return;
    }

    setSearchState({ status: 'loading' });
    try {
      const data = await runSearchAssistant(userId, searchPrompt.trim());
      setSearchState({ status: 'success', data });
    } catch (cause) {
      setSearchState({ status: 'error', error: cause instanceof Error ? cause.message : 'Erreur inconnue.' });
    }
  }

  async function runRecommendation() {
    if (!userId) {
      return;
    }

    setRecommendationState({ status: 'loading' });
    try {
      const data = await runRecommendationAssistant(userId);
      setRecommendationState({ status: 'success', data });
    } catch (cause) {
      setRecommendationState({ status: 'error', error: cause instanceof Error ? cause.message : 'Erreur inconnue.' });
    }
  }

  async function runPlanning() {
    if (!userId) {
      return;
    }

    if (!planningPrompt.trim()) {
      setPlanningState({ status: 'error', error: 'Décrivez vos contraintes horaires.' });
      return;
    }

    setPlanningState({ status: 'loading' });
    try {
      const data = await runPlanningAssistant(userId, planningPrompt.trim());
      setPlanningState({ status: 'success', data });
    } catch (cause) {
      setPlanningState({ status: 'error', error: cause instanceof Error ? cause.message : 'Erreur inconnue.' });
    }
  }

  async function runQuestion() {
    if (!userId) {
      return;
    }

    if (!qaPrompt.trim()) {
      setQaState({ status: 'error', error: 'Posez une question sur le catalogue.' });
      return;
    }

    setQaState({ status: 'loading' });
    try {
      const data = await runQaAssistant(userId, qaPrompt.trim());
      setQaState({ status: 'success', data });
    } catch (cause) {
      setQaState({ status: 'error', error: cause instanceof Error ? cause.message : 'Erreur inconnue.' });
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Assistant" subtitle="Recherche NL, recommandation, planification et Q/R." />
        <Card>
          <HelperText tone="warning">Ne soumettez pas de données personnelles ou sensibles.</HelperText>
          <AppInput value={baseUrl} onChangeText={setBaseUrl} placeholder="Base URL API" autoCapitalize="none" />
          <AppInput value={model} onChangeText={setModel} placeholder="Modèle" autoCapitalize="none" />
          <AppInput value={apiKey} onChangeText={setApiKey} placeholder="Clé API" secureTextEntry />
          <AppButton title="Enregistrer la configuration" onPress={saveConfig} disabled={busy} />
        </Card>

        <AssistantCard
          title="Recherche en langage naturel"
          subtitle="Le modèle compare la requête à tout le catalogue sérialisé en JSON."
          busy={busy}
          state={searchState}
          input={searchPrompt}
          setInput={setSearchPrompt}
          buttonLabel="Lancer la recherche"
          onSubmit={runSearch}
          placeholder="quelque chose sur l'IA ce weekend"
          result={renderSearchResult(searchState)}
        />

        <AssistantCard
          title="Recommandation personnalisée"
          subtitle="Le modèle croise vos favoris et inscriptions avec les événements à venir."
          busy={busy}
          state={recommendationState}
          buttonLabel="Générer 3 suggestions"
          onSubmit={runRecommendation}
          result={renderRecommendationResult(recommendationState)}
        />

        <AssistantCard
          title="Assistant de planification"
          subtitle="Le modèle propose une semaine sans conflit horaire."
          busy={busy}
          state={planningState}
          input={planningPrompt}
          setInput={setPlanningPrompt}
          buttonLabel="Construire le planning"
          onSubmit={runPlanning}
          placeholder="J'ai cours lundi et mercredi matin, un exam jeudi. Aide-moi à planifier ma semaine."
          result={renderPlanningResult(planningState)}
        />

        <AssistantCard
          title="Questions sur le catalogue"
          subtitle="Réponse transversale sur l&apos;ensemble des événements."
          busy={busy}
          state={qaState}
          input={qaPrompt}
          setInput={setQaPrompt}
          buttonLabel="Poser la question"
          onSubmit={runQuestion}
          placeholder="Quels clubs sont actifs ce mois-ci ?"
          result={renderQaResult(qaState)}
        />
      </ScrollView>
    </Screen>
  );
}

function AssistantCard({
  title,
  subtitle,
  busy,
  state,
  input,
  setInput,
  buttonLabel,
  onSubmit,
  placeholder,
  result,
}: {
  title: string;
  subtitle: string;
  busy: boolean;
  state: ResultState<unknown>;
  input?: string;
  setInput?: (value: string) => void;
  buttonLabel: string;
  onSubmit: () => void;
  placeholder?: string;
  result: JSX.Element;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      {setInput ? (
        <AppInput
          value={input ?? ''}
          onChangeText={setInput}
          placeholder={placeholder}
          multiline
          style={styles.multilineInput}
        />
      ) : null}
      <AppButton title={buttonLabel} onPress={onSubmit} disabled={busy || state.status === 'loading'} />
      {result}
    </Card>
  );
}

function renderSearchResult(state: ResultState<SearchAssistantResult>) {
  if (state.status === 'idle') {
    return <HelperText>La réponse apparaîtra ici après la requête.</HelperText>;
  }

  if (state.status === 'loading') {
    return <LoadingState label="Analyse du catalogue..." />;
  }

  if (state.status === 'error') {
    return <ErrorState title="Recherche IA" subtitle={state.error} />;
  }

  if (state.data.matches.length === 0) {
    return <EmptyState title="Aucun résultat" subtitle="Le modèle n'a identifié aucun événement pertinent." />;
  }

  return (
    <View style={styles.resultList}>
      {state.data.matches.map((match) => (
        <View key={match.eventId} style={styles.resultItem}>
          <Text style={styles.resultTitle}>{match.title}</Text>
          <Text style={styles.resultMeta}>{match.reason}</Text>
          <Text style={styles.resultMeta}>Confiance: {Math.round(match.confidence * 100)}%</Text>
        </View>
      ))}
    </View>
  );
}

function renderRecommendationResult(state: ResultState<RecommendationAssistantResult>) {
  if (state.status === 'idle') {
    return <HelperText>Vos recommandations personnalisées apparaîtront ici.</HelperText>;
  }

  if (state.status === 'loading') {
    return <LoadingState label="Génération des recommandations..." />;
  }

  if (state.status === 'error') {
    return <ErrorState title="Recommandations IA" subtitle={state.error} />;
  }

  if (state.data.suggestions.length === 0) {
    return <EmptyState title="Aucune suggestion" subtitle="Le modèle n'a pas trouvé de correspondance forte." />;
  }

  return (
    <View style={styles.resultList}>
      {state.data.suggestions.map((suggestion, index) => (
        <View key={`${suggestion.eventId}-${index}`} style={styles.resultItem}>
          <Text style={styles.resultTitle}>{suggestion.title}</Text>
          <Text style={styles.resultMeta}>{suggestion.reason}</Text>
        </View>
      ))}
    </View>
  );
}

function renderPlanningResult(state: ResultState<PlanningAssistantResult>) {
  if (state.status === 'idle') {
    return <HelperText>Le planning généré par le modèle apparaîtra ici.</HelperText>;
  }

  if (state.status === 'loading') {
    return <LoadingState label="Construction du planning..." />;
  }

  if (state.status === 'error') {
    return <ErrorState title="Planification IA" subtitle={state.error} />;
  }

  if (state.data.plan.length === 0) {
    return <EmptyState title="Planning vide" subtitle="Aucun événement n'a pu être placé sans conflit." />;
  }

  return (
    <View style={styles.resultList}>
      {state.data.plan.map((slot) => (
        <View key={`${slot.eventId}-${slot.day}`} style={styles.resultItem}>
          <Text style={styles.resultTitle}>{slot.day} • {slot.slot}</Text>
          <Text style={styles.resultMeta}>{slot.title}</Text>
          <Text style={styles.resultMeta}>{slot.reason}</Text>
        </View>
      ))}
    </View>
  );
}

function renderQaResult(state: ResultState<QaAssistantResult>) {
  if (state.status === 'idle') {
    return <HelperText>Les réponses transversales s&apos;affichent ici après interrogation du catalogue.</HelperText>;
  }

  if (state.status === 'loading') {
    return <LoadingState label="Recherche dans le catalogue..." />;
  }

  if (state.status === 'error') {
    return <ErrorState title="Question IA" subtitle={state.error} />;
  }

  return (
    <View style={styles.resultList}>
      <View style={styles.resultItem}>
        <Text style={styles.resultTitle}>Réponse</Text>
        <Text style={styles.resultMeta}>{state.data.answer}</Text>
      </View>
      {state.data.references.length > 0 ? (
        <View style={styles.resultItem}>
          <Text style={styles.resultTitle}>Références</Text>
          {state.data.references.map((reference) => (
            <Text key={reference.eventId} style={styles.resultMeta}>
              {reference.title} - {reference.reason}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 24,
  },
  card: {
    gap: 12,
  },
  cardHeader: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#5b6472',
    lineHeight: 18,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  resultList: {
    gap: 10,
  },
  resultItem: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f7fafc',
    gap: 4,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  resultMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4b5563',
  },
});
