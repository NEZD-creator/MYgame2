import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, getDocFromServer, deleteDoc, disableNetwork } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Test connection and error handling
export let isQuotaExceededGlobal = false;

export const handleFirestoreError = (error: any, operation: string, path: string | null) => {
    const isQuotaError = error.code === 'resource-exhausted' || error.message?.includes('resource-exhausted') || error.message?.includes('Quota exceeded');
    
    if (isQuotaError) {
        if (!isQuotaExceededGlobal) {
            isQuotaExceededGlobal = true;
            try {
                disableNetwork(db);
                console.log("Global Firestore network shutdown triggered by quota exhaustion.");
            } catch(e) {
                console.error("Critical: Could not disable network", e);
            }
        }
    }

    const errInfo = {
        error: isQuotaError ? "Дневной лимит базы данных исчерпан. Пожалуйста, попробуйте завтра." : (error.message || String(error)),
        operation,
        path,
        auth: {
            uid: auth.currentUser?.uid,
            isAnonymous: auth.currentUser?.isAnonymous
        }
    };
    
    if (isQuotaError) {
        console.error("Firebase Quota Error: Daily limit reached.");
        // Custom event so App.tsx can show it
        window.dispatchEvent(new CustomEvent('auth-error-trigger', { detail: errInfo.error }));
    } else {
        console.error("Firestore Error:", JSON.stringify(errInfo));
    }
    
    return errInfo.error;
};

async function testConnection() {
    try {
        await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Firebase connection error: check configuration or internet");
        }
    }
}
testConnection();

export { 
    signInAnonymously, 
    signInWithPopup,
    onAuthStateChanged, 
    collection, 
    query, 
    orderBy, 
    limit, 
    onSnapshot, 
    doc, 
    setDoc, 
    updateDoc,
    serverTimestamp,
    deleteDoc 
};
