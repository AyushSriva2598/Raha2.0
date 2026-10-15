# Raha Development Workflow & Architecture Guide

This guide details the daily developer workflow, network connectivity options (USB adb reverse vs. LAN vs. Tunnel), EAS build lifecycle, and security best practices for the Raha mobile application.

---

## 1. Daily Development Workflow (Zero Rebuilds)

> [!IMPORTANT]
> **You do NOT need to run EAS cloud builds for everyday development.**  
> As long as your development build APK is installed on your physical device, you only need to run the Metro dev server. All UI screens, React components, state changes, styles, hooks, and API integrations update instantly via Fast Refresh.

### Starting Dev Servers

```bash
# Option 1: Start both backend and mobile dev-client concurrently from the root directory
npm run dev:mobile

# Option 2: Or start them in separate terminal tabs:
# Terminal 1: Backend
npm run start:backend

# Terminal 2: Frontend Dev Client
npm run start:dev
# (Equivalent to: npx expo start --dev-client inside frontend/)
```

Once Metro is running:
1. Open the **Raha** app on your Android phone.
2. If connected via USB, the app automatically connects to `http://localhost:8081`.
3. If on WiFi, enter your computer's local IP or scan the QR code from the terminal.

---

## 2. When is an EAS Rebuild Required?

You **ONLY** need to run an EAS build (`npx eas build --profile development --platform android`) when modifying **native code or native configurations**:

| Change Type | Rebuild Needed? | Reason |
|-------------|-----------------|--------|
| **React components / screens / UI / CSS** | ❌ **No** | Served dynamically via JavaScript bundle over Metro. |
| **Zustand store, logic, utils, i18n translations** | ❌ **No** | Handled by JavaScript bundle. |
| **Backend endpoints / API service calls** | ❌ **No** | Network calls from existing native fetch engine. |
| **Installing a pure JS library** (e.g. `lodash`, `date-fns`, `zustand`) | ❌ **No** | No native code needed. |
| **Installing a native module** (e.g. `expo-camera`, `expo-sensors`, `react-native-ble-plx`) | ✅ **Yes** | Requires new compiled Android `.so` / Java / Kotlin binaries. |
| **Changing `app.json` / `app.config.js` native properties** (permissions, package name, app icon, splash screen) | ✅ **Yes** | Requires regenerating `AndroidManifest.xml` and native resources. |
| **Upgrading Expo SDK** | ✅ **Yes** | Core native runtime changes. |

### How to Trigger an EAS Dev Rebuild

When you make one of the native changes above:
```bash
cd frontend
npx eas build --profile development --platform android
```
Download and install the generated `.apk` on your device once, and return to the daily workflow.

---

## 3. Network Connectivity & Preventing Backend 502s

When developing on a physical phone, the phone needs to reach your computer's backend (port `4000`).

### Method A: USB Cable with ADB Reverse (Recommended)
This is the fastest, lowest-latency, and most reliable method. It works completely offline with zero 502 Bad Gateway errors.

1. Connect your Android phone to your computer via USB (with **USB Debugging** enabled in Developer Options).
2. The `npm run start:dev` command automatically configures `adb reverse`:
   ```bash
   adb reverse tcp:4000 tcp:4000   # Bridges backend port 4000
   adb reverse tcp:8081 tcp:8081   # Bridges Metro bundler port 8081
   ```
   *(You can also run `npm run adb:reverse` manually at any time).*
3. In `frontend/.env`, keep:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:4000
   ```
   Your Android device now routes requests to `localhost:4000` directly across the USB cable into your local backend!

### Method B: LAN (Same Wi-Fi Network)
If testing without a USB cable:
1. Ensure both your computer and phone are connected to the same Wi-Fi router.
2. In `frontend/.env`, set:
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_COMPUTER_LAN_IP>:4000
   ```
   *(e.g., `http://192.168.1.15:4000`)*.
3. Start Metro with `npm run start:dev`.

### Method C: Ngrok Tunnel
If on cellular or restricted Wi-Fi (e.g. university or corporate networks):
1. **Never point `EXPO_PUBLIC_API_URL` to Metro's tunnel host**. Metro only serves JS assets and returns `502 Bad Gateway` for `/api/*` backend routes.
2. If exposing the backend via a separate ngrok tunnel (e.g. `ngrok http 4000`):
   Set the resulting public URL in `frontend/.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://<your-backend-tunnel>.ngrok-free.app
   ```

---

## 4. API Key Security & Restricting Google Maps

Never commit API keys or authentication tokens to version control.

### Secret Management
- `frontend/app.config.js` dynamically pulls `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` from `frontend/.env` (and from EAS build environment secrets in cloud builds).
- `frontend/app.json` contains no hardcoded credentials.

### Restricting Your Key in Google Cloud Console
To prevent quota theft while allowing native map tiles to render:

1. Open [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
2. Select your Google Maps API key.
3. Under **Application restrictions**, choose **Android apps**.
4. Add your application credentials:
   - **Package name**: `com.raha.hazardapp`
   - **SHA-1 certificate fingerprint**: `55:45:8F:75:05:98:8F:5A:DC:35:B2:88:F4:AA:B3:F8:54:2C:F8:9A`
5. Under **API restrictions**, restrict to:
   - `Maps SDK for Android`
   - `Maps JavaScript API` (for web support)
   - `Directions API` & `Elevation API` (for route planning)
6. Save and test on the mobile device.
