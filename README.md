# CampusEvents AI — Mini-Projet React Native (Version Soutenance)

Application mobile de gestion d'événements universitaires avec assistant IA, développée avec **Expo Router**, **React Native** et **SQLite**.

- Université : Université Abdelmalek Essaadi
- Département : Informatique
- Date limite : 30 mai 2026
- Plateformes : Android / iOS / Web

Ce projet couvre deux espaces métier (Admin et Étudiant), applique les règles fonctionnelles attendues, et intègre un assistant IA robuste avec cache local et gestion d’erreurs complète.

---

## Table des matières

1. [Résumé du projet](#résumé-du-projet)
2. [Objectifs pédagogiques](#objectifs-pédagogiques)
3. [Périmètre fonctionnel](#périmètre-fonctionnel)
4. [Conformité aux exigences du mini-projet](#conformité-aux-exigences-du-mini-projet)
5. [Architecture technique](#architecture-technique)
6. [Structure du projet](#structure-du-projet)
7. [Modèle de données SQLite](#modèle-de-données-sqlite)
8. [Règles métiers détaillées](#règles-métiers-détaillées)
9. [Assistant IA (4 fonctionnalités)](#assistant-ia-4-fonctionnalités)
10. [Gestion des états UI (Loading/Error/Empty/Result)](#gestion-des-états-ui-loadingerroremptyresult)
11. [Seeding des données (23–30 mai 2026)](#seeding-des-données-2330-mai-2026)
12. [Installation & exécution](#installation--exécution)
13. [Variables d’environnement](#variables-denvironnement)
14. [Scripts disponibles](#scripts-disponibles)
15. [Scénario de démonstration guidé](#scénario-de-démonstration-guidé)
16. [Checklist de validation pour la soutenance](#checklist-de-validation-pour-la-soutenance)
17. [Contrôles qualité et vérifications](#contrôles-qualité-et-vérifications)
18. [Dépannage (Troubleshooting)](#dépannage-troubleshooting)
19. [Limites actuelles et améliorations](#limites-actuelles-et-améliorations)
20. [Conclusion](#conclusion)

---

## Résumé du projet

CampusEvents AI est une application locale-first destinée à démontrer la gestion d’événements académiques de bout en bout :

- **Administration** des événements (CRUD complet).
- **Consommation côté étudiant** (catalogue, détail, favoris, inscriptions).
- **Intelligence artificielle** pour la recherche naturelle, la recommandation, la planification et la question/réponse.
- **Persistance locale** avec SQLite pour garantir une démo autonome et reproductible.

Le projet est pensé pour une soutenance : rapide à lancer, démontrable sans backend métier externe, et aligné sur les contraintes du mini-projet.

---

## Objectifs pédagogiques

Ce projet illustre les compétences suivantes :

1. Concevoir une architecture mobile modulaire avec séparation claire des responsabilités.
2. Implémenter des règles métiers concrètes avec validations robustes.
3. Gérer une authentification simple à rôles avec persistance de session.
4. Intégrer un service IA externe avec stratégie de fallback et cache local.
5. Produire une expérience utilisateur robuste (gestion explicite des états et erreurs).

---

## Périmètre fonctionnel

### 1) Espace Admin

- Créer un événement.
- Modifier un événement existant.
- Supprimer un événement.
- Visualiser la liste des événements.
- Renseigner toutes les métadonnées utiles :
     - titre
     - description
     - catégorie
     - date/heure de début
     - date/heure de fin
     - lieu
     - capacité
     - image URL
     - tags (JSON)

### 2) Espace Étudiant

- Consulter le catalogue d’événements.
- Rechercher et filtrer les événements.
- Ouvrir la fiche détaillée d’un événement.
- Ajouter / retirer des favoris.
- S’inscrire / annuler une inscription.
- Consulter les inscriptions actives.
- Utiliser l’assistant IA depuis l’interface dédiée.

### 3) Authentification & rôles

- Connexion via comptes de démonstration.
- Persistance de session.
- Redirection automatique selon le rôle.
- Protection des routes Admin/Étudiant.

Comptes de démonstration :

- **Admin** : `admin@campus.ma`
- **Étudiant** : `etudiant@campus.ma`

---

## Conformité aux exigences du mini-projet

### Exigence A — Authentification avec rôles + session persistante

- Implémentée via `AuthContext` + stockage de session local.
- Contrôle des accès par rôle dans les layouts de navigation.

### Exigence B — Validation stricte côté Admin

- Champs obligatoires validés.
- `capacity` doit être un **entier strictement positif**.
- `endDateTime` doit être **strictement postérieure** à `startDateTime`.

### Exigence C — Règles métiers côté Étudiant

- Pas de doublon d’inscription au même événement.
- Blocage si événement complet.
- Blocage si événement déjà passé.
- Possibilité d’annuler une inscription existante.

### Exigence D — Assistant IA (4 fonctionnalités)

- Recherche naturelle.
- Recommandation personnalisée.
- Planification hebdomadaire.
- Q/R contextuelle.

### Exigence E — Robustesse UI de l’assistant

- États visibles et gérés : **Loading**, **Error**, **Empty**, **Result**.
- En cas d’erreur : bouton **Réessayer** qui rejoue la dernière action IA.

### Exigence F — Cache des résultats IA

- Persistance locale via table `llm_results`.
- Réutilisation des réponses existantes pour réduire latence et appels API.

---

## Architecture technique

Le projet suit une architecture en couches, orientée maintenabilité.

### Vue logique

1. **UI / Navigation** : écrans Expo Router.
2. **Contexte global** : authentification et état utilisateur.
3. **Couche données** : accès SQLite/web-store (events, registrations, favorites, sessions, llm_results).
4. **Services** : logique IA et orchestration des appels externes.
5. **Utilitaires** : validation, dates, notifications, partage.

### Flux de données simplifié

```text
Screen -> Validation -> Database/Service -> State Update -> UI Render
```

### Principes appliqués

- **Single source of truth locale** pour la démo.
- **Validation avant écriture** en base.
- **Contraintes SQL + garde-fous applicatifs**.
- **Dégradation contrôlée** côté IA (erreur explicite + retry + cache).

---

## Structure du projet

```text
app/
     _layout.tsx
     index.tsx
     admin/
          _layout.tsx
          events.tsx
          event-form.tsx
     student/
          _layout.tsx
          index.tsx
          favorites.tsx
          registrations.tsx
          assistant.tsx
          profile.tsx
          event/[id].tsx

context/
     auth-context.tsx

database/
     init.ts
     init.native.ts
     init.web.ts
     events.ts
     registrations.ts
     favorites.ts
     session.ts
     llmResults.ts
     seed-events.ts

services/
     llm.ts

utils/
     validation.ts
     date.ts
     notifications.ts
     native-share.ts
```

---

## Modèle de données SQLite

Tables principales :

- `events`
- `registrations`
- `favorites`
- `llm_results`
- `sessions`
- `app_settings`

### Contraintes importantes

- `PRAGMA foreign_keys = ON` activé à l’initialisation.
- `ON DELETE CASCADE` sur les tables dépendantes de `events`.
- `UNIQUE(eventId, userId)` sur `registrations`.
- `PRIMARY KEY(eventId, userId)` sur `favorites`.

### Schéma conceptuel simplifié

```text
events (id PK)
     ├── registrations (eventId FK -> events.id, userId, UNIQUE(eventId,userId))
     └── favorites     (eventId FK -> events.id, userId, PK(eventId,userId))

sessions (singleton logique de session courante)
llm_results (cache par clé de requête IA)
```

---

## Règles métiers détaillées

### Règles d’inscription

1. Un étudiant ne peut pas s’inscrire deux fois au même événement.
2. Une inscription est refusée si `registeredCount >= capacity`.
3. Une inscription est refusée si l’événement est déjà passé.
4. L’annulation est autorisée si l’inscription existe.

### Règles de création/modification d’événement

1. Les champs requis ne peuvent pas être vides.
2. La capacité doit vérifier :

      - type numérique
      - entier (`Number.isInteger`)
      - strictement supérieur à `0`

3. Si la date de fin est fournie, alors :

      - `endDateTime > startDateTime`

---

## Assistant IA (4 fonctionnalités)

L’assistant fournit les 4 cas d’usage imposés :

### 1) Recherche naturelle (`search`)

Exemple de requête :

> « Trouve-moi les ateliers IA cette semaine après 14h »

### 2) Recommandation (`recommendation`)

Basée sur l’historique local utilisateur : favoris + inscriptions.

### 3) Planification (`planning`)

Proposition de planning hebdomadaire avec prise en compte des conflits horaires.

### 4) Q/R globale (`qa`)

Réponses contextualisées sur le catalogue d’événements.

### Pipeline IA simplifié

```text
Input utilisateur
     -> Construction du prompt selon action
     -> Appel LLM (Groq compatible)
     -> Normalisation du texte
     -> Sauvegarde en cache llm_results
     -> Affichage dans l'UI
```

---

## Gestion des états UI (Loading/Error/Empty/Result)

L’interface assistant est explicitement robuste :

- **Loading** : indicateur visuel pendant l’appel API.
- **Error** : message d’erreur affiché + bouton `Réessayer`.
- **Empty** : état neutre quand aucune réponse n’est disponible.
- **Result** : rendu de la réponse IA.

### Retry intelligent

- La dernière action IA est mémorisée (`lastAction`).
- En cas d’échec, `hasAIError = true`.
- Le bouton **Réessayer** relance exactement la dernière action échouée.

---

## Seeding des données (23–30 mai 2026)

Le fichier `database/seed-events.ts` fournit un jeu de données cohérent pour la démonstration.

### Garanties du seed

- Événements datés entre **23/05/2026** et **30/05/2026**.
- Couverture des catégories : `Talk`, `Workshop`, `Club`, `Exam`, `Other`.
- Tags structurés pour favoriser la recherche sémantique.
- Présence d’au moins un événement complet : `registeredCount = capacity`.

### Pourquoi ce seed est utile en soutenance

- Évite la préparation manuelle des données.
- Permet de tester immédiatement les cas limites (événement complet).
- Rend la démo reproductible pour l’enseignant.

---

## Installation & exécution

### Prérequis

- Node.js LTS
- npm
- Expo CLI via `npx`

### 1) Installer les dépendances

```bash
npm install
```

### 2) Configurer l’environnement

Créer un fichier `.env` à la racine :

```env
EXPO_PUBLIC_LLM_API_KEY=your_groq_api_key_here
EXPO_PUBLIC_LLM_BASE_URL=https://api.groq.com/openai/v1
```

### 3) Lancer l’application

```bash
npx expo start
```

Ensuite ouvrir la cible souhaitée :

- Android Emulator
- iOS Simulator
- Expo Go
- Web

---

## Variables d’environnement

| Variable | Description | Obligatoire |
|---|---|---|
| `EXPO_PUBLIC_LLM_API_KEY` | Clé API Groq (ou compatible) | Oui pour IA |
| `EXPO_PUBLIC_LLM_BASE_URL` | URL base API compatible OpenAI Chat | Oui pour IA |

Sans clé API valide, l’application reste utilisable sur les fonctionnalités non-IA.

---

## Scripts disponibles

```bash
npm run start
npm run android
npm run ios
npm run web
npm run lint
```

---

## Scénario de démonstration guidé

### Étape 1 — Connexion Admin

1. Se connecter avec `admin@campus.ma`.
2. Créer un événement test.
3. Vérifier les validations :
      - capacité non entière -> refus
      - capacité = 0 -> refus
      - fin <= début -> refus

### Étape 2 — Gestion catalogue

1. Modifier l’événement créé.
2. Supprimer un événement et vérifier sa disparition.

### Étape 3 — Connexion Étudiant

1. Se connecter avec `etudiant@campus.ma`.
2. Retrouver l’événement Admin dans le catalogue.
3. Ouvrir la fiche détail.

### Étape 4 — Favoris & inscriptions

1. Ajouter en favori puis retirer.
2. S’inscrire à un événement.
3. Tenter une double inscription (doit échouer).
4. Tester un événement complet (doit échouer).

### Étape 5 — Assistant IA

1. Recherche naturelle.
2. Recommandation personnalisée.
3. Planification de semaine.
4. Q/R libre.
5. Simuler une erreur réseau/API puis cliquer **Réessayer**.

### Étape 6 — Persistance

1. Redémarrer l’application.
2. Vérifier session persistante.
3. Vérifier conservation des favoris/inscriptions/caches.

---

## Checklist de validation pour la soutenance

Cocher chaque point avant présentation :

- [ ] L’application démarre sans erreur (`npx expo start`).
- [ ] Connexion Admin fonctionnelle.
- [ ] Connexion Étudiant fonctionnelle.
- [ ] Redirection par rôle correcte.
- [ ] Routes protégées (pas d’accès croisé).
- [ ] CRUD événements opérationnel.
- [ ] Validation capacité (entier > 0) validée.
- [ ] Validation fin > début validée.
- [ ] Règle anti-doublon d’inscription validée.
- [ ] Blocage événement complet validé.
- [ ] Blocage événement passé validé.
- [ ] Assistant IA : search validé.
- [ ] Assistant IA : recommendation validée.
- [ ] Assistant IA : planning validé.
- [ ] Assistant IA : qa validée.
- [ ] États UI assistant : Loading/Error/Empty/Result visibles.
- [ ] Bouton Réessayer opérationnel.
- [ ] Cache `llm_results` alimenté.

---

## Contrôles qualité et vérifications

### Lint

```bash
npm run lint
```

### Vérifications fonctionnelles recommandées

- Tester chaque rôle séparément.
- Vérifier les opérations CRUD successives (create/update/delete/reload).
- Vérifier les contraintes de capacité et dates sur plusieurs jeux de données.
- Vérifier la cohérence des compteurs d’inscriptions.
- Vérifier la suppression en cascade (`events` -> `registrations` / `favorites`).

### Vérifications IA recommandées

- Tester la même requête deux fois et observer le comportement du cache.
- Couper temporairement la connectivité pour forcer l’état d’erreur.
- Vérifier le bon fonctionnement de **Réessayer**.

---

## Dépannage (Troubleshooting)

### Problème : l’assistant IA ne répond pas

Causes possibles :

- clé API absente ou invalide
- URL API incorrecte
- connectivité réseau indisponible

Actions :

1. Vérifier `.env`.
2. Redémarrer Expo après modification des variables.
3. Vérifier la connectivité Internet.

### Problème : données incohérentes après tests intensifs

Actions :

1. Réinitialiser la base locale (selon la plateforme).
2. Relancer l’application pour rejouer le seed.

### Problème : session non conservée

Actions :

1. Vérifier le mécanisme de persistance (SQLite/web store).
2. Vérifier que la déconnexion n’est pas déclenchée par la navigation test.

---

## Limites actuelles et améliorations

### Limites connues

- Authentification de démonstration (comptes prédéfinis).
- Absence de backend métier distant (volontaire pour la démo locale).
- Pas de système de permissions granulaire multi-admin.

### Pistes d’évolution

1. Synchronisation cloud (API REST/GraphQL).
2. Authentification réelle (JWT/OAuth).
3. Push notifications intelligentes basées sur préférences.
4. Score de recommandation explicable côté IA.
5. Tableau de bord analytics pour l’administration.

---

## Conclusion

CampusEvents AI est prêt pour la soutenance avec :

- un périmètre fonctionnel complet,
- des règles métiers strictes,
- une architecture claire,
- un assistant IA aligné avec les exigences pédagogiques,
- et un seed temporel cohérent pour la période demandée (23–30 mai 2026).

Si besoin, je peux aussi fournir une **version PDF de ce README** (plan de présentation oral inclus) ou une **grille d’évaluation professeur** au format checklist imprimable.
