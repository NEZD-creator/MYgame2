import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test connection and error handling
export const handleFirestoreError = (error: any, operation: string, path: string | null) => {
    const errInfo = {
        error: error.message || String(error),
        operation,
        path,
        auth: {
            uid: auth.currentUser?.uid,
            isAnonymous: auth.currentUser?.isAnonymous
        }
    };
    console.error("Firestore Error:", JSON.stringify(errInfo));
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
    onAuthStateChanged, 
    collection, 
    query, 
    orderBy, 
    limit, 
    onSnapshot, 
    doc, 
    setDoc, 
    serverTimestamp 
};
