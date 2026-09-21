import { HighScoreRecord } from '../types';

const DB_NAME = 'fasttyping_idb';
const DB_VERSION = 1;
const STORE_NAME = 'leaderboard_store';
const RECORD_KEY = 'current_highscores';
const LEGACY_STORAGE_KEY = 'fasttyping_highscores';

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

// In-memory hot cache for instant synchronous access (prevents UI flicker and avoids synchronous disk I/O)
let inMemoryLeaderboardCache: Record<string, HighScoreRecord | null> = {
  ...DEFAULT_LEADERBOARD_FALLBACK,
};

// One-time initial migration from localStorage if exists
if (typeof window !== 'undefined') {
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      inMemoryLeaderboardCache = sanitizeRecords(parsed);
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
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
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const clean = sanitizeRecords(parsed);
      inMemoryLeaderboardCache = clean;
      await saveLeaderboardToIndexedDB(clean);
      // Remove synchronous localStorage key to eliminate roaming profile file locks
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      // Also ensure IndexedDB is read into memory cache on first load
      const idbData = await getLeaderboardFromIndexedDB();
      if (idbData) {
        inMemoryLeaderboardCache = idbData;
      }
    }
  } catch {
    // Non-blocking fallback
  }
}

/**
 * Synchronous cache getter: returns instant data without blocking main thread or waiting for async ticks.
 */
export function getLeaderboardSync(): Record<string, HighScoreRecord | null> {
  return inMemoryLeaderboardCache;
}

/**
 * Asynchronous reader from IndexedDB.
 */
export async function getLeaderboardFromIndexedDB(): Promise<Record<
  string,
  HighScoreRecord | null
>> {
  try {
    const db = await openLeaderboardDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
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

      request.onerror = () => {
        resolve(inMemoryLeaderboardCache);
      };
    });
  } catch {
    return inMemoryLeaderboardCache;
  }
}

/**
 * Asynchronous non-blocking writer to IndexedDB.
 * Updates in-memory cache immediately for UI responsiveness, then writes to IndexedDB in background.
 */
export async function saveLeaderboardToIndexedDB(
  scores: Record<string, HighScoreRecord | null>
): Promise<void> {
  const sanitized = sanitizeRecords(scores);
  inMemoryLeaderboardCache = sanitized;

  try {
    const db = await openLeaderboardDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(sanitized, RECORD_KEY);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (e) => {
        reject((e.target as IDBRequest).error);
      };
    });

    // Ensure legacy synchronous localStorage is removed
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {}
    }
  } catch {
    // In-memory cache is already updated, failsafe for restricted environments
  }
}

/**
 * Asynchronously clears leaderboard from IndexedDB and memory cache.
 */
export async function clearLeaderboardFromIndexedDB(): Promise<void> {
  inMemoryLeaderboardCache = { ...DEFAULT_LEADERBOARD_FALLBACK };

  try {
    const db = await openLeaderboardDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(RECORD_KEY);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (e) => {
        reject((e.target as IDBRequest).error);
      };
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {}
    }
  } catch {
    // ignore
  }
}
