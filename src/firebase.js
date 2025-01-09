import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCz_95gXmBbZrIeA0bJsDPecPjYjvjJtr8",
  authDomain: "counselling-appointment.firebaseapp.com",
  databaseURL: "https://counselling-appointment-default-rtdb.firebaseio.com",
  projectId: "counselling-appointment",
  storageBucket: "counselling-appointment.firebasestorage.app",
  messagingSenderId: "601338151686",
  appId: "1:601338151686:web:7b2c3684da2d711b089487",
  measurementId: "G-B72P4067XK"
};



// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
