import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export {app, db, auth};

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { User, TestResult, SurveyResponse, FinalSurvey } from "../utils/types";

// User functions
export const createUser = async (uid: string, userData: Partial<User>) => {
  await setDoc(doc(db, "users", uid), {
    ...userData,
    startTime: serverTimestamp(),
  });
};

export const getUser = async (uid: string) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? (userDoc.data() as User) : null;
};

export const updateUser = async (uid: string, data: Partial<User>) => {
  await updateDoc(doc(db, "users", uid), data);
};

// Test results functions
export const saveTestResult = async (
  testResult: Omit<TestResult, "testId" | "timestamp">
) => {
  const docRef = await addDoc(collection(db, "testResults"), {
    ...testResult,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
};

export const getTestResults = async (userId: string) => {
  const q = query(collection(db, "testResults"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    testId: doc.id,
    ...doc.data(),
  })) as TestResult[];
};

// Survey functions
export const saveSurveyResponse = async (
  survey: Omit<SurveyResponse, "responseId" | "timestamp">
) => {
  const docRef = await addDoc(collection(db, "surveyResponses"), {
    ...survey,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
};

// Final survey functions
export const saveFinalSurvey = async (
  finalSurvey: Omit<FinalSurvey, "timestamp">
) => {
  await setDoc(doc(db, "finalSurveys", finalSurvey.userId), {
    ...finalSurvey,
    timestamp: serverTimestamp(),
  });
};
