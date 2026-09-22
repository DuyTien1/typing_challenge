import { HighScoreRecord } from '../types';

const DB_NAME = 'fasttyping_idb';
const DB_VERSION = 2;

const STORES = {
  LEADERBOARD: 'leaderboard_store',
  MATCH_HISTORY: 'match_history_store',
  CULTIVATION: 'cultivation_store',
  GHOST_RUNS: 'ghost_runs_store',
} as const;

const RECORD_KEY = 'current_highscores';
const MATCH_HISTORY_KEY = 'match_history_list';
const CULTIVATION_KEY = 'cultivation_state';

const LEGACY_STORAGE_KEY = 'fasttyping_highscores';
const LEGACY_HISTORY_KEY = 'fasttyping_match_history';
const LEGACY_CULTIVATION_KEY = 'fasttyping_cultivation_state_v1';

export const DEFAULT_LEADERBOARD_FALLBACK: Record<string, HighScoreRecord | null> = {
  vi_dau: null,
  vi_nodau: null,
  en: null,
  numpad: null,
  outplay: null,
  ngau_hung: null,
  doan_chu: null,
  san_boss: null,
};

const MOCK_NAMES = new Set([
  'GiaCátGõ',
  'LướtGió',
  'QuickFox',
  'KếToánViên',
  'ChớpNhoáng',
  'ThámTửPhím',
  'DũngSĩRồng',
  'PhímThần_VN',
]);

function sanitizeRecords(
  data: any
): Record<string, HighScoreRecord | null> {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_LEADERBOARD_FALLBACK };
  }
  const hasMock = Object.values(data).some(
    (r: any) => r && typeof r === 'object' && MOCK_NAMES.has(r.username)
  );
  if (hasMock) {
    return { ...DEFAULT_LEADERBOARD_FALLBACK };
  }
  return { ...DEFAULT_LEADERBOARD_FALLBACK, ...data };
}

// In-memory hot caches for instant synchronous access (prevents UI flicker and eliminates synchronous disk I/O on Citrix VDI)
let inMemoryLeaderboardCache: Record<string, HighScoreRecord | null> = {
  ...DEFAULT_LEADERBOARD_FALLBACK,
};
let inMemoryMatchHistoryCache: any[] = [];
let inMemoryCultivationCache: any = null;
const inMemoryGhostCache = new Map<string, any>();

// One-time initial migration from localStorage if exists
if (typeof window !== 'undefined') {
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      inMemoryLeaderboardCache = sanitizeRecords(parsed);
    }
    const legacyHistory = localStorage.getItem(LEGACY_HISTORY_KEY);
    if (legacyHistory) {
      const parsed = JSON.parse(legacyHistory);
      if (Array.isArray(parsed)) inMemoryMatchHistoryCache = parsed;
    }
    const legacyCult = localStorage.getItem(LEGACY_CULTIVATION_KEY);
    if (legacyCult) {
      inMemoryCultivationCache = JSON.parse(legacyCult);
    }
  } catch {
    // ignore
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openLeaderboardDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported'));
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.LEADERBOARD)) {
          db.createObjectStore(STORES.LEADERBOARD);
        }
        if (!db.objectStoreNames.contains(STORES.MATCH_HISTORY)) {
          db.createObjectStore(STORES.MATCH_HISTORY);
        }
        if (!db.objectStoreNames.contains(STORES.CULTIVATION)) {
          db.createObjectStore(STORES.CULTIVATION);
        }
        if (!db.objectStoreNames.contains(STORES.GHOST_RUNS)) {
          db.createObjectStore(STORES.GHOST_RUNS);
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        const err = (event.target as IDBOpenDBRequest).error;
        reject(err || new Error('Failed to open IndexedDB'));
      };
    } catch (e) {
      reject(e);
    }
  });

  return dbPromise;
}

/**
 * Perform one-time migration from localStorage to IndexedDB in background,
 * then cleans up localStorage so synchronous I/O on Citrix VDI is permanently avoided.
 */
let hasMigrated = false;
export async function migrateLegacyLocalStorageToIndexedDB(): Promise<void> {
  if (hasMigrated || typeof window === 'undefined') return;
  hasMigrated = true;

  try {
    // 1. Leaderboard migration
    const rawLeaderboard = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLeaderboard) {
      const parsed = JSON.parse(rawLeaderboard);
      const clean = sanitizeRecords(parsed);
      inMemoryLeaderboardCache = clean;
      await saveLeaderboardToIndexedDB(clean);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      const idbData = await getLeaderboardFromIndexedDB();
      if (idbData) inMemoryLeaderboardCache = idbData;
    }

    // 2. Match History migration
    const rawHistory = localStorage.getItem(LEGACY_HISTORY_KEY);
    if (rawHistory) {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed)) {
        inMemoryMatchHistoryCache = parsed;
        await saveMatchHistoryToIndexedDB(parsed);
      }
      localStorage.removeItem(LEGACY_HISTORY_KEY);
    } else {
      const idbHistory = await getMatchHistoryFromIndexedDB();
      if (idbHistory) inMemoryMatchHistoryCache = idbHistory;
    }

    // 3. Cultivation migration
    const rawCult = localStorage.getItem(LEGACY_CULTIVATION_KEY);
    if (rawCult) {
      const parsed = JSON.parse(rawCult);
      inMemoryCultivationCache = parsed;
      await saveCultivationToIndexedDB(parsed);
      localStorage.removeItem(LEGACY_CULTIVATION_KEY);
    } else {
      const idbCult = await getCultivationFromIndexedDB();
      if (idbCult) inMemoryCultivationCache = idbCult;
    }

    // 4. Ghost runs migration
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('fasttyping_ghost_') || key.startsWith('ghost_'))) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            await saveGhostRunToIndexedDB(key, parsed);
          }
        } catch {}
      }
    }
  } catch {
    // Non-blocking fallback
  }
}

/**
 * LEADERBOARD STORAGE
 */
export function getLeaderboardSync(): Record<string, HighScoreRecord | null> {
  return inMemoryLeaderboardCache;
}

export async function getLeaderboardFromIndexedDB(): Promise<Record<string, HighScoreRecord | null>> {
  try {
    const db = await openLeaderboardDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORES.LEADERBOARD, 'readonly');
      const store = tx.objectStore(STORES.LEADERBOARD);
      const request = store.get(RECORD_KEY);

      request.onsuccess = () => {
        if (request.result) {
          const sanitized = sanitizeRecords(request.result);
          inMemoryLeaderboardCache = sanitized;
          resolve(sanitized);
        } else {
          resolve(inMemoryLeaderboardCache);
        }
      };

      request.onerror = () => resolve(inMemoryLeaderboardCache);
    });
  } catch {
    return inMemoryLeaderboardCache;
  }
}

export async function saveLeaderboardToIndexedDB(scores: Record<string, HighScoreRecord | null>): Promise<void> {
  const sanitized = sanitizeRecords(scores);
  inMemoryLeaderboardCache = sanitized;

  try {
    const db = await openLeaderboardDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.LEADERBOARD, 'readwrite');
      const store = tx.objectStore(STORES.LEADERBOARD);
      const request = store.put(sanitized, RECORD_KEY);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });

    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch {}
    }
  } catch {}
}

export async function clearLeaderboardFromIndexedDB(): Promise<void> {
  inMemoryLeaderboardCache = { ...DEFAULT_LEADERBOARD_FALLBACK };
  try {
    const db = await openLeaderboardDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.LEADERBOARD, 'readwrite');
      const store = tx.objectStore(STORES.LEADERBOARD);
      const request = store.delete(RECORD_KEY);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch {}
    }
  } catch {}
}

/**
 * MATCH HISTORY STORAGE
 */
export function getMatchHistorySync(): any[] {
  return inMemoryMatchHistoryCache;
}

export async function getMatchHistoryFromIndexedDB(): Promise<any[]> {
  try {
    const db = await openLeaderboardDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORES.MATCH_HISTORY, 'readonly');
      const store = tx.objectStore(STORES.MATCH_HISTORY);
      const request = store.get(MATCH_HISTORY_KEY);

      request.onsuccess = () => {
        if (Array.isArray(request.result)) {
          inMemoryMatchHistoryCache = request.result;
          resolve(request.result);
        } else {
          resolve(inMemoryMatchHistoryCache);
        }
      };

      request.onerror = () => resolve(inMemoryMatchHistoryCache);
    });
  } catch {
    return inMemoryMatchHistoryCache;
  }
}

export async function saveMatchHistoryToIndexedDB(records: any[]): Promise<void> {
  inMemoryMatchHistoryCache = records;
  try {
    const db = await openLeaderboardDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.MATCH_HISTORY, 'readwrite');
      const store = tx.objectStore(STORES.MATCH_HISTORY);
      const request = store.put(records, MATCH_HISTORY_KEY);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(LEGACY_HISTORY_KEY); } catch {}
    }
  } catch {}
}

export async function clearMatchHistoryFromIndexedDB(): Promise<void> {
  inMemoryMatchHistoryCache = [];
  try {
    const db = await openLeaderboardDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.MATCH_HISTORY, 'readwrite');
      const store = tx.objectStore(STORES.MATCH_HISTORY);
      const request = store.delete(MATCH_HISTORY_KEY);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(LEGACY_HISTORY_KEY); } catch {}
    }
  } catch {}
}

/**
 * CULTIVATION STATE STORAGE
 */
export function getCultivationSync(): any {
  return inMemoryCultivationCache;
}

export async function getCultivationFromIndexedDB(): Promise<any> {
  try {
    const db = await openLeaderboardDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORES.CULTIVATION, 'readonly');
      const store = tx.objectStore(STORES.CULTIVATION);
      const request = store.get(CULTIVATION_KEY);

      request.onsuccess = () => {
        if (request.result) {
          inMemoryCultivationCache = request.result;
          resolve(request.result);
        } else {
          resolve(inMemoryCultivationCache);
        }
      };

      request.onerror = () => resolve(inMemoryCultivationCache);
    });
  } catch {
    return inMemoryCultivationCache;
  }
}

export async function saveCultivationToIndexedDB(state: any): Promise<void> {
  inMemoryCultivationCache = state;
  try {
    const db = await openLeaderboardDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.CULTIVATION, 'readwrite');
      const store = tx.objectStore(STORES.CULTIVATION);
      const request = store.put(state, CULTIVATION_KEY);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(LEGACY_CULTIVATION_KEY); } catch {}
    }
  } catch {}
}

/**
 * GHOST RUN REPLAY STORAGE
 */
export function getGhostRunSync(key: string): any {
  if (inMemoryGhostCache.has(key)) {
    return inMemoryGhostCache.get(key);
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        inMemoryGhostCache.set(key, parsed);
        return parsed;
      }
    } catch {}
  }
  return null;
}

export async function saveGhostRunToIndexedDB(key: string, record: any): Promise<void> {
  inMemoryGhostCache.set(key, record);
  try {
    const db = await openLeaderboardDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.GHOST_RUNS, 'readwrite');
      const store = tx.objectStore(STORES.GHOST_RUNS);
      const request = store.put(record, key);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch {}
}
