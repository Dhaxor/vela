// The one storage seam for contexts: AsyncStorage (localStorage on web) read
// helpers, and per-store persist queues that write after ceremonies. Keys come
// only from lib/storageKeys. Never import this from lib/**.
//
// Reads THROW StorageReadError when storage answers with an error. A failed
// read is never 'absent': providers load through loadUntilRead and stay not
// ready (writing nothing) until a read succeeds (lib/store/storageRead).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { releaseAllCeremonies, whenNoCeremony } from "@/lib/store/ceremony";
import { createPersistQueue, type PersistQueue } from "@/lib/store/persistQueue";
import { readWithRetry } from "@/lib/store/storageRead";

export { isStorageReadError, loadUntilRead, StorageReadError } from "@/lib/store/storageRead";

/** Raw values in key order (null = nothing stored). Throws StorageReadError when storage could not be read. */
export async function readKeys(keys: readonly string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];
  const pairs = await readWithRetry(() => AsyncStorage.multiGet([...keys]));
  const map = new Map(pairs);
  return keys.map((k) => map.get(k) ?? null);
}

/** One raw value (null = nothing stored). Throws StorageReadError when storage could not be read. */
export async function readKey(key: string): Promise<string | null> {
  return (await readKeys([key]))[0];
}

/** Every stored key, or null when the listing failed (callers then skip garbage collection). */
export async function listKeys(): Promise<readonly string[] | null> {
  try {
    return await readWithRetry(() => AsyncStorage.getAllKeys());
  } catch {
    return null;
  }
}

/** One immediate write outside every queue. Only for launch-time safety copies. */
export async function writeRaw(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
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

/**
 * Leaving the foreground ends every ceremony hold and writes what was waiting
 * for it, so a proof saved just before the app is suspended (and maybe killed)
 * is on disk. Installed once, with the first store queue.
 */
let backgroundFlushInstalled = false;
function installBackgroundFlush(): void {
  if (backgroundFlushInstalled) return;
  backgroundFlushInstalled = true;
  try {
    AppState.addEventListener("change", (state) => {
      if (state === "inactive" || state === "background") releaseAllCeremonies();
    });
  } catch {
    // No AppState here: holds still expire on their own.
  }
}

/** A serialized, coalescing writer for one store. Writes wait for ceremonies to finish. */
export function createStoreQueue(): PersistQueue {
  installBackgroundFlush();
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
