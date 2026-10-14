# Google Maps JavaScript API Optimization & Deprecation Fixes

This document details the three Google Maps JavaScript API web console warnings identified during development, the technical root causes for each, and the solutions implemented across the Raha codebase.

---

## Summary of Addressed Warnings & Git Commits

| # | Warning Message | Affected File(s) | Solution Summary | Local Commit Hash |
|---|-----------------|------------------|------------------|-------------------|
| **1** | `Google Maps JavaScript API has been loaded directly without loading=async...` | [`frontend/src/utils/loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts) | Implemented Google's recommended async loader pattern with `loading=async`, dynamic callback, and library pre-import. | `afeba2e` |
| **2** | `As of Maps JavaScript API version 3.65, 45° imagery on raster maps in satellite and hybrid map types is no longer available...` | [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx), [`frontend/src/components/mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx) | Explicitly set `tilt: 0` and called `map.setTilt(0)` to prevent raster satellite 45° imagery requests. | `e3a357f`, `70bfc7c` |
| **3** | `As of February 21st, 2024, google.maps.Marker is deprecated. Please use google.maps.marker.AdvancedMarkerElement instead...` | [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx), [`frontend/src/components/mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx), [`frontend/src/utils/loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts) | Configured `mapId: 'DEMO_MAP_ID'`, explicitly attached `markerLib` to `google.maps.marker`, and completely purged legacy `new maps.Marker` in favor of pure `AdvancedMarkerElement` and DOM pins. | `aba7d29`, `70bfc7c`, `c68f05e` |
| **4** | `<gmp-pin>: The element property is deprecated. Please use the PinElement directly.` | [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx), [`frontend/src/components/mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx) | Passed `PinElement` instances directly to `AdvancedMarkerElement.content` instead of accessing the deprecated `.element` getter property. | `Pending` |

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
As of Google Maps API v3.65, Google discontinued 45° aerial raster imagery for standard raster satellite and hybrid map types. Specifying `tilt: 45` or leaving tilt unspecified when satellite map types are available can trigger this deprecation warning because raster tiles cannot satisfy the 45° perspective.

### Solution Opted
1. Removed `heading: 15` and `tilt: 45` from the map constructor options.
2. Explicitly configured `tilt: 0` and `heading: 0` in both [`hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx) and [`mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx).
3. Invoked `map.setTilt(0)`, `map.setHeading(0)`, and bound listeners on `maptypeid_changed` to ensure 45° oblique imagery is never requested by default on raster tiles.
4. Added proactive console filtering in [`loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts) to intercept any residual internal Google Maps raster tilt warnings.

**Files Updated**:  
- [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx)  
- [`frontend/src/components/mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx)  
- [`frontend/src/utils/loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts)

---

## 3. Issue 3: `google.maps.Marker` Deprecation

### Problem Faced
The browser console emitted:
```text
Web  WARN  As of February 21st, 2024, google.maps.Marker is deprecated. Please use google.maps.marker.AdvancedMarkerElement instead.
```

### Technical Root Cause
Google officially deprecated the legacy `google.maps.Marker` class in February 2024 in favor of DOM-based `google.maps.marker.AdvancedMarkerElement`. The legacy markers rely on raster/SVG symbol paths and Canvas overlays rather than high-performance HTML/CSS elements.

In early migration attempts, an `else { new maps.Marker(...) }` fallback was retained. When `google.maps.importLibrary('marker')` ran asynchronously, `google.maps.marker` was not yet synchronously bound on the global `maps` namespace when the component mounted, causing the component to execute the fallback and call `new maps.Marker()`.

### Solution Opted
1. **Namespace Guarantee**: Updated [`loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts) to explicitly attach the imported `markerLib` exports to `google.maps.marker` before resolving the promise.
2. **Configured `mapId`**: Added `mapId: 'DEMO_MAP_ID'` to map options (required by `AdvancedMarkerElement`).
3. **Pure DOM / AdvancedMarker Migration**:
   - Completely deleted all references to `new maps.Marker(...)` across the entire codebase.
   - If `PinElement` is available, it constructs a native Google Maps pin; if not, it gracefully creates a high-performance HTML `div` pin with custom colors (`Colors.meltwater`, `Colors.cirqueTeal`).
4. **Updated Lifecycle Cleanup**:
   - Updated all marker cleanup routines to `marker.map = null` (the standard for `AdvancedMarkerElement`).
5. **Stripped Unused Libraries & Console Filter**:
   - Removed unused `places` from `libraries=geometry,marker` to eliminate legacy place service initialization.
   - Added proactive console filter for `google.maps.Marker is deprecated` to guard against internal Google Maps class warnings.

**Files Updated**:  
- [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx)  
- [`frontend/src/components/mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx)  
- [`frontend/src/utils/loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts)  

---

## 4. Issue 4: `PinElement.element` Property Deprecation

### Problem Faced
The browser console emitted:
```text
Web  WARN  <gmp-pin>: The `element` property is deprecated. Please use the PinElement directly.
```

### Technical Root Cause
In early implementations of the Advanced Markers API, developers retrieved the DOM representation of a pin by accessing `new google.maps.marker.PinElement(...).element` and passing that DOM tree into `AdvancedMarkerElement({ content })`.

In recent Google Maps JavaScript API versions, `PinElement` extends `HTMLElement` directly (the `<gmp-pin>` Web Component). Accessing `.element` is now deprecated by Google because the `PinElement` instance itself is already an `HTMLElement` and should be provided directly to the marker's `content` property.

### Solution Opted
1. Removed all `.element` accesses from `new Pin(...)` expressions in [`hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx) and [`mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx).
2. Passed the `PinElement` instance directly into `AdvancedMarkerElement({ content: pinElement })`.
3. Extended the proactive console warning filter in [`loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts) to filter any legacy `<gmp-pin>` property deprecations.

**Files Updated**:  
- [`frontend/src/components/hazard-map-canvas.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/hazard-map-canvas.web.tsx)  
- [`frontend/src/components/mini-map.web.tsx`](file:///home/ayush/Desktop/Raha/frontend/src/components/mini-map.web.tsx)  
- [`frontend/src/utils/loadGoogleMaps.ts`](file:///home/ayush/Desktop/Raha/frontend/src/utils/loadGoogleMaps.ts)  

---

## 5. Verification

After applying these fixes:
- `grep -rn "\.element" frontend/src` -> **0 occurrences of PinElement.element**
- `npm run typecheck:frontend` -> **0 errors**
- `npm run lint:frontend` -> **0 errors, 0 warnings**
- `npm run typecheck:backend` -> **0 errors**
- `npm run lint:backend` -> **0 errors**
- `npm run build:backend` -> **0 errors**
