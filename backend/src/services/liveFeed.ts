// Live public-data feed for the North Sikkim case study.
// Every item carries its source and retrieval time. Nothing here is generated or simulated:
// if a source is unreachable its items are simply missing and the failure is reported in `sources`.

export type FeedCategory = 'weather' | 'quake' | 'news';

export interface FeedItem {
  id: string;
  category: FeedCategory;
  title: string;
  summary: string;
  /** Article paragraphs shown when the card is expanded. */
  body: string[];
  facts?: { label: string; value: string }[];
  source: { name: string; url: string };
  publishedAt: string;
  retrievedAt: string;
}

export interface FeedSourceStatus {
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface FeedResponse {
  generatedAt: string;
  items: FeedItem[];
  sources: FeedSourceStatus[];
}

const LAKE = { name: 'South Lhonak Lake', lat: 27.9125, lon: 88.2014 };
const SETTLEMENT = { name: 'Chungthang', lat: 27.6026, lon: 88.6446 };
const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 15000;

async function getText(url: string, userAgent = 'Mozilla/5.0 (compatible; RahaEWS/0.1)'): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': userAgent },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decodeEntities(m[1]).replace(/<[^>]+>/g, '').trim() : '';
}

const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// ---------- Weather: Open-Meteo (CC BY 4.0, https://open-meteo.com) ----------

interface MeteoResponse {
  elevation: number;
  current: { time: string; temperature_2m: number; precipitation: number; wind_speed_10m: number };
  hourly: { time: string[]; precipitation: number[]; freezing_level_height: number[] };
}

const sum = (a: number[]) => a.reduce((x, y) => x + (y ?? 0), 0);

async function weatherItem(place: { name: string; lat: number; lon: number }, retrievedAt: string): Promise<FeedItem> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    `&current=temperature_2m,precipitation,wind_speed_10m&hourly=precipitation,freezing_level_height` +
    `&past_days=1&forecast_days=4&timezone=Asia%2FKolkata`;
  const data = JSON.parse(await getText(url)) as MeteoResponse;

  const nowHour = `${data.current.time.slice(0, 13)}:00`;
  const i = data.hourly.time.findIndex((t) => t >= nowHour);
  if (i < 0) throw new Error('No hourly data for current time');
  const past24 = sum(data.hourly.precipitation.slice(Math.max(0, i - 24), i));
  const next24 = sum(data.hourly.precipitation.slice(i, i + 24));
  const next72 = sum(data.hourly.precipitation.slice(i, i + 72));
  const freezing = data.hourly.freezing_level_height[i];
  const r = (n: number, d = 1) => n.toFixed(d);

  return {
    id: `weather-${place.name.toLowerCase().replace(/\W+/g, '-')}`,
    category: 'weather',
    title: `Weather near ${place.name}: ${r(next24)} mm rain expected in the next 24 h`,
    summary: `${r(data.current.temperature_2m)} °C now. Rain: ${r(past24)} mm in the last 24 h, ${r(next24)} mm next 24 h, ${r(next72)} mm next 72 h.`,
    body: [
      `Model data for the grid point nearest ${place.name} (model elevation ${Math.round(data.elevation)} m). It is a weather model, not a rain gauge reading at the lake or town.`,
      `Right now it is ${r(data.current.temperature_2m)} °C with ${r(data.current.precipitation)} mm of precipitation in the current interval and wind at ${r(data.current.wind_speed_10m)} km/h.`,
      `Rainfall totals: ${r(past24)} mm over the previous 24 hours, ${r(next24)} mm forecast for the next 24 hours and ${r(next72)} mm for the next 72 hours.` +
        (Number.isFinite(freezing) ? ` The modelled freezing level is about ${Math.round(freezing)} m.` : ''),
    ],
    facts: [
      { label: 'Temperature', value: `${r(data.current.temperature_2m)} °C` },
      { label: 'Rain, last 24 h', value: `${r(past24)} mm` },
      { label: 'Rain, next 24 h', value: `${r(next24)} mm` },
      { label: 'Rain, next 72 h', value: `${r(next72)} mm` },
      ...(Number.isFinite(freezing) ? [{ label: 'Freezing level', value: `${Math.round(freezing)} m` }] : []),
    ],
    source: { name: 'Open-Meteo.com (weather model data, CC BY 4.0)', url },
    publishedAt: new Date(`${data.current.time}:00+05:30`).toISOString(),
    retrievedAt,
  };
}

// ---------- Earthquakes: USGS Earthquake Catalog ----------

interface UsgsFeature {
  id: string;
  properties: { mag: number; place: string; time: number; url: string; title: string };
  geometry: { coordinates: [number, number, number] };
}

async function quakeItems(retrievedAt: string): Promise<FeedItem[]> {
  const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const url =
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${LAKE.lat}&longitude=${LAKE.lon}` +
    `&maxradiuskm=300&minmagnitude=2.5&starttime=${start}&limit=10`;
  const data = JSON.parse(await getText(url)) as { features: UsgsFeature[] };

  if (data.features.length === 0) {
    return [
      {
        id: 'quake-none-30d',
        category: 'quake',
        title: 'No earthquakes of M2.5 or larger within 300 km of South Lhonak Lake in the last 30 days',
        summary: 'USGS catalog search returned no events.',
        body: [
          `The USGS Earthquake Catalog returned no events of magnitude 2.5 or larger within 300 km of ${LAKE.name} between ${start} and today.`,
          'Smaller or unreported events may not appear in this catalog.',
        ],
        source: { name: 'U.S. Geological Survey, Earthquake Catalog', url },
        publishedAt: retrievedAt,
        retrievedAt,
      },
    ];
  }

  return data.features
    .sort((a, b) => b.properties.time - a.properties.time)
    .map((f) => {
    const when = new Date(f.properties.time).toISOString();
    const depth = f.geometry.coordinates[2];
    return {
      id: `quake-${f.id}`,
      category: 'quake' as const,
      title: `M ${f.properties.mag.toFixed(1)} earthquake, ${f.properties.place}`,
      summary: `Depth ${depth.toFixed(0)} km. Within 300 km of South Lhonak Lake.`,
      body: [
        `USGS recorded a magnitude ${f.properties.mag.toFixed(1)} earthquake ${f.properties.place} at ${when}.`,
        `Estimated depth: ${depth.toFixed(0)} km. Magnitudes and locations are revised by USGS as more data arrives.`,
      ],
      facts: [
        { label: 'Magnitude', value: f.properties.mag.toFixed(1) },
        { label: 'Depth', value: `${depth.toFixed(0)} km` },
      ],
      source: { name: 'U.S. Geological Survey, Earthquake Catalog', url: f.properties.url },
      publishedAt: when,
      retrievedAt,
    };
  });
}

// ---------- News: Bing News RSS (snippets) + Google News RSS (recency) ----------

const NEWS_QUERIES = [
  'South Lhonak glacial lake',
  'Sikkim glacial lake outburst flood',
  'Teesta flood Sikkim',
];

// Keep only stories that are actually about the case-study area.
const REGION = /sikkim|lhonak|teesta|chungthang|lachen|lachung|mangan/i;
const HAZARD = /glacier|glacial|glof|lake|outburst|flood|landslide|cloudburst|monsoon|rain|earthquake|disaster|dam\b|hazard|warning/i;
// Match headline and excerpt only (not the outlet name, e.g. "Sikkimexpress").
const isRelevant = (it: FeedItem) => {
  const text = `${it.title} ${it.category === 'news' && it.body.length > 1 ? it.summary : ''}`;
  return REGION.test(text) && HAZARD.test(text);
};

function originalUrl(bingLink: string): string {
  const m = bingLink.match(/[?&]url=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : bingLink;
}

async function bingNews(query: string, retrievedAt: string): Promise<FeedItem[]> {
  const feed = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`;
  const xml = await getText(feed, 'Mozilla/5.0');
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const it = m[1];
    const title = tag(it, 'title');
    const snippet = tag(it, 'description');
    const url = originalUrl(decodeEntities(tag(it, 'link')));
    const source = tag(it, 'News:Source') || new URL(url).hostname;
    const published = new Date(tag(it, 'pubDate'));
    return {
      id: `news-${normTitle(title).slice(0, 60).replace(/ /g, '-')}`,
      category: 'news' as const,
      title,
      summary: snippet,
      body: snippet ? [snippet, `This is a search-result excerpt. The full article is published by ${source}.`] : [],
      source: { name: source, url },
      publishedAt: Number.isNaN(published.getTime()) ? retrievedAt : published.toISOString(),
      retrievedAt,
    };
  });
}

async function googleNews(retrievedAt: string): Promise<FeedItem[]> {
  const q = '("South Lhonak" OR "Sikkim GLOF" OR "Teesta flood") when:30d';
  const feed = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const xml = await getText(feed, 'Mozilla/5.0');
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const it = m[1];
    const full = tag(it, 'title');
    const source = tag(it, 'source') || 'Google News';
    const title = full.endsWith(` - ${source}`) ? full.slice(0, -(source.length + 3)) : full;
    const published = new Date(tag(it, 'pubDate'));
    return {
      id: `news-${normTitle(title).slice(0, 60).replace(/ /g, '-')}`,
      category: 'news' as const,
      title,
      summary: `Reported by ${source}.`,
      body: [`Headline from ${source}, found through Google News. Open the source to read the full article.`],
      source: { name: source, url: tag(it, 'link') },
      publishedAt: Number.isNaN(published.getTime()) ? retrievedAt : published.toISOString(),
      retrievedAt,
    };
  });
}

// ---------- Aggregation ----------

let cache: { at: number; value: FeedResponse } | null = null;

async function collect(name: string, job: () => Promise<FeedItem[]>): Promise<{ items: FeedItem[]; status: FeedSourceStatus }> {
  try {
    const items = await job();
    return { items, status: { name, ok: true, count: items.length } };
  } catch (e) {
    return { items: [], status: { name, ok: false, count: 0, error: (e as Error).message } };
  }
}

export async function getLiveFeed(forceRefresh = false): Promise<FeedResponse> {
  if (!forceRefresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const retrievedAt = new Date().toISOString();
  const results = await Promise.all([
    collect('Open-Meteo weather', async () => Promise.all([weatherItem(SETTLEMENT, retrievedAt), weatherItem(LAKE, retrievedAt)])),
    collect('USGS earthquakes', () => quakeItems(retrievedAt)),
    collect('Bing News', async () => (await Promise.all(NEWS_QUERIES.map((q) => bingNews(q, retrievedAt)))).flat()),
    collect('Google News', () => googleNews(retrievedAt)),
  ]);

  // Deduplicate news by normalised title; keep the first (Bing, which has snippets).
  const seen = new Set<string>();
  const items = results
    .flatMap((r) => r.items)
    .filter((it) => {
      const key = it.category === 'news' ? normTitle(it.title) : it.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((it) => it.category !== 'news' || isRelevant(it))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  // Keep every weather/quake item but cap news at the 20 most recent.
  let newsKept = 0;
  const trimmed = items.filter((it) => it.category !== 'news' || ++newsKept <= 20);

  const value: FeedResponse = { generatedAt: retrievedAt, items: trimmed, sources: results.map((r) => r.status) };
  // Only cache if something came back, so a transient total failure is retried next request.
  if (trimmed.length > 0) cache = { at: Date.now(), value };
  return value;
}
