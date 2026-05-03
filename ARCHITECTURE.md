# CampusEvents AI - Architecture Documentation

## Overview

CampusEvents AI is an Expo Router-based mobile app (with web support) that provides an intelligent event discovery platform for campus students and administrators. The app uses SQLite (native) / localStorage (web) for local storage and integrates with an LLM service for intelligent search, recommendations, and Q&A features.

### Tech Stack
- **Frontend**: React Native + Expo Router
- **Database**: SQLite (native) / IndexedDB+localStorage (web)
- **Auth**: Client-side context (auth-context.tsx)
- **LLM Integration**: OpenAI-compatible API client
- **Build Tool**: Expo CLI

---

## Architecture Layers

### 1. **Routing Layer** (`app/`)

The app uses Expo Router with three main sections:
- **`/`** - Login screen (handles both admin and student redirects)
- **`/(tabs)/*`** - Student interface with 5 tabs:
  - `index` - Event catalogue
  - `favorites` - Favorited events
  - `registrations` - User registrations
  - `assistant` - AI-powered assistant
  - `profile` - User profile & session info
- **`/admin/*`** - Admin interface:
  - `index` - Event management dashboard
  - `event-form` - Event creation/editing

### 2. **Authentication Context** (`context/auth-context.tsx`)

```
AuthProvider
├─ State: { userId, role, isAuthenticated, ready }
├─ Methods: login(), logout()
└─ Hook: useAuth()
```

**Issues Identified:**
- ❌ **No route guards**: Any authenticated user can access `/admin` regardless of role
- ❌ **Logout doesn't redirect**: After logout, users stay on current screen in disconnected state
- ❌ **No logout navigation integration**: Comments explicitly mark this as broken (`// ❌ plus de router.replace ici`)
- ❌ **Session restoration on app init**: Relies on database read without error handling

### 3. **Database Layer** (`database/`)

#### Native Implementation (`database/init.ts`)
- Uses `expo-sqlite` with SQLite database
- Schema with PRAGMA foreign_keys enabled
- Tables: events, registrations, favorites, llm_results, sessions, app_settings
- Demo users seeded on first launch

#### Web Implementation (`database/init.web.ts` + `database/web-store.ts`)
- Uses in-memory state + localStorage for persistence
- Different data structure than native (no actual SQL)
- Same logical structure but different serialization

**Issues Identified:**
- ❌ **Platform divergence**: Web and native have completely different implementations with different failure modes
- ❌ **No query interface abstraction**: Each module directly calls `database` methods or `getWebState()`
- ❌ **No migration system**: Schema changes require manual updates on both platforms
- ❌ **No data validation on write**: Database operations don't validate input
- ❌ **No error boundaries**: Database failures crash silently or propagate uncaught

#### Data Models (`database/types.ts`)
- EventRecord, RegistrationRecord, FavoriteRecord, LlmResultRecord, SessionRecord

**Issues Identified:**
- ❌ **No validation schemas**: Types are TypeScript interfaces, not runtime validators
- ❌ **Inconsistent timestamps**: Stored as ISO strings, no timezone handling

#### Session Management (`database/session.ts` / `database/session.web.ts`)
- Stores single session row with userId, role, createdAt
- Loaded on app initialization in `AuthContext`

**Issues Identified:**
- ❌ **No multitenancy**: Both admin and student roles use same database
- ❌ **No audit logging**: No history of who logged in/out and when
- ❌ **Session coupling**: App state and database are decoupled but must stay in sync

### 4. **Services Layer** (`services/`)

#### LLM Service (`services/llm.ts`)
Provides 4 assistant types:
- `search` - Find events by query
- `recommendation` - Suggest events based on user profile
- `planning` - Create event itineraries
- `qa` - Answer questions about events

**Issues Identified:**
- ❌ **Hardcoded student profiles**: Only one enriched profile for `etudiant@campus.ma` (line 49)
- ❌ **Incomplete implementation**: Core service functions not shown; likely using mock/stub data
- ❌ **No API key validation**: LLM API key stored in localStorage without validation
- ❌ **No rate limiting**: Unlimited LLM API calls possible, no cost control
- ❌ **Poor error handling**: JSON parsing errors with generic messages
- ❌ **No retry mechanism**: Failed API calls fail immediately without retries
- ❌ **No timeout handling**: Long-running requests could hang

### 5. **UI Components** (`components/`, `app/(tabs)/`)

Student views consume data from:
- `listEvents()`, `getEventById()` from database/events.ts
- `getFavoriteEventIds()` from database/favorites.ts
- `getRegistrations()` from database/registrations.ts
- LLM assistant via services/llm.ts

**Issues Identified:**
- ❌ **No loading states**: UI doesn't show loading indicators during async operations
- ❌ **No error UI**: Failures render nothing or crash the screen
- ❌ **No pagination**: All events loaded into memory at once
- ❌ **No optimistic updates**: UI doesn't update before confirmation

---

## Critical Issues & Mistakes

### 🔴 **Security Issues**

| Issue | Severity | Details |
|-------|----------|---------|
| **No Role-Based Access Control** | CRITICAL | Admin routes not protected; any student can navigate to `/admin` and see/modify all events |
| **Hardcoded Demo Credentials** | HIGH | Demo users visible in source code and UI; no real auth |
| **No Input Validation** | HIGH | Event creation accepts any input without validation |
| **API Key in Client Storage** | HIGH | LLM API key stored in localStorage/SQLite; exposed to client-side access |
| **No CORS/Request Signing** | HIGH | LLM requests lack authentication headers or request signing |

### 🟡 **Architectural Issues**

| Issue | Severity | Details |
|---|---|---|
| **Platform-Specific Database Implementations** | HIGH | Web and native databases have different semantics; bugs on one platform don't appear on other |
| **No Route Protection/Guards** | HIGH | Unauthenticated users or wrong roles can access protected screens |
| **Logout Broken** | HIGH | After logout, user stays on screen; logout doesn't redirect to login |
| **Shared Database Across Roles** | MEDIUM | No data isolation; admin and student see same raw database |
| **Auth State Sync Issues** | MEDIUM | Context state and database session can diverge; no sync mechanism |
| **LLM Integration Incomplete** | MEDIUM | Mock data or stubbed responses; not production-ready |

### 🟠 **Code Quality Issues**

| Issue | Severity | Details |
|---|---|---|
| **Hardcoded Demo Users in 3+ Places** | MEDIUM | `constants/users.ts`, `database/init.ts`, `database/web-store.ts` - DRY violation |
| **No Error Boundaries** | MEDIUM | Errors in screens crash entire app without fallback UI |
| **Missing Input Validation** | MEDIUM | Forms and DB operations don't validate before persisting |
| **No Rate Limiting** | MEDIUM | LLM service can make unlimited calls |
| **No Pagination** | MEDIUM | All events loaded into memory; poor performance at scale |
| **No Logging/Observability** | LOW | Errors logged to console; no structured logging or monitoring |
| **French Comments Mixed with English** | LOW | Code comments in French make it harder for international teams |

### 🔵 **Missing Features**

| Feature | Impact | Details |
|---|---|---|
| **Real Authentication** | HIGH | Only demo/mock auth; no backend |
| **Backend API** | HIGH | All data stored locally; no sync across devices |
| **Image Upload** | MEDIUM | Event images are URLs only; no upload support |
| **Push Notifications** | MEDIUM | `expo-notifications` imported but not implemented |
| **Data Validation** | MEDIUM | No schema validation (Zod, Yup, etc.) |
| **Analytics** | LOW | No user behavior tracking or event logging |

---

## Data Flow Diagrams

### Authentication Flow (Current - Broken)

```
Login Screen → Auth Context (login) → Database (session write)
                    ↓
              Navigator Re-render
                    ↓
         Router.replace(path)
                    ↓
            Student/Admin Screen
                    ↓
    [User clicks logout]
                    ↓
        Auth Context (logout) → Database (session clear)
                    ↓
            Navigator Re-render
                    ↓
        ❌ NO REDIRECT - User stays on current screen
        ❌ Auth state broken - isAuthenticated = false but UI doesn't route
```

### Database Flow (Platform Mismatch)

```
Native:
  initDatabase() → SQLite (file-based) → SQL queries → TypeScript objects

Web:
  initDatabase() → localStorage (JSON string) → Manual parsing → TypeScript objects
  
❌ Different error modes, different serialization, different query semantics
```

### Event Retrieval (N+1 Query Pattern)

```
Tabs Screen
    ├─ listEvents() → Fetches all events
    ├─ For each event:
    │   ├─ getFavoriteEventIds() → Fetches all favorites (REPEATED!)
    │   ├─ getRegistrationsByUser() → Fetches all registrations (REPEATED!)
    │   └─ (Expensive filtering in JS)
    └─ Render UI

❌ O(n²) performance; could be single query with JOIN
```

---

## Database Schema Issues

### Current Schema
```sql
events (id, title, description, category, startDateTime, ...)
registrations (id, eventId, userId, status)
favorites (eventId, userId)
llm_results (id, userId, type, inputText, outputText)
sessions (id [1], userId, role)
app_settings (key, value)
```

### Problems
- ❌ **No unique constraint on (userId, eventId) in favorites** - Duplicates possible
- ❌ **registeredCount is denormalized** - Needs manual sync with registrations table
- ❌ **No indexes on userId** - Queries for user-specific data are slow
- ❌ **tags stored as JSON string** - Not queryable; should normalize
- ❌ **No data validation triggers** - Invalid dates or capacities stored
- ❌ **No audit/soft-delete** - Deleted events can't be recovered

---

## Recommendations

### Immediate Fixes (P0)
1. **Implement role-based route guards** - Protect `/admin` route
   ```typescript
   // In app/admin/_layout.tsx, add guard
   const { role } = useAuth();
   if (role !== 'admin') router.replace('/(tabs)');
   ```

2. **Fix logout navigation** - Replace missing router.replace()
   ```typescript
   const logout = useCallback(() => {
     logoutUser();
     router.replace('/'); // Missing in current code
   }, [router]);
   ```

3. **Implement error boundaries** - Wrap screens with error catch
   ```typescript
   // Add try-catch or error boundary component
   ```

### Short-term Fixes (P1)
4. **Consolidate demo users** - Single source of truth
5. **Implement input validation** - Use Zod or similar library
6. **Add data persistence safety** - Transaction handling
7. **Separate platform concerns** - Abstract database layer
8. **Implement logout flow properly** - State + navigation sync

### Long-term Improvements (P2)
9. **Build real backend** - Replace localhost-only storage
10. **Implement proper auth** - JWT or OAuth2 instead of hardcoded users
11. **Add analytics & logging** - Monitor errors and user behavior
12. **Optimize queries** - Replace N+1 patterns with proper JOINs
13. **Add image upload** - Replace URL-only event images
14. **Implement push notifications** - Use expo-notifications properly
15. **Add pagination** - Handle large event lists efficiently
16. **Implement real-time sync** - WebSockets for multi-device sync

---

## Deployment Readiness Checklist

- [ ] Real authentication system implemented
- [ ] Role-based access control enforced
- [ ] All hardcoded values extracted to config
- [ ] Error handling and logging in place
- [ ] Input validation on all forms
- [ ] Database migrations system
- [ ] API key management (no client-side secrets)
- [ ] Rate limiting on LLM calls
- [ ] Cross-platform testing (iOS, Android, Web)
- [ ] Security audit completed
- [ ] Performance benchmarks (load test with 1000+ events)
- [ ] Offline-first sync strategy

---

## File Structure Summary

```
app/
├── _layout.tsx          ⚠️  DB init here, no error handling
├── index.tsx            ✅  Login screen, works correctly
├── (tabs)/
│   ├── _layout.tsx      ❌  Logout broken, no navigation
│   ├── index.tsx        ⚠️  No pagination, loads all events
│   ├── favorites.tsx    ⚠️  N+1 query pattern
│   ├── registrations.tsx ⚠️  N+1 query pattern
│   ├── assistant.tsx    ❌  LLM service incomplete
│   ├── profile.tsx      ✅  Simple display only
│   └── event/[id].tsx   ⚠️  No 404 handling
└── admin/
    ├── _layout.tsx      ❌  No role protection!
    ├── index.tsx        ❌  No role protection!
    └── event-form.tsx   ⚠️  No input validation

database/
├── init.ts              ⚠️  SQLite-specific, no abstraction
├── init.web.ts          ⚠️  Completely different implementation
├── web-store.ts         ⚠️  In-memory + localStorage hybrid
├── events.ts            ⚠️  N+1 queries, no filtering
├── session.ts           ⚠️  Single row, no audit log
├── types.ts             ⚠️  No runtime validation
└── seed-events.ts       ✅  Just data

services/
└── llm.ts               ❌  Incomplete, mock data, no error handling

context/
└── auth-context.tsx     ❌  No logout redirect, no route guards

constants/
├── theme.ts             ✅  Fine
└── users.ts             ❌  Hardcoded demo users (duplicated elsewhere)
```

---

## Conclusion

The app is a **proof-of-concept** rather than a production-ready system. The core issues are:

1. **No authorization** - Anyone can access admin
2. **No route protection** - Unauthenticated users can navigate anywhere
3. **Broken logout** - Users disconnected but not redirected
4. **No real backend** - Only offline/mock data
5. **Platform divergence** - Web and native databases are incompatible
6. **Incomplete LLM integration** - Appears to be stubbed

Before deploying to production, this architecture needs significant refactoring to add real authentication, authorization, input validation, error handling, and a proper backend service.
