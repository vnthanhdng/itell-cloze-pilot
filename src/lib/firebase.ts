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

export { app, db, auth };

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
import { User, TestResult, FinalSurvey } from "../utils/types";

// User functions
export const createUser = async (uid: string, userData: any) => {
  try {
    await setDoc(doc(db, "users", uid), {
      ...userData,
      startTime: serverTimestamp(),
    });
    console.log("User document created successfully for:", uid);
  } catch (error) {
    console.error("Error creating user document:", error);
    throw error;
  }
};

export const getUser = async (uid: string) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? (userDoc.data() as User) : null;
};

export const updateUser = async (uid: string, data: Partial<User>) => {
  await updateDoc(doc(db, "users", uid), data);
};

// Updated saveTestResult function with better error handling and data validation
export const saveTestResult = async (
  testResult: Omit<TestResult, "testId" | "timestamp">
) => {
  try {
    // Check for userId
    if (!testResult.userId) {
      throw new Error("Missing userId in test result");
    }
    
    // Validate other required fields
    if (
      testResult.method === undefined ||
      testResult.passageId === undefined ||
      testResult.score === undefined ||
      testResult.timeSpent === undefined ||
      testResult.holisticScore === undefined || 
      testResult.correctAnswers === undefined
    ) {
      throw new Error("Missing required fields in test result");
    }
    
    // Ensure answers and annotations are serializable
    // Convert any complex objects to strings if needed
    const serializedResult = {
      ...testResult,
      // Ensure answers and annotations are simple objects with string values
      answers: Object.fromEntries(
        Object.entries(testResult.answers || {}).map(([k, v]) => [k, String(v)])
      ),
      correctAnswers: Object.fromEntries(
        Object.entries(testResult.correctAnswers || {}).map(([k, v]) => [k, String(v)])
      ),
      annotations: Object.fromEntries(
        Object.entries(testResult.annotations || {}).map(([k, v]) => [k, String(v)])
      ),
      timestamp: serverTimestamp(),
    };
    
    // For debugging
    console.log("Saving test result:", JSON.stringify(serializedResult, null, 2));
    
    // Create the collection if it doesn't exist by adding the document
    const docRef = await addDoc(collection(db, "testResults"), serializedResult);
    
    console.log("Test result saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    // More detailed error logging
    console.error("Error saving test result:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    // Check for Firebase-specific errors
    if ('code' in (error as any)) {
      console.error("Firebase error code:", (error as any).code);
    }
    
    throw error;
  }
};

export const getTestResults = async (userId: string) => {
  const q = query(collection(db, "testResults"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    testId: doc.id,
    ...doc.data(),
  })) as TestResult[];
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
