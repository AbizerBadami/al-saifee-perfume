// ============================================================
// Firebase utility — REPLACED by API client
// This file is kept as a compatibility shim so any lingering
// imports don't break the build. All actual data operations
// now go through src/lib/api.ts
// ============================================================

// Export empty stubs for backwards compatibility
export const auth = null;
export const db = null;

export async function testFirebaseConnection(): Promise<boolean> {
  // No longer needed — the Worker API handles the database
  return false;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  throw new Error(`[Legacy] Firestore operation "${operationType}" on "${path}" — use the API client instead.`);
}
