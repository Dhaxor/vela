// Vision board cards: photos and written goals. Photos are copied into the
// app's document directory on native — picker URIs live in caches iOS may
// clear — and kept as-is on web, where sessions are ephemeral anyway.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORE_KEY = "vela.board.v1";
const MAX_CARDS = 200;

export type BoardCard =
  | { id: string; kind: "photo"; uri: string; caption: string; createdAt: string }
  | { id: string; kind: "goal"; text: string; createdAt: string };

interface BoardValue {
  ready: boolean;
  cards: BoardCard[];
  addPhoto: (pickedUri: string, caption: string) => Promise<void>;
  addGoal: (text: string) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
}

const Ctx = createContext<BoardValue | null>(null);

const newId = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

async function persistPhoto(pickedUri: string, id: string): Promise<string> {
  if (Platform.OS === "web") return pickedUri;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
    const ext = pickedUri.includes(".") ? pickedUri.split(".").pop()!.split("?")[0] : "jpg";
    const dest = new File(Paths.document, `board-${id}.${ext}`);
    await new File(pickedUri).copy(dest);
    return dest.uri;
  } catch {
    // fall back to the picker URI; worst case iOS clears it and the card
    // shows its caption on a tinted ground instead of the photo
    return pickedUri;
  }
}

function parse(raw: string | null): BoardCard[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? (p as BoardCard[]) : [];
  } catch {
    return [];
  }
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<BoardCard[]>([]);

  useEffect(() => {
    let stale = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (!stale) setCards(parse(raw));
      } catch {
        // first run
      } finally {
        if (!stale) setReady(true);
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  const persist = useCallback(async (next: BoardCard[]) => {
    setCards(next);
    try {
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      // session state still stands
    }
  }, []);

  const addPhoto = useCallback(
    async (pickedUri: string, caption: string) => {
      const id = newId();
      const uri = await persistPhoto(pickedUri, id);
      const card: BoardCard = {
        id,
        kind: "photo",
        uri,
        caption: caption.trim().slice(0, 60),
        createdAt: new Date().toISOString(),
      };
      await persist([card, ...cards].slice(0, MAX_CARDS));
    },
    [cards, persist]
  );

  const addGoal = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, 120);
      if (!trimmed) return;
      const card: BoardCard = {
        id: newId(),
        kind: "goal",
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      await persist([card, ...cards].slice(0, MAX_CARDS));
    },
    [cards, persist]
  );

  const removeCard = useCallback(
    async (id: string) => {
      await persist(cards.filter((c) => c.id !== id));
    },
    [cards, persist]
  );

  const value = useMemo<BoardValue>(
    () => ({ ready, cards, addPhoto, addGoal, removeCard }),
    [ready, cards, addPhoto, addGoal, removeCard]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBoard(): BoardValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBoard must be used inside BoardProvider");
  return v;
}
