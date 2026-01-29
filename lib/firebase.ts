import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPeHmz92Nrgb7uqx8xRz71u0E4OhdEJBg",
  authDomain: "mapslocation-fc610.firebaseapp.com",
  projectId: "mapslocation-fc610",
  storageBucket: "mapslocation-fc610.firebasestorage.app",
  messagingSenderId: "270513964089",
  appId: "1:270513964089:web:993a4fde4321a886df79e8",
  measurementId: "G-N5CMTG1WH4"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
