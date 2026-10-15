export function safeReadStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (!value) {
      return fallback;
    }
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeWriteStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore failures in restricted/private storage contexts.
  }
}

export function safeRemoveStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore failures.
  }
}
