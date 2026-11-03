<div align="center">

# 🏔️ Raha

**An early warning app for people living below Himalayan glacial lakes. It tells them how serious the threat is, what to do, and the safest way to high ground, in English, Hindi and Nepali.**

[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)](https://docs.expo.dev/versions/v57.0.0/)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![Backend: Express + PostGIS](https://img.shields.io/badge/backend-Express%20%2B%20PostGIS-336791?logo=postgresql&logoColor=white)](backend/)
[![Pipeline: Sentinel-2](https://img.shields.io/badge/pipeline-Sentinel--2-2E7D32)](pipeline/)
[![Platforms](https://img.shields.io/badge/platforms-Android%20%C2%B7%20iOS-FF895E)](frontend/app.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

When a glacial lake bursts (a Glacial Lake Outburst Flood, or GLOF), the flood wave can reach villages downstream within minutes. Raha is built for the people in those villages. They often have a weak signal and are opening the app under stress, so every screen has to be understood in seconds.

- 🚦 **Four threat levels, no numbers**. Each lake is **Clear**, **Watch**, **Warning** or **Evacuate**, and each level says what to do now. There are no risk scores or dials to work out under stress.
- 🗺️ **A map that routes you away from the water**. It shows flood corridors, shelters and your position. Road routes are scored against the flood zones and can detour through a safe waypoint, with Google Maps as a fallback.
- 🛰️ **Lakes watched from orbit**. A pipeline turns Sentinel-2 satellite imagery into lake outlines and a risk timeline, which you can scrub through on a 3D terrain screen.
- 🆘 **SOS and family contacts**. The SOS button has a guard against accidental presses and alerts the kin you choose. Sign-in uses a one-time code sent to your phone number.
- 📻 **Radio when everything else is noise**. Search and play Indian and Nepali radio stations from inside the app.
- 🌐 **Three languages**. Every life-critical message is available in English, हिन्दी and नेपाली.

> [!WARNING]
> **Raha is not an official warning service yet.** The case study, South Lhonak Lake and the Teesta valley in North Sikkim, uses demo shelters, a demo flood corridor and demo agency feeds. The pipeline's risk thresholds are round-number placeholders that must be calibrated with the disaster-management authority before anyone relies on them.

## Get started in three steps

1. **Install the workspace** from the repository root:

   ```bash
   npm install
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env    # add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
   ```

2. **Install a development build on your phone.** Raha uses native modules (maps, audio, location), so Expo Go is not enough. Build one with `npx eas-cli@latest build --profile development`, or `npx expo run:android` from `frontend/`.

3. **Run the backend and the app together**, with the phone connected over USB:

   ```bash
   npm run dev:mobile    # backend on :4000 + Metro dev client, with adb reverse set up
   ```

After that, day-to-day changes reload instantly with Fast Refresh. You only need a new build when you add a native module. [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) covers USB, LAN and tunnel setups and the EAS build lifecycle.

## What the app looks like

| Screen | What it is for |
| --- | --- |
| **Home** | The map with a status sheet: the threat level, what to do now, and the nearest safe place |
| **Map** | Search, routes and a Start button in one draggable sheet, with flood corridors drawn on the map |
| **Terrain** | A 3D view of the lake and valley, with a timeline of how the lake has changed |
| **Safety** | Preparedness topics for calm moments, so people know the plan before they need it |
| **Activity** | A feed of weather, earthquake and news updates for the area, filterable by type |
| **Profile** and **Contacts** | Language, settings and the family members SOS will reach |
| **Radio** | Indian and Nepali stations, searchable |

## Threat levels

<details open>
<summary><b>🟢 Clear</b>. The lake is stable.</summary>

Routine monitoring. A good moment to read the Safety topics and check your contacts.

</details>

<details open>
<summary><b>🟡 Watch</b>. The water level is rising.</summary>

Get ready. Check your equipment and the trail up to the ridge.

</details>

<details open>
<summary><b>🟠 Warning</b>. A breach may be coming.</summary>

Gather your family and pack for evacuation.

</details>

<details open>
<summary><b>🔴 Evacuate</b>. A flood wave is on its way.</summary>

Go to high ground now, by the route the map gives you.

</details>

The pipeline never clears **Warning** or **Evacuate** on its own, and a hysteresis tracker stops the level from flapping between states.

## How it is built

```
  Sentinel-2 imagery (AWS Open Data)
            │
            ▼
  ┌───────────────────┐   public/<lake>.json   ┌──────────────────────┐   REST + realtime   ┌──────────────────┐
  │ pipeline/ Python  │ ─────────────────────▶ │ backend/ Express     │ ◀─────────────────▶ │ frontend/ Expo   │
  │ lake outlines,    │                        │ PostGIS, OTP auth,   │                     │ React Native app │
  │ risk timeline     │                        │ routing, SOS, alerts │                     │ (Expo Router)    │
  └───────────────────┘                        └──────────────────────┘                     └──────────────────┘
```

<details>
<summary><b>📱 frontend/</b>: the mobile app</summary>

Expo SDK 57 and React Native 0.86, with Expo Router for screens (`src/app/`), Zustand for state and `react-native-maps` for the map. Translations live in `src/i18n/`. The API sits behind a client interface in `src/services/`, so the app can run against mock data or the live backend: leave `EXPO_PUBLIC_API_URL` blank to use the mock data.

</details>

<details>
<summary><b>🖥️ backend/</b>: the product API</summary>

Express and TypeScript, using Postgres with PostGIS when `DATABASE_URL` is set and an in-memory store when it is not, so local work never needs a database. It serves lakes, alerts, assessments, safe points, road routing (OSRM behind a swappable provider), SOS, and phone sign-in with one-time codes. Updates are pushed over WebSocket and Server-Sent Events. Sending real SMS stays off until you set `SMS_PROVIDER=sns` and `SOS_LIVE=true`. See [backend/README.md](backend/README.md).

</details>

<details>
<summary><b>🛰️ pipeline/</b>: satellite imagery to risk</summary>

Python that finds Sentinel-2 scenes on Earth Search, reads only a small window around each lake, and extracts water and ice from the spectral indices with cloud masking. It then builds a risk timeline in which each frame is judged only on the frames before it, and publishes the JSON the app reads. It is adapted from the team's GLOoF project. See [pipeline/README.md](pipeline/README.md).

</details>

## What Raha is not

- ❌ **Not an official alert service**. Until the thresholds are calibrated with the authorities, treat its output as a demonstration.
- ❌ **Not a weather app**. Raha is tied to named glacial lakes, the river reaches below them and their flood paths. A general forecast cannot tell you that.
- ❌ **Not a web app**. The map is native-only, so Raha targets Android and iOS.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev:mobile` | Backend plus Metro dev client, for a phone connected over USB |
| `npm run dev` | Backend plus the standard Expo dev server |
| `npm run start:tunnel` | Metro over a tunnel, for when the phone is on another network |
| `npm run adb:reverse` | Forward ports 4000 and 8081 to a USB-connected Android phone |
| `npm run typecheck:frontend` · `npm run lint:frontend` | Check the app |
| `npm run typecheck:backend` · `npm run lint:backend` | Check the API |
| `npm run build:backend` | Compile the backend |

Run the typecheck and lint for whatever you changed before you commit.

## Repository layout

```
.
├── frontend/       Expo / React Native app (screens in src/app/)
├── backend/        Express + PostGIS product API
├── pipeline/       Sentinel-2 lake pipeline (Python)
└── DEVELOPMENT_WORKFLOW.md
```

## Contributing

Issues and pull requests are welcome, especially from people who know the valleys Raha is built for. When you change the app, keep its principles in mind: it is read under stress, often on a weak connection, by people who may not read English. [frontend/PRODUCT.md](frontend/PRODUCT.md) describes who it is for and what it must never do.

<div align="center">

Built by Ayush Srivastava

</div>
