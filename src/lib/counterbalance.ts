import { MethodId } from '../utils/types';
import { db } from './firebase';
import { collection, getDocs, query } from 'firebase/firestore';

const METHOD_ORDERS = [
  [MethodId.A, MethodId.B, MethodId.C, MethodId.D],
  [MethodId.B, MethodId.C, MethodId.D, MethodId.A],
  [MethodId.C, MethodId.D, MethodId.A, MethodId.B],
  [MethodId.D, MethodId.A, MethodId.B, MethodId.C],
];

/**
 * Determines the method order for a new participant
 * based on the counterbalancing principle
 */
export const assignMethodOrder = async (): Promise<MethodId[]> => {
  try {
    // Get all existing users
    const usersSnapshot = await getDocs(query(collection(db, 'users')));
    const userCount = usersSnapshot.size;
    
    // Simple counterbalancing: assign based on modulo
    const orderIndex = userCount % METHOD_ORDERS.length;
    return METHOD_ORDERS[orderIndex];
  } catch (error) {
    console.error('Error assigning method order:', error);
    // Default to the first order if there's an error
    return METHOD_ORDERS[0];
  }
};

/**
 * Determines the next test in the sequence for a user
 */
export const getNextTest = (
  methodOrder: MethodId[], 
  currentProgress: number
): { methodId: MethodId | null, passageId: number | null } => {
  
  // If the user has completed all tests
  if (currentProgress >= methodOrder.length) {
    return { methodId: null, passageId: null };
  }
  
  // Get the next method ID from the order
  const methodId = methodOrder[currentProgress];
  
  // For simplicity, passage ID corresponds to the test number (1-indexed)
  const passageId = currentProgress + 1;
  
  return { methodId, passageId };
};

/**
 * Checks if a user has completed all tests
 */
export const hasCompletedAllTests = (progress: number): boolean => {
  return progress >= METHOD_ORDERS[0].length;
};