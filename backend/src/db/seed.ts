import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { SEED_LAKES, SEED_SAFE_POINTS, SEED_ASSESSMENTS } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function seed() {
  console.log(`🌱 Connecting to PostgreSQL at ${config.databaseUrl}...`);
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    console.log('📜 Executing schema.sql migrations...');
    await pool.query(schemaSql);
    console.log('✅ Schema tables and spatial extensions verified.');

    // Seed Lakes
    for (const lake of SEED_LAKES) {
      await pool.query(
        `INSERT INTO lakes (id, name, basin, country, elevation_m, coordinates, volume_million_m3, last_satellite_pass)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           elevation_m = EXCLUDED.elevation_m,
           volume_million_m3 = EXCLUDED.volume_million_m3;`,
        [
          lake.lakeId,
          lake.name,
          lake.downstreamBasin,
          lake.country,
          lake.elevationM,
          lake.longitude,
          lake.latitude,
          lake.volumeMillionM3,
          lake.lastSatellitePass,
        ]
      );
    }
    console.log(`✅ Seeded ${SEED_LAKES.length} glacial lakes with PostGIS Point geometries.`);

    // Seed Zones
    await pool.query(
      `INSERT INTO zones (id, lake_id, name, basin, elevation_m, distance_from_lake_km, population_estimate, arrival_window_min, arrival_window_max)
       VALUES ('chungthang-zone', 'south-lhonak', 'Chungthang Valley Floodplain', 'Teesta River Basin', 1790, 55, 650, 35, 65)
       ON CONFLICT (id) DO NOTHING;`
    );

    // Seed Safe Points
    for (const sp of SEED_SAFE_POINTS) {
      await pool.query(
        `INSERT INTO safe_points (id, zone_id, name, type, location, elevation_m, elevation_gain_m, walking_time_minutes, capacity, contact_phone, notes)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           notes = EXCLUDED.notes;`,
        [
          sp.pointId,
          sp.zoneId,
          sp.name,
          sp.type,
          sp.coordinates.longitude,
          sp.coordinates.latitude,
          sp.elevationGainM + 1790,
          sp.elevationGainM,
          sp.walkingTimeMinutes,
          sp.capacityPct,
          sp.contactPhone,
          sp.notes,
        ]
      );
    }
    console.log(`✅ Seeded ${SEED_SAFE_POINTS.length} safe evacuation shelters.`);

    // Seed initial assessment
    const active = SEED_ASSESSMENTS.CLEAR;
    await pool.query(
      `INSERT INTO lake_assessments (lake_id, level, headline, instruction, arrival_window, outflow_rate_m3s, lake_area_change_pct, contributing_factors, summary_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        active.lakeId,
        active.level,
        active.headline,
        active.instruction,
        active.arrivalWindow,
        active.outflowRateM3s,
        active.lakeAreaChangePct,
        active.contributingFactors,
        active.instruction,
      ]
    );
    console.log('✅ Seeded initial baseline assessment.');

    console.log('🎉 Database seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seed();
