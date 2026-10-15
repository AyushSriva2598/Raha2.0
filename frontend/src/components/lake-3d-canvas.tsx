import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { LakeConfig } from '@/constants/lakes';
import { DownstreamReachConfig } from '@/constants/downstreamReaches';

interface Lake3DCanvasProps {
  lake: LakeConfig;
  reach: DownstreamReachConfig;
  selectedYear: number;
  isSimulatingFlood: boolean;
  simulationProgress: number; // 0 to 100
  cameraPreset: 'moraine' | 'downstream' | 'ortho';
  isOrbiting: boolean;
  onSimulationProgressUpdate?: (progress: number) => void;
}

export function Lake3DCanvas({
  lake,
  reach,
  selectedYear,
  isSimulatingFlood,
  simulationProgress,
  cameraPreset,
  isOrbiting,
  onSimulationProgressUpdate,
}: Lake3DCanvasProps) {
  const webViewRef = useRef<WebView>(null);

  // Send updates to WebView whenever state changes
  useEffect(() => {
    if (webViewRef.current) {
      const message = JSON.stringify({
        type: 'UPDATE_STATE',
        lakeId: lake.id,
        selectedYear,
        isSimulatingFlood,
        simulationProgress,
        cameraPreset,
        isOrbiting,
      });
      webViewRef.current.postMessage(message);
    }
  }, [lake.id, selectedYear, isSimulatingFlood, simulationProgress, cameraPreset, isOrbiting]);

  // Generate self-contained HTML with MapLibre GL & 3D tabletop slab cutout
  const htmlContent = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>GLOoF 3D Basin Simulation</title>
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #0B0E12;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #map {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .hud-overlay {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(11, 14, 18, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 6px 10px;
      color: #38BDF8;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      pointer-events: none;
      backdrop-filter: blur(8px);
      z-index: 10;
    }
    .settlement-marker {
      background: rgba(15, 23, 42, 0.9);
      border: 1.5px solid #38BDF8;
      border-radius: 6px;
      padding: 3px 6px;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.6);
    }
    .settlement-marker.impacted {
      border-color: #EF4444;
      background: rgba(185, 28, 28, 0.95);
      animation: pulse 1s infinite alternate;
    }
    @keyframes pulse {
      from { transform: scale(1); }
      to { transform: scale(1.08); }
    }
    .maplibregl-ctrl-attrib { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="hud-overlay" id="hudBadge">3D TABLETOP DEM • 60 FPS</div>

  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>
    const LAKE_DATA = ${JSON.stringify(lake)};
    const REACH_DATA = ${JSON.stringify(reach)};

    let currentLakeId = LAKE_DATA.id;
    let selectedYear = ${selectedYear};
    let isSimulatingFlood = ${isSimulatingFlood ? 'true' : 'false'};
    let simulationProgress = ${simulationProgress};
    let cameraPreset = "${cameraPreset}";
    let isOrbiting = ${isOrbiting ? 'true' : 'false'};

    // Bounding slab cutouts
    const SLAB_BBOXES = {
      imja_tsho: [86.78, 27.81, 86.96, 27.94],
      south_lhonak: [88.14, 27.58, 88.68, 27.95]
    };

    const lakeCenter = LAKE_DATA.coordinates;
    const initialCut = SLAB_BBOXES[currentLakeId] || [lakeCenter[0] - 0.05, lakeCenter[1] - 0.05, lakeCenter[0] + 0.05, lakeCenter[1] + 0.05];

    // Initialize MapLibre GL 3D Map
    const map = new maplibreGl.Map({
      container: 'map',
      style: {
        version: 8,
        name: 'GloofSlab',
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256
          },
          'terrarium-dem': {
            type: 'raster-dem',
            tiles: [
              'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            encoding: 'terrarium'
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#0B0E12' }
          },
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            paint: { 'raster-opacity': 0.95 }
          },
          {
            id: 'hillshade-layer',
            type: 'hillshade',
            source: 'terrarium-dem',
            paint: {
              'hillshade-exaggeration': 0.8,
              'hillshade-shadow-color': '#0B0E12',
              'hillshade-highlight-color': '#BAE6FD'
            }
          }
        ]
      },
      center: lakeCenter,
      zoom: 12.8,
      pitch: 62,
      bearing: -35,
      maxPitch: 85
    });

    // Multi-year lake polygon snapshots (2018 to 2026 expansion)
    function generateLakePolygon(lakeId, year) {
      const center = LAKE_DATA.coordinates;
      const baseRadiusX = lakeId === 'imja_tsho' ? 0.011 : 0.014;
      const baseRadiusY = lakeId === 'imja_tsho' ? 0.0055 : 0.0068;
      
      // Growth factor: 2018 is baseline (1.0), 2026 is 1.35x
      const growth = 1.0 + ((year - 2018) / 8) * 0.35;
      const rx = baseRadiusX * growth;
      const ry = baseRadiusY * growth;

      const points = [];
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        // Natural shoreline wobble
        const noise = 1 + Math.sin(theta * 5) * 0.08 + Math.cos(theta * 9) * 0.04;
        const lng = center[0] + Math.cos(theta) * rx * noise;
        const lat = center[1] + Math.sin(theta) * ry * noise;
        points.push([lng, lat]);
      }
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [points]
        }
      };
    }

    // Inverted terrain mask to create the isolated tabletop slab cutout
    function buildInvertedMask(bbox) {
      const [west, south, east, north] = bbox;
      const worldRing = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
      const hole = [[west, south], [east, south], [east, north], [west, north], [west, south]];
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [worldRing, hole]
        }
      };
    }

    // Slab glowing border
    function buildSlabOutline(bbox) {
      const [west, south, east, north] = bbox;
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[west, south], [east, south], [east, north], [west, north], [west, south]]
        }
      };
    }

    // Settlement HTML markers
    const settlementMarkers = [];

    map.on('load', () => {
      // 1. Enable 3D DEM terrain with 1.6x vertical exaggeration
      map.setTerrain({ source: 'terrarium-dem', exaggeration: 1.6 });

      const cut = SLAB_BBOXES[currentLakeId] || initialCut;

      // 2. Add Tabletop Slab Inverted Mask & Glowing Edge
      map.addSource('slab-mask', {
        type: 'geojson',
        data: buildInvertedMask(cut)
      });
      map.addLayer({
        id: 'slab-mask-layer',
        type: 'fill',
        source: 'slab-mask',
        paint: {
          'fill-color': '#0B0E12',
          'fill-opacity': 0.94
        }
      });

      map.addSource('slab-outline', {
        type: 'geojson',
        data: buildSlabOutline(cut)
      });
      map.addLayer({
        id: 'slab-outline-layer',
        type: 'line',
        source: 'slab-outline',
        paint: {
          'line-color': '#38BDF8',
          'line-width': 2.5,
          'line-opacity': 0.8
        }
      });

      // 3. Add Lake Water Layer with Electric Blue
      map.addSource('lake-source', {
        type: 'geojson',
        data: generateLakePolygon(currentLakeId, selectedYear)
      });
      map.addLayer({
        id: 'lake-fill',
        type: 'fill',
        source: 'lake-source',
        paint: {
          'fill-color': '#3D9BFF',
          'fill-opacity': 0.88
        }
      });
      map.addLayer({
        id: 'lake-stroke',
        type: 'line',
        source: 'lake-source',
        paint: {
          'line-color': '#E0F2FE',
          'line-width': 2.5
        }
      });

      // 4. Downstream River Thalweg Centerline
      map.addSource('river-centerline', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: REACH_DATA.riverCenterline
          }
        }
      });
      map.addLayer({
        id: 'river-line',
        type: 'line',
        source: 'river-centerline',
        paint: {
          'line-color': '#0284C7',
          'line-width': 3,
          'line-opacity': 0.7
        }
      });

      // 5. Dynamic Flood Surge Wave Front Layer
      map.addSource('flood-surge', {
        type: 'geojson',
        data: getFloodSurgeGeoJSON(simulationProgress)
      });
      map.addLayer({
        id: 'flood-surge-glow',
        type: 'line',
        source: 'flood-surge',
        paint: {
          'line-color': '#EF4444',
          'line-width': 9,
          'line-opacity': 0.5,
          'line-blur': 4
        }
      });
      map.addLayer({
        id: 'flood-surge-core',
        type: 'line',
        source: 'flood-surge',
        paint: {
          'line-color': '#FCA5A5',
          'line-width': 4
        }
      });

      // 6. Mount Settlement Checkpoint Markers
      REACH_DATA.settlements.forEach((st) => {
        const el = document.createElement('div');
        el.className = 'settlement-marker';
        el.id = 'marker-' + st.id;
        el.innerHTML = st.name + ' • ' + st.surgeEtaMinutes + 'm';

        // Approximate location along reach
        const coordIndex = Math.min(
          REACH_DATA.riverCenterline.length - 1,
          Math.floor((st.distanceKm / REACH_DATA.totalLengthKm) * (REACH_DATA.riverCenterline.length - 1))
        );
        const markerCoord = REACH_DATA.riverCenterline[coordIndex] || lakeCenter;

        const marker = new maplibreGl.Marker({ element: el })
          .setLngLat(markerCoord)
          .addTo(map);
        settlementMarkers.push({ st, marker, el, distanceKm: st.distanceKm });
      });

      // Start animation loop for simulation & orbit
      requestAnimationFrame(renderLoop);
    });

    // Compute animated flood surge line based on progress percentage
    function getFloodSurgeGeoJSON(progress) {
      if (progress <= 0) {
        return { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } };
      }
      const coords = REACH_DATA.riverCenterline;
      const count = coords.length;
      const maxIdx = Math.max(1, Math.floor((progress / 100) * count));
      const subCoords = coords.slice(0, Math.min(count, maxIdx + 1));
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: subCoords
        }
      };
    }

    // Animation Render Loop
    let lastTime = performance.now();
    function renderLoop(time) {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Orbit camera slowly if enabled
      if (isOrbiting && map) {
        map.setBearing((map.getBearing() + 0.15) % 360);
      }

      // Flood Surge Animation Tick
      if (isSimulatingFlood) {
        simulationProgress = (simulationProgress + dt * 12) % 100;
        const surgeSource = map.getSource('flood-surge');
        if (surgeSource) {
          surgeSource.setData(getFloodSurgeGeoJSON(simulationProgress));
        }

        // Update settlement markers impacted state
        const currentSurgeDistance = (simulationProgress / 100) * REACH_DATA.totalLengthKm;
        settlementMarkers.forEach(({ st, el, distanceKm }) => {
          if (currentSurgeDistance >= distanceKm) {
            el.className = 'settlement-marker impacted';
            el.innerHTML = '🚨 ' + st.name + ' (FLOOD IMPACT)';
          } else {
            el.className = 'settlement-marker';
            const remainingMins = Math.max(1, Math.round(st.surgeEtaMinutes * (1 - currentSurgeDistance / distanceKm)));
            el.innerHTML = st.name + ' • ETA ' + remainingMins + 'm';
          }
        });

        // Notify React Native of tick
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SIMULATION_TICK',
            progress: Math.round(simulationProgress)
          }));
        }
      }

      requestAnimationFrame(renderLoop);
    }

    // Apply Camera Presets
    function applyCameraPreset(preset) {
      if (!map) return;
      if (preset === 'moraine') {
        map.flyTo({
          center: lakeCenter,
          zoom: 13.6,
          pitch: 65,
          bearing: -40,
          duration: 1500
        });
      } else if (preset === 'downstream') {
        const midIndex = Math.floor(REACH_DATA.riverCenterline.length * 0.35);
        const midPoint = REACH_DATA.riverCenterline[midIndex] || lakeCenter;
        map.flyTo({
          center: midPoint,
          zoom: 12.2,
          pitch: 72,
          bearing: 165,
          duration: 1500
        });
      } else if (preset === 'ortho') {
        map.flyTo({
          center: lakeCenter,
          zoom: 11.8,
          pitch: 0,
          bearing: 0,
          duration: 1500
        });
      }
    }

    // Handle React Native postMessages
    function handleMessage(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE_STATE') {
          selectedYear = data.selectedYear;
          isSimulatingFlood = data.isSimulatingFlood;
          isOrbiting = data.isOrbiting;
          if (data.simulationProgress !== undefined) {
            simulationProgress = data.simulationProgress;
          }
          if (data.cameraPreset && data.cameraPreset !== cameraPreset) {
            cameraPreset = data.cameraPreset;
            applyCameraPreset(cameraPreset);
          }

          // Update lake polygon if year changed
          const lakeSource = map.getSource('lake-source');
          if (lakeSource) {
            lakeSource.setData(generateLakePolygon(currentLakeId, selectedYear));
          }
        }
      } catch (err) {
        console.error('Bridge error:', err);
      }
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
  </script>
</body>
</html>
    `;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lake, reach]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webview}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        scalesPageToFit={true}
        scrollEnabled={false}
        bounces={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'SIMULATION_TICK' && onSimulationProgressUpdate) {
              onSimulationProgressUpdate(data.progress);
            }
          } catch {
            // Ignore parse errors
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E12',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0B0E12',
  },
});
