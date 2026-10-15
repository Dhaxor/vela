// The one storage seam for contexts: AsyncStorage (localStorage on web) read
// helpers, and per-store persist queues that write after ceremonies. Keys come
// only from lib/storageKeys. Never import this from lib/**.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { whenNoCeremony } from "@/lib/store/ceremony";
import { createPersistQueue, type PersistQueue } from "@/lib/store/persistQueue";

/** Raw value or null; unreadable storage reads as absent (first run). */
export async function readRaw(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Several raw values at once, in key order. */
export async function readMany(keys: readonly string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];
  try {
    const pairs = await AsyncStorage.multiGet([...keys]);
    const map = new Map(pairs);
    return keys.map((k) => map.get(k) ?? null);
  } catch {
    return keys.map(() => null);
  }
}

export async function allKeys(): Promise<readonly string[]> {
  try {
    return await AsyncStorage.getAllKeys();
  } catch {
    return [];
  }
}

export function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** A serialized, coalescing writer for one store. Writes wait for ceremonies to finish. */
export function createStoreQueue(): PersistQueue {
  return createPersistQueue({
    storage: {
      multiSet: (entries) => AsyncStorage.multiSet(entries),
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      multiRemove: (keys) => AsyncStorage.multiRemove(keys),
    },
    schedule: whenNoCeremony,
    onError: (e) => {
      if (__DEV__) console.warn("[vela] storage write failed; in-memory state stands", e);
    },
  });
}
