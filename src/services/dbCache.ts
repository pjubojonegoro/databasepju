const DB_NAME = 'pju_webgis_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'geojson_features';

export interface CacheEntry<T> {
  data: T;
  meta: {
    count: number;
    maxId: number;
    timestamp: number;
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e: Event) => {
      resolve((e.target as IDBOpenDBRequest).result);
    };

    request.onerror = (e: Event) => {
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Retrieve cached GeoJSON entry from IndexedDB
 */
export async function getCachedGeoJSON<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve((req.result as CacheEntry<T>) || null);
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Failed to read from IndexedDB cache:', err);
    return null;
  }
}

/**
 * Store GeoJSON data and metadata in IndexedDB
 */
export async function setCachedGeoJSON<T>(
  key: string,
  data: T,
  meta: { count: number; maxId: number }
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry: CacheEntry<T> = {
        data,
        meta: {
          ...meta,
          timestamp: Date.now(),
        },
      };
      store.put(entry, key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB cache:', err);
  }
}

/**
 * Clear cached data
 */
export async function clearGeoJSONCache(key?: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (key) {
        store.delete(key);
      } else {
        store.clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB cache:', err);
  }
}
