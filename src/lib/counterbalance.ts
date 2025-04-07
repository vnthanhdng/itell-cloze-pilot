import { getUser, updateUser, db } from './firebase';
import { collection, getCountFromServer } from 'firebase/firestore';

// Define available passages and methods
const AVAILABLE_PASSAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const AVAILABLE_METHODS = ['A', 'B', 'C'];

/**
 * Randomly selects a combination of 3 passages and 3 methods
 * Ensures no duplicates in the selections
 */
export const getRandomCombination = () => {
  // Shuffle available passages and pick the first 3
  const shuffledPassages = [...AVAILABLE_PASSAGES].sort(() => Math.random() - 0.5);
  const passages = shuffledPassages.slice(0, 3);
  
  // Generate a random method combination (ensuring each method is used once)
  const shuffledMethods = [...AVAILABLE_METHODS].sort(() => Math.random() - 0.5);
  const methods = shuffledMethods;
  
  console.log(`Random combination: passages=${passages}, methods=${methods}`);
  
  return { passages, methods };
};

/**
 * Assigns passages and methods to a new user
 * Uses purely random assignments
 */
export const assignUserTests = async () => {
  try {
    // Generate random combination
    const { passages, methods } = getRandomCombination();
    console.log(`Assigned: passages=${passages}, methods=${methods}`);
    
    return { passages, methods };
  } catch (error) {
    console.error('Error assigning user tests:', error);
    // Try one more time if there's an error
    return getRandomCombination();
  }
};

/**
 * Checks if a user has completed all tests
 */
export const hasCompletedAllTests = (progress: number) => {
  return progress >= 3; // 3 tests per user
};

/**
 * Gets the next test for a user based on their progress
 */
export const getNextTest = (
  assignedPassages: number[] | undefined,
  assignedMethods: string[] | undefined,
  progress: number
) => {
  // Safety check: handle undefined or empty arrays with random assignment
  const { passages, methods } = (!assignedPassages || assignedPassages.length === 0 ||
    !assignedMethods || assignedMethods.length === 0) ? 
    getRandomCombination() : 
    { passages: assignedPassages, methods: assignedMethods };
  
  // Ensure progress is within bounds
  if (progress < 0 || progress >= passages.length) {
    console.error('Invalid progress value:', progress);
    // Default to first test if something's wrong
    return { passageId: passages[0], method: methods[0] };
  }
  
  // Get the passage and method for the current progress level
  const passageId = passages[progress];
  const method = methods[progress];
  
  // Convert method ID to API method if needed
  const methodMap: Record<string, string> = {
    'A': 'contextuality',
    'B': 'contextuality_plus',
    'C': 'keyword'
  };
  
  return {
    passageId,
    method: methodMap[method] || method
  };
};

/**
 * Force specific passages and methods for testing purposes
 */
export const forceUserAssignment = async (
  userId: string, 
  customPassages: number[], 
  customMethods: string[]
) => {
  if (!customPassages || customPassages.length !== 3) {
    throw new Error(`Invalid passages: must provide exactly 3 passage IDs`);
  }
  
  if (!customMethods || customMethods.length !== 3 || 
      !customMethods.every(m => AVAILABLE_METHODS.includes(m))) {
    throw new Error(`Invalid methods: must provide exactly 3 valid methods (A, B, C)`);
  }
  
  await updateUser(userId, {
    assignedPassages: customPassages,
    assignedMethods: customMethods,
    progress: 0
  });
  
  return {
    assignedPassages: customPassages,
    assignedMethods: customMethods
  };
};