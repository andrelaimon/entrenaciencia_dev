const STORAGE_KEY = 'ecc_email';

export function saveEmail(email: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, email);
  }
}

export function getSavedEmail(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY);
  }
  return null;
}

export function hasEmail(): boolean {
  return getSavedEmail() !== null;
}
