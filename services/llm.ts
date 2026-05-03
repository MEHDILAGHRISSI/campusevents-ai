import { listEvents, listEventsInRange, listUpcomingEvents } from '@/database/events';
import { listFavoriteEventIds } from '@/database/favorites';
import { getCachedLlmResult, saveLlmResult } from '@/database/llmResults';
import { listRegistrationsByUser } from '@/database/registrations';
import { getLlmConfig } from '@/database/settings';
import type { EventRecord } from '@/database/types';

type AssistantType = 'search' | 'recommendation' | 'planning' | 'qa';

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

type AssistantRequest = {
  type: AssistantType;
  userId: string;
  inputText: string;
  eventId?: string;
  messages: ChatMessage[];
};

export type SearchAssistantResult = {
  matches: Array<{
    eventId: string;
    title: string;
    reason: string;
    confidence: number;
  }>;
};

export type RecommendationAssistantResult = {
  suggestions: Array<{
    eventId: string;
    title: string;
    reason: string;
  }>;
};

export type PlanningAssistantResult = {
  plan: Array<{
    day: string;
    eventId: string;
    title: string;
    slot: string;
    reason: string;
  }>;
};

export type QaAssistantResult = {
  answer: string;
  references: Array<{
    eventId: string;
    title: string;
    reason: string;
  }>;
};

const enrichedStudentProfiles: Record<string, string> = {
  'etudiant@campus.ma': 'Filiere: Master Informatique, 1ere annee. Centres d\'interet: IA appliquee, developpement web, design produit.',
};

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function summarizeEvent(event: EventRecord) {
  return {
    id: event.id,
    title: event.title,
    description: truncateText(event.description, 180),
    category: event.category,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    locationName: event.locationName,
    organizerName: event.organizerName,
    capacity: event.capacity,
    registeredCount: event.registeredCount,
    tags: event.tags,
    isPast: new Date(event.startDateTime).getTime() < Date.now(),
  };
}

function buildPromptContext(events: EventRecord[], maxCharacters = 7000) {
  return truncateText(JSON.stringify(events.map(summarizeEvent), null, 2), maxCharacters);
}

function stripMarkdownArtifacts(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function normalizeRawJsonText(rawText: string) {
  const trimmed = rawText.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  if (withoutFence.startsWith('{') && withoutFence.endsWith('}')) {
    return withoutFence;
  }

  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return withoutFence.slice(firstBrace, lastBrace + 1);
  }

  throw new Error('Le modele a renvoye une reponse non JSON.');
}

function extractJson<T>(rawText: string): T {
  const normalized = normalizeRawJsonText(rawText);

  try {
    return JSON.parse(normalized) as T;
  } catch {
    throw new Error('Le modele a renvoye une reponse non JSON.');
  }
}

function asString(value: unknown) {
  return typeof value === 'string' ? stripMarkdownArtifacts(value) : '';
}

function parseSearchResult(rawText: string): SearchAssistantResult {
  const parsed = extractJson<{ matches?: Array<Record<string, unknown>> }>(rawText);
  const sourceMatches = Array.isArray(parsed.matches) ? parsed.matches : [];

  return {
    matches: sourceMatches
      .map((match) => {
        const eventId = asString(match.eventId);
        const title = asString(match.title);
        const reason = asString(match.reason);
        const confidenceValue = Number(match.confidence ?? 0);
        const confidence = Number.isFinite(confidenceValue) ? Math.min(1, Math.max(0, confidenceValue)) : 0;

        if (!eventId || !title || !reason) {
          return null;
        }

        return {
          eventId,
          title,
          reason,
          confidence,
        };
      })
      .filter((match): match is NonNullable<typeof match> => Boolean(match)),
  };
}

function parseRecommendationResult(rawText: string): RecommendationAssistantResult {
  const parsed = extractJson<{ suggestions?: Array<Record<string, unknown>> }>(rawText);
  const sourceSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

  return {
    suggestions: sourceSuggestions
      .map((suggestion) => {
        const eventId = asString(suggestion.eventId);
        const title = asString(suggestion.title);
        const reason = asString(suggestion.reason);

        if (!eventId || !title || !reason) {
          return null;
        }

        return {
          eventId,
          title,
          reason,
        };
      })
      .filter((suggestion): suggestion is NonNullable<typeof suggestion> => Boolean(suggestion)),
  };
}

function parsePlanningResult(rawText: string): PlanningAssistantResult {
  const parsed = extractJson<{ plan?: Array<Record<string, unknown>> }>(rawText);
  const sourcePlan = Array.isArray(parsed.plan) ? parsed.plan : [];

  return {
    plan: sourcePlan
      .map((entry) => {
        const day = asString(entry.day);
        const eventId = asString(entry.eventId);
        const title = asString(entry.title);
        const slot = asString(entry.slot);
        const reason = asString(entry.reason);

        if (!day || !eventId || !title || !slot || !reason) {
          return null;
        }

        return {
          day,
          eventId,
          title,
          slot,
          reason,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
  };
}

function parseQaResult(rawText: string): QaAssistantResult {
  const parsed = extractJson<{ answer?: unknown; references?: Array<Record<string, unknown>> }>(rawText);
  const sourceReferences = Array.isArray(parsed.references) ? parsed.references : [];

  return {
    answer: asString(parsed.answer),
    references: sourceReferences
      .map((reference) => {
        const eventId = asString(reference.eventId);
        const title = asString(reference.title);
        const reason = asString(reference.reason);

        if (!eventId || !title || !reason) {
          return null;
        }

        return {
          eventId,
          title,
          reason,
        };
      })
      .filter((reference): reference is NonNullable<typeof reference> => Boolean(reference)),
  };
}

function getEnrichedStudentProfile(userId: string) {
  return (
    enrichedStudentProfiles[userId] ??
    'Profil etudiant non renseigne: proposer des recommandations polyvalentes orientees apprentissage et vie de campus.'
  );
}

async function callAssistantModel({ messages }: AssistantRequest) {
  const config = getLlmConfig();

  if (!config.apiKey) {
    throw new Error("Aucune clé API n'est configurée dans les paramètres de l'assistant.");
  }

  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erreur API ${response.status}: ${truncateText(errorBody, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Réponse vide du fournisseur LLM.');
  }

  return content;
}

function buildSearchMessages(inputText: string, catalogJson: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        "Tu es CampusEvents AI Search. Analyse un catalogue d'événements et retourne uniquement du JSON valide. Réponds avec {\"matches\":[{\"eventId\",\"title\",\"reason\",\"confidence\"}]}. Choisis jusqu'à 5 événements pertinents. Chaque reason doit être courte et concrète.",
    },
    {
      role: 'user',
      content: `REQUETE_UTILISATEUR:\n${inputText}\n\nCATALOGUE_JSON:\n${catalogJson}\n\nCONTRAINTES:\n- N'inventez pas d'événements\n- Utilisez les ids fournis\n- Retour JSON uniquement`,
    },
  ];
}

function buildRecommendationMessages(inputText: string, catalogJson: string) {
  return [
    {
      role: 'system',
      content:
        "Tu es CampusEvents AI Recommendation. À partir de l'historique et du catalogue à venir, propose 3 événements pertinents. Retourne uniquement du JSON valide au format {\"suggestions\":[{\"eventId\",\"title\",\"reason\"}]}.",
    },
    {
      role: 'user',
      content: `PROFIL_ET_HISTORIQUE:\n${inputText}\n\nCATALOGUE_A_VENIR_JSON:\n${catalogJson}\n\nCONTRAINTES:\n- Utilise seulement des événements à venir\n- N'utilise que les ids fournis\n- Retour JSON uniquement`,
    },
  ];
}

function buildPlanningMessages(inputText: string, catalogJson: string) {
  return [
    {
      role: 'system',
      content:
        "Tu es CampusEvents AI Planning. Construis un planning sans conflit à partir des contraintes horaires et des événements de la semaine. Retourne uniquement du JSON valide au format {\"plan\":[{\"day\",\"eventId\",\"title\",\"slot\",\"reason\"}]}.",
    },
    {
      role: 'user',
      content: `CONTRAINTES:\n${inputText}\n\nEVENEMENTS_DE_LA_SEMAINE_JSON:\n${catalogJson}\n\nCONTRAINTES_DE_SORTIE:\n- Évite les conflits horaires\n- Si aucun événement ne convient, retourne un tableau vide\n- Retour JSON uniquement`,
    },
  ];
}

function buildQaMessages(inputText: string, catalogJson: string) {
  return [
    {
      role: 'system',
      content:
        "Tu es CampusEvents AI QA. Réponds à des questions transversales sur l'ensemble du catalogue. Retourne uniquement du JSON valide au format {\"answer\":\"...\",\"references\":[{\"eventId\",\"title\",\"reason\"}]}.",
    },
    {
      role: 'user',
      content: `QUESTION:\n${inputText}\n\nCATALOGUE_JSON:\n${catalogJson}\n\nCONTRAINTES:\n- Cite les événements pertinents si utile\n- N'invente pas de données\n- Retour JSON uniquement`,
    },
  ];
}

async function runAssistant<T>(request: AssistantRequest, cacheInput: string, parseResult: (rawText: string) => T) {
  const cached = getCachedLlmResult(request.type, request.userId, cacheInput);

  if (cached) {
    return parseResult(cached);
  }

  const rawOutput = await callAssistantModel(request);
  saveLlmResult({
    eventId: request.eventId,
    userId: request.userId,
    type: request.type,
    inputText: cacheInput,
    outputText: rawOutput,
  });

  return parseResult(rawOutput);
}

function buildCacheInput(request: AssistantRequest) {
  return JSON.stringify(
    {
      type: request.type,
      inputText: request.inputText,
      messages: request.messages,
    },
    null,
    2
  );
}

export async function runSearchAssistant(userId: string, inputText: string) {
  const catalog = buildPromptContext(listEvents(), 7000);
  const messages = buildSearchMessages(inputText, catalog);
  const request = { type: 'search', userId, inputText, messages };
  return runAssistant<SearchAssistantResult>(request, buildCacheInput(request), parseSearchResult);
}

export async function runRecommendationAssistant(userId: string) {
  const favorites = listFavoriteEventIds(userId);
  const registrations = listRegistrationsByUser(userId);
  const studentProfile = getEnrichedStudentProfile(userId);
  const history = {
    studentProfile,
    favorites,
    registrations: registrations.map((registration) => registration.eventId),
  };
  const catalog = buildPromptContext(listUpcomingEvents(), 7000);
  const inputText = JSON.stringify(history, null, 2);
  const messages = buildRecommendationMessages(inputText, catalog);

  const request = { type: 'recommendation', userId, inputText, messages };
  return runAssistant<RecommendationAssistantResult>(request, buildCacheInput(request), parseRecommendationResult);
}

export async function runPlanningAssistant(userId: string, inputText: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const catalog = buildPromptContext(listEventsInRange(start.toISOString(), end.toISOString()), 7000);
  const messages = buildPlanningMessages(inputText, catalog);
  const request = { type: 'planning', userId, inputText, messages };
  return runAssistant<PlanningAssistantResult>(request, buildCacheInput(request), parsePlanningResult);
}

export async function runQaAssistant(userId: string, inputText: string) {
  const catalog = buildPromptContext(listEvents(), 7000);
  const messages = buildQaMessages(inputText, catalog);
  const request = { type: 'qa', userId, inputText, messages };
  return runAssistant<QaAssistantResult>(request, buildCacheInput(request), parseQaResult);
}
