import { createJSONStorage, StateStorage } from 'zustand/middleware';

export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage quota or private-mode errors
    }
  }

  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
}

const IDB_NAME = 'yunpu_entity_cache';
const IDB_STORE = 'kv';

class IndexedDbAdapter implements StateStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFallback = new Map<string, string>();

  private openDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = window.indexedDB.open(IDB_NAME, 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
              db.createObjectStore(IDB_STORE);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  }

  async getItem(key: string): Promise<string | null> {
    const db = await this.openDb();
    if (!db) return this.memoryFallback.get(key) ?? null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => {
          const val = req.result;
          resolve(typeof val === 'string' ? val : null);
        };
        req.onerror = () => resolve(this.memoryFallback.get(key) ?? null);
      } catch {
        resolve(this.memoryFallback.get(key) ?? null);
      }
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    this.memoryFallback.set(key, value);
    const db = await this.openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async removeItem(key: string): Promise<void> {
    this.memoryFallback.delete(key);
    const db = await this.openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const defaultStorageAdapter: StorageAdapter = new LocalStorageAdapter();
export const asyncEntityStorageAdapter: StateStorage = new IndexedDbAdapter();

/** Fast synchronous storage for lightweight UI preferences & workspace metadata */
export const createAppStorage = <T>(
  adapter: StorageAdapter = defaultStorageAdapter
) => createJSONStorage<T>(() => adapter as StateStorage);

/** Non-blocking async IndexedDB storage for heavy domain entities (Lineage, Articles, Books) */
export const createAsyncEntityStorage = <T>() =>
  createJSONStorage<T>(() => asyncEntityStorageAdapter);
