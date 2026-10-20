# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users
Case study: South Lhonak Lake and the Teesta valley, North Sikkim (Chungthang, Lachen, Mangan, Dikchu, Singtam). Default location is Chungthang. Shelters, flood corridor and agency feeds are demo data, not surveyed or official.

Downstream residents of Himalayan valleys threatened by Glacial Lake Outburst Floods (GLOF). They speak English, Hindi and Nepali, often have poor or no connectivity, and open the app under stress, to check the threat level, find a safe route or shelter, or call for help. Typical device: a mid-range phone. Local officials or responders are not confirmed as an audience.

## Product Purpose
Raha (Avalon) is a life-critical, mobile-first early warning system for GLOF. It shows the current threat level for upstream glacial lakes, simulates downstream flood paths, guides people to safe routes and shelters, and lets them dispatch an SOS. Success means a person at risk understands the danger and what to do within seconds, and reaches safety.

## Positioning
A GLOF-specific warning tool tied to named lakes, downstream reaches and flood-path simulation, with a satellite SOS and VHF radio fallback. A generic weather or alert app cannot truthfully offer this.

## Operating Context
- Used in emergencies and in calm preparedness moments alike.
- Connectivity is unreliable; data arrives through a product backend (REST, realtime updates, PostGIS spatial routing) and a Google Map view.
- Screens: Home (map plus status sheet), Map (2D/3D terrain and flood simulation), Navigate (route to safety), Activity, Profile (contacts, settings), SOS modal, onboarding.

## Capabilities and Constraints
- Expo / React Native app (Expo Router, Zustand, react-native-maps). Needs a development build; Expo Go is not enough.
- Must be trilingual: English, Hindi, Nepali (existing i18n).
- Critical information (threat level, safe routes, shelters) must tolerate low or no connectivity.
- Must be glanceable under stress: large targets, high contrast, plain language.
- SOS has an accidental-press guard, satellite dispatch, a VHF radio option and kin status. These stay central.
- Web is not a supported target; react-native-maps is native-only.

## Brand Commitments
- Name: Raha (Avalon in the repo README). Designed originally in Google Stitch, with Atkinson typography and theme tokens already in the codebase.

## Evidence on Hand
- Mock data and decoupled API adapters in `src/services/`. Lake, reach and geo data in `src/constants/`.
- No real testimonials, deployment partners or verified sensor data are recorded. Do not fabricate them.

## Product Principles
1. Safety first: the most important state is readable in one glance, never hidden behind decoration.
2. Plain language in three languages: no jargon or alarmism beyond what the data supports.
3. Works when the network doesn't: degrade gracefully and say what is stale.
4. Accidental harm is worse than friction: guard irreversible actions such as SOS.
5. Never invent data: show only real or clearly labelled mock readings.

## Accessibility & Inclusion
Users may be stressed, elderly, low-literacy or in poor light. Respect OS text scaling, Reduce Motion and dark mode, and do not rely on colour alone to convey threat level. No formal standard recorded.
