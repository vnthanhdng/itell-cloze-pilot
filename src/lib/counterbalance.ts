import { getUser, updateUser, db } from './firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
import { ClozeMethod, isValidMethod, convertToStandardMethod } from '../utils/methodMapping';

// Define available passages and methods
const AVAILABLE_PASSAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const AVAILABLE_METHODS: ClozeMethod[] = ['contextuality', 'contextuality_plus', 'keyword'];

// Define all possible method rotations for balanced assignment
// Using proper method names instead of A, B, C codes
export const METHOD_ROTATIONS: ClozeMethod[][] = [
  ['contextuality', 'contextuality_plus', 'keyword'],       // Previously ABC
  ['contextuality', 'keyword', 'contextuality_plus'],       // Previously ACB
  ['contextuality_plus', 'contextuality', 'keyword'],       // Previously BAC
  ['contextuality_plus', 'keyword', 'contextuality'],       // Previously BCA
  ['keyword', 'contextuality', 'contextuality_plus'],       // Previously CAB
  ['keyword', 'contextuality_plus', 'contextuality']        // Previously CBA
];

/**
 * Randomly selects a combination of 3 passages and 3 methods
 * Ensures no duplicates in the selections
 */
export const getRandomCombination = () => {
  // Shuffle available passages and pick 10 (instead of 3)
  const shuffledPassages = [...AVAILABLE_PASSAGES].sort(() => Math.random() - 0.5);
  const passages = shuffledPassages.slice(0, 10);
  
  // Distribute the 3 methods across 10 tests
  const methods = distributeMethodsAcrossTenTests();
  
  console.log(`Random combination: passages=${passages}, methods=${methods}`);
  
  return { passages, methods };
};

/**
 * Get a specific method rotation by index
 */
export const getMethodRotationByIndex = (index: number): ClozeMethod[] => {
  if (index < 0 || index >= METHOD_ROTATIONS.length) {
    console.warn(`Invalid method rotation index: ${index}, using default rotation 0`);
    return [...METHOD_ROTATIONS[0]];
  }
  return [...METHOD_ROTATIONS[index]];
};

/**
 * Get a random set of passages based on a seed
 * This helps create more balanced passage distribution
 */
export const getRandomPassageSet = (seed?: number): number[] => {
  // We'll implement a deterministic but random-feeling selection
  // that avoids choosing the same passages too frequently
  const shuffledPassages = [...AVAILABLE_PASSAGES];
  
  // If seed is provided, use it to deterministically shuffle
  if (seed !== undefined) {
    // Simple Fisher-Yates shuffle with seed influence
    for (let i = shuffledPassages.length - 1; i > 0; i--) {
      const seedFactor = (seed * 13 + i * 17) % 100 / 100;
      const j = Math.floor(seedFactor * (i + 1));
      [shuffledPassages[i], shuffledPassages[j]] = [shuffledPassages[j], shuffledPassages[i]];
    }
  } else {
    // Regular random shuffle
    shuffledPassages.sort(() => Math.random() - 0.5);
  }
  
  return shuffledPassages.slice(0, 3);
};

export const distributeMethodsAcrossTenTests = (): ClozeMethod[] => {
  const methods: ClozeMethod[] = [];
  const availableMethods: ClozeMethod[] = ['contextuality', 'contextuality_plus', 'keyword'];
  
  // Create a balanced distribution (approximately 3-3-4 distribution)
  // For each method, allocate either 3 or 4 tests
  const counts = [3, 3, 4]; 
  
  // Shuffle the methods to randomize which one gets 4 tests
  const shuffledMethods = [...availableMethods].sort(() => Math.random() - 0.5);
  
  // Allocate each method its designated number of tests
  for (let i = 0; i < shuffledMethods.length; i++) {
    for (let j = 0; j < counts[i]; j++) {
      methods.push(shuffledMethods[i]);
    }
  }
  
  // Shuffle the final array to avoid obvious patterns
  return methods.sort(() => Math.random() - 0.5);
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
    { 
      passages: assignedPassages, 
      // Convert any legacy method codes to standardized names
      methods: assignedMethods.map(m => convertToStandardMethod(m))
    };
  
  // Ensure progress is within bounds
  if (progress < 0) {
    progress = 0;
  } else if (progress >= passages.length || progress >= methods.length) {
    // Use the last valid index if progress is too high
    progress = Math.min(passages.length - 1, methods.length - 1);
  }
  
  // Get the passage and method for the current progress level
  const passageId = passages[progress];
  const method = methods[progress];
  
  return {
    passageId,
    method
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
  
  // Validate methods
  if (!customMethods || customMethods.length !== 3) {
    throw new Error(`Invalid methods: must provide exactly 3 method names`);
  }
  
  // Convert any legacy method codes to standardized names
  const convertedMethods = customMethods.map(m => convertToStandardMethod(m));
  
  await updateUser(userId, {
    assignedPassages: customPassages,
    assignedMethods: convertedMethods,
    progress: 0
  });
  
  return {
    assignedPassages: customPassages,
    assignedMethods: convertedMethods
  };
};

/**
 * Force user assignment using optimized selection
 * Uses indices/seeds to create balanced distribution
 */
export const forceUserAssignmentByIndices = async (
  userId: string,
  passageSeed: number,
  methodRotationIndex: number
) => {
  // Get passages based on seed value
  const passages = getRandomPassageSet(passageSeed);
  
  // Get methods based on rotation index
  const methods = getMethodRotationByIndex(methodRotationIndex);
  
  console.log(`Optimized assignment for user ${userId}:`, {
    passages,
    methods,
    methodRotationIndex
  });
  
  await updateUser(userId, {
    assignedPassages: passages,
    assignedMethods: methods,
    progress: 0
  });
  
  return {
    assignedPassages: passages,
    assignedMethods: methods
  };
};