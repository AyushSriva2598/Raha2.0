# Google Maps JavaScript API Optimization & Deprecation Fixes

This document details the three Google Maps JavaScript API web console warnings identified during development, the technical root causes for each, and the solutions implemented across the Raha codebase.

---

## Summary of Addressed Warnings & Git Commits

| # | Warning Message | Affected File(s) | Solution Summary | Local Commit Hash |
|---|-----------------|------------------|------------------|-------------------|
| **1** | `Google Maps JavaScript API has been loaded directly without loading=async...` | [`frontend/src/utils/loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts) | Implemented Google's recommended async loader pattern with `loading=async`, dynamic callback, and library pre-import. | `afeba2e` |
| **2** | `As of Maps JavaScript API version 3.65, 45° imagery on raster maps in satellite and hybrid map types is no longer available...` | [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx) | Removed deprecated `tilt: 45` and `heading: 15` from raster map configuration. | `e3a357f` |
| **3** | `As of February 21st, 2024, google.maps.Marker is deprecated. Please use google.maps.marker.AdvancedMarkerElement instead...` | [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx), [`frontend/src/components/mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx) | Configured `mapId: 'DEMO_MAP_ID'`, migrated to `google.maps.marker.AdvancedMarkerElement` and `PinElement`, and updated removal lifecycle. | `aba7d29` |

---

## 1. Issue 1: Direct Script Loading without `loading=async`

### Problem Faced
When loading the web application, the browser console emitted:
```text
Web  WARN  Google Maps JavaScript API has been loaded directly without loading=async. This can result in suboptimal performance. For best-practice loading patterns please see https://goo.gle/js-api-loading
```

### Technical Root Cause
The dynamic script injection in [`loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts) previously appended a standard `<script>` element with:
```typescript
script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,places`;
```
Google Maps JavaScript API v3 now checks whether `loading=async` or the bootstrap import callback `__ib__` is passed in the URL. If absent, the API synchronously blocks rendering and prints a performance warning.

### Solution Opted
1. Added `loading=async` and a unique callback query parameter `callback=${callbackName}` to the script URL.
2. Created a self-cleaning global callback `window[callbackName]` that executes once Google Maps finishes initializing.
3. Pre-imported required libraries (`maps`, `marker`, `geometry`) using `window.google.maps.importLibrary` inside the callback before resolving the promise.

**File Updated**: [`frontend/src/utils/loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts)  
**Commit**: `afeba2e` (`fix(maps): load Google Maps JavaScript API with loading=async and callback`)

---

## 2. Issue 2: 45° Oblique Imagery Deprecation on Raster Maps

### Problem Faced
The browser console emitted:
```text
Web  WARN  As of Maps JavaScript API version 3.65, 45° imagery on raster maps in satellite and hybrid map types is no longer available. For more info, see https://developers.google.com/maps/deprecations
```

### Technical Root Cause
In [`hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx), the map options were explicitly initialized with:
```typescript
heading: 15,
tilt: 45,
```
As of Google Maps API v3.65, Google discontinued 45° aerial raster imagery for standard raster satellite and hybrid map types. Specifying `tilt: 45` on raster maps triggers this deprecation warning because raster tiles cannot satisfy the 45° perspective.

### Solution Opted
Removed `heading: 15` and `tilt: 45` from the `maps.Map` constructor configuration in [`hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx), keeping the camera cleanly oriented for topographic terrain and satellite views without triggering raster tile deprecations.

**File Updated**: [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx)  
**Commit**: `e3a357f` (`fix(maps): remove deprecated 45 degree tilt on raster maps`)

---

## 3. Issue 3: `google.maps.Marker` Deprecation

### Problem Faced
The browser console emitted:
```text
Web  WARN  As of February 21st, 2024, google.maps.Marker is deprecated. Please use google.maps.marker.AdvancedMarkerElement instead.
```

### Technical Root Cause
Google officially deprecated the legacy `google.maps.Marker` class in February 2024 in favor of DOM-based `google.maps.marker.AdvancedMarkerElement`. The legacy markers rely on raster/SVG symbol paths and Canvas overlays rather than high-performance HTML/CSS elements.

Furthermore, `AdvancedMarkerElement` strictly requires that the hosting `google.maps.Map` be created with a `mapId`. Initializing an `AdvancedMarkerElement` without a `mapId` throws an error.

### Solution Opted
1. **Configured `mapId`**: Added `mapId: 'DEMO_MAP_ID'` to the map options in both [`hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx) and [`mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx).
2. **Migrated to `AdvancedMarkerElement` & `PinElement`**:
   - Replaced legacy `new maps.Marker({ ... icon: { path: maps.SymbolPath.CIRCLE } })` with `new maps.marker.AdvancedMarkerElement` paired with a customized `new maps.marker.PinElement`.
   - Used theme tokens for background colors (`Colors.meltwater` for user location pin, `Colors.cirqueTeal` and `#0F6CBD` for safe assembly points).
   - Preserved fallback to legacy `google.maps.Marker` for any older browser contexts where `maps.marker?.AdvancedMarkerElement` might not be initialized.
3. **Updated Marker Cleanup Lifecycle**:
   - Legacy markers are removed via `marker.setMap(null)`.
   - Advanced markers are removed via `marker.map = null`.
   - Updated cleanup loops and unmount handlers with type-safe guards:
     ```typescript
     markersRef.current.forEach((m) => {
       if ('setMap' in m && typeof m.setMap === 'function') {
         m.setMap(null);
       } else if ('map' in m) {
         (m as google.maps.marker.AdvancedMarkerElement).map = null;
       }
     });
     ```

**Files Updated**:  
- [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx)  
- [`frontend/src/components/mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx)  
**Commit**: `aba7d29` (`fix(maps): migrate from deprecated google.maps.Marker to AdvancedMarkerElement`)

---

## 4. Verification

After applying each change, the codebase was verified:
- `npm run typecheck:frontend` -> **0 errors**
- `npm run lint:frontend` -> **0 errors, 0 warnings**
- `npm run typecheck:backend` -> **0 errors**
- `npm run lint:backend` -> **0 errors**
- `npm run build:backend` -> **0 errors**
