import * as SecureStore from 'expo-secure-store';
import type { Session } from '../api/types';

const KEY = 'som.session';

/** Bewaart de sessie versleuteld in de keychain/keystore. */
export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

/** Laadt een eerder opgeslagen sessie, of null. */
export async function loadSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/** Verwijdert de opgeslagen sessie (uitloggen). */
export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
