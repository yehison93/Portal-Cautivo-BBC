// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAkfNGVeb9kmYcUutTjpcJR2hQ-f9HYO1o",
  authDomain: "portal-cautivo-bbc.firebaseapp.com",
  projectId: "portal-cautivo-bbc",
  storageBucket: "portal-cautivo-bbc.firebasestorage.app",
  messagingSenderId: "640658854261",
  appId: "1:640658854261:web:44c4f8627bd1504665433c",
  measurementId: "G-QMSC01J6ZL",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
