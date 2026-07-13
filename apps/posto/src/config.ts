import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_API_URL = 'posto.apiBaseUrl';

const DEFAULT_API_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://10.0.2.2:4000';

let currentBase = DEFAULT_API_URL;

export async function loadApiBaseUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(KEY_API_URL);
    if (stored && stored.trim()) {
      currentBase = stored.replace(/\/$/, '');
    }
  } catch {
    // ignore
  }
  return currentBase;
}

export function getApiBaseUrl(): string {
  return currentBase;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  currentBase = url.replace(/\/$/, '');
  await AsyncStorage.setItem(KEY_API_URL, currentBase);
}

export function getDefaultApiBaseUrl(): string {
  return DEFAULT_API_URL;
}
