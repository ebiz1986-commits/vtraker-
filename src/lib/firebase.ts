import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { toast } from 'sonner';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = true) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  
  // Detect if the error is due to being offline, network transient failure, or service unavailable
  const isConnectionOrOffline = 
    errorMsg.toLowerCase().includes('unavailable') || 
    errorMsg.toLowerCase().includes('could not reach') ||
    errorMsg.toLowerCase().includes('offline') ||
    errorMsg.toLowerCase().includes('connection failed') ||
    errorMsg.toLowerCase().includes('internet connection') ||
    errorMsg.toLowerCase().includes('failed to get document because');

  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };

  if (isConnectionOrOffline) {
    console.warn(`[Firestore Transient Offline] Operation (${operationType}) on path (${path}): ${errorMsg}`);
    // Do not throw, do not show a blocking error toast since Firestore works offline and auto-syncs.
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Database Error (${operationType}): ${errInfo.error.substring(0, 100)}`);
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}
