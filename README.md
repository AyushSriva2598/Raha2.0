# Raha (Avalon) — Glacial Threat Early Warning System

A life-critical, mobile-first Early Warning System (EWS) for downstream Himalayan communities threatened by Glacial Lake Outburst Floods (GLOF). Designed in Google Stitch and implemented with React Native / Expo.

---

## 📁 Repository Structure

```
.
├── frontend/                  # Complete Expo / React Native mobile application
│   ├── src/
│   │   ├── app/               # Expo Router file-based screens (_layout, (tabs), modal, etc.)
│   │   ├── components/        # UI components (HazardMapCanvas, MiniMap, NavigationBar, etc.)
│   │   ├── constants/         # Design system tokens (colors, typography, spacing per Stitch)
│   │   ├── i18n/              # Multilingual translations (English, Hindi, Nepali)
│   │   ├── services/          # Decoupled API interface (mockData + AppSync GraphQL adapter)
│   │   ├── store/             # Zustand state management (threat level, safe routes, contacts)
│   │   └── types/             # Domain TypeScript interfaces (GLOF, shelters, sensors)
│   ├── assets/                # Local static assets and icons
│   ├── app.json               # Expo configuration
│   ├── package.json           # Frontend dependencies
│   ├── tsconfig.json          # TypeScript strict configuration
│   └── eslint.config.js       # ESLint configuration
├── backend/                   # Lightweight Product Backend (Express + WS + PostGIS + AWS Bridge)
│   ├── src/
│   │   ├── config/            # Server configuration & environment variables
│   │   ├── db/                # PostGIS schema, spatial migrations, seed data & store
│   │   ├── routes/            # REST API endpoints (assessments, safe points, SOS, auth)
│   │   ├── services/          # Realtime SSE/WS broadcasting & spatial routing logic
│   │   └── server.ts          # Server entry point (REST + WebSockets)
│   ├── package.json           # Backend dependencies
│   └── tsconfig.json          # Backend TypeScript configuration
└── implementation_plan_backend.md # Architecture plan for MapLibre & decoupled backend
```

---

## 🚀 Quick Start & Daily Workflow

> 📖 **Full Workflow & Network Guide**: See [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) for details on zero-rebuild fast refresh, USB `adb reverse`, and EAS builds.

### 1. Run Mobile Dev Client (Physical Android Phone)

```bash
# Connect phone via USB, then run from root:
npm run start:dev

# Or run both backend & mobile frontend concurrently:
npm run dev:mobile
```
*(Automatically sets up `adb reverse` for port `4000` backend and port `8081` Metro).*

### 2. Run Product Backend

```bash
npm run start:backend   # Starts backend on http://localhost:4000
npm run build:backend   # Compiles backend TypeScript
```

### 3. Verification & Typechecks

```bash
npm run typecheck:frontend
npm run lint:frontend
npm run typecheck:backend
npm run lint:backend
```

---

## 🏔️ Core Features

1. **4 Action-Based Threat Levels**:
   - `Clear`: Routine monitoring, lake status stable.
   - `Watch`: Elevated water levels, prepare equipment and check ridge trails.
   - `Warning`: Imminent breach threat detected, assemble kin and prepare evacuation packs.
   - `Evacuate`: High-velocity flood wave in transit, immediate high-ground evacuation route activated.
   - *(Zero numeric scores, zero confusing dials, maximum clarity for panic reduction).*

2. **Topographic Hazard Map & Safe Ridge Guidance**:
   - Vector contour terrain map with flood inundation corridors.
   - Real-time elevation tracking (`Namche Health Post +210m`, `Upper Ridge Gompa +340m`, etc.).
   - Interactive high-ground safe shelter dossiers with elevation gain, capacity, and uphill gradients.
   - Simulated live compass guidance towards designated safe ridges.

3. **Multilingual Himalayan Localization**:
   - Full toggle between **English**, **Hindi (हिन्दी)**, and **Nepali (नेपाली)** for life-critical advisories.

4. **Emergency Kin Contacts & Community VHF Radio**:
   - Satellite distress notification toggles for designated family contacts.
   - Direct community station dialer (VHF Channel 07 · 146.520 MHz).

5. **Decoupled Backend Architecture**:
   - Clean `IGlacialThreatApiClient` interface in [`frontend/src/services/api.ts`](file:///Users/garv/Documents/Projects/Raha/frontend/src/services/api.ts).
   - Effortless swap between simulated offline mock data and live AWS AppSync GraphQL / IoT endpoints.
