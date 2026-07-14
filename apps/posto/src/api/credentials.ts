import * as SecureStore from 'expo-secure-store';

const EMAIL_KEY = 'posto_saved_email';
const PASSWORD_KEY = 'posto_saved_password';

export interface SavedCredentials {
  email: string;
  password: string;
}

export async function getSavedCredentials(): Promise<SavedCredentials | null> {
  try {
    const [email, password] = await Promise.all([
      SecureStore.getItemAsync(EMAIL_KEY),
      SecureStore.getItemAsync(PASSWORD_KEY),
    ]);
    if (email && password) return { email, password };
    return null;
  } catch {
    return null;
  }
}

export async function saveCredentials(
  email: string,
  password: string,
): Promise<void> {
  await SecureStore.setItemAsync(EMAIL_KEY, email);
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function clearSavedCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(EMAIL_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(PASSWORD_KEY).catch(() => undefined);
}
