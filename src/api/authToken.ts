/**
 * In-memory holder for the bearer token.
 *
 * Exists to break the cycle between the axios client (needs the token) and the
 * auth store (needs the client to log in). The store is the writer; the request
 * interceptor is the only reader. Persistence lives in expo-secure-store.
 */
let token: string | null = null;

export function setAuthToken(next: string | null): void {
  token = next;
}

export function getAuthToken(): string | null {
  return token;
}
