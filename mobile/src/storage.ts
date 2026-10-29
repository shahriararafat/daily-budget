import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "budget_passcode";

type WebStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function webStore(): WebStore | null {
  if (Platform.OS !== "web") return null;
  const storage = (globalThis as { localStorage?: WebStore }).localStorage;
  return storage ?? null;
}

export async function readPasscode(): Promise<string | null> {
  const store = webStore();
  if (store) return store.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}

export async function savePasscode(passcode: string): Promise<void> {
  const store = webStore();
  if (store) {
    store.setItem(KEY, passcode);
    return;
  }
  await SecureStore.setItemAsync(KEY, passcode);
}

export async function clearPasscode(): Promise<void> {
  const store = webStore();
  if (store) {
    store.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
