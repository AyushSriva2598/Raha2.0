// Offline terrain + satellite tile packs, one per lake. Built by scripts/build-terrain-packs.mjs.
// Loaded lazily so a pack is only parsed when its lake is opened.
export interface TerrainPack {
  id: string;
  bounds: [number, number, number, number];
  center: [number, number];
  dem: { minzoom: number; maxzoom: number; tiles: Record<string, string> };
  sat: { minzoom: number; maxzoom: number; tiles: Record<string, string> };
}

export const TERRAIN_PACKS: Record<string, () => TerrainPack> = {
  south_lhonak: () => require('./south_lhonak.json') as TerrainPack,
  imja_tsho: () => require('./imja_tsho.json') as TerrainPack,
};
