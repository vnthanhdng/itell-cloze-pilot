import { getUser, updateUser, db, getTestResults } from './firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
import { ClozeMethod, isValidMethod, convertToStandardMethod } from '../utils/methodMapping';

// Define available passages and methods
const AVAILABLE_PASSAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
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
 * Randomly selects a combination of passages and methods
 * Ensures a balanced distribution of methods
 * Now allocating up to 10 tests to get enough annotations
 */
export const getRandomCombination = () => {
  // Shuffle available passages and pick 10 to allow for more tests if needed
  // (previously 6, now 10 to ensure users can reach 10 annotations)
  const shuffledPassages = [...AVAILABLE_PASSAGES].sort(() => Math.random() - 0.5);
  const passages = shuffledPassages.slice(0, 10);
  
  // Distribute the 3 methods across 10 tests
  const methods = distributeMethodsAcrossTenTests();
  
  const combinations = passages.map((passage, index) => {
    return {passage, method: methods[index]};
  });
  console.log("Assigned combinations:", combinations);
  
  return combinations;
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
  
  return shuffledPassages.slice(0, 10); // Return 10 passages (was 6)
};

/**
 * Distribute the 3 methods across 10 tests with balanced allocation
 */
export const distributeMethodsAcrossTenTests = (): ClozeMethod[] => {
  // Create a balanced distribution for 10 tests (approximately 3-3-4)
  const methodCounts: Record<ClozeMethod, number> = {
    contextuality: 3,
    contextuality_plus: 3,
    keyword: 4,
  };

  // Build the method list
  const methods: ClozeMethod[] = [];
  for (const method of AVAILABLE_METHODS) {
    methods.push(...Array(methodCounts[method]).fill(method));
  }
  
  // Shuffle the final array to avoid obvious patterns
  return methods.sort(() => Math.random() - 0.5);
};

/**
 * Previous distribution method for 6 tests (kept for backward compatibility)
 */
export const distributeMethodsAcrossSixTests = (): ClozeMethod[] => {
  // Create a balanced distribution (2-2-2 distribution)
  // For each method, allocate 2 tests
  const methodCounts: Record<ClozeMethod, number> = {
    contextuality: 2,
    contextuality_plus: 2,
    keyword: 2,
  };

  // Build the method list
  const methods: ClozeMethod[] = [];
  for (const method of AVAILABLE_METHODS) {
    methods.push(...Array(methodCounts[method]).fill(method));
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
    const combinations = getRandomCombination();

    const passages = combinations.map(c => c.passage);
    const methods = combinations.map(c => c.method);

    return { passages, methods };
  } catch (error) {
    console.error('Error assigning user tests:', error);
    // Try one more time if there's an error
    const combinations = getRandomCombination();
    return { 
      passages: combinations.map(c => c.passage), 
      methods: combinations.map(c => c.method) 
    };
  }
};

/**
 * Check if user has completed enough annotations
 * @param uid User ID
 * @returns boolean indicating if the user has 10+ annotations
 */
export const hasCompletedEnoughAnnotations = async (uid: string): Promise<boolean> => {
  try {
    const testResults = await getTestResults(uid);
    const totalAnnotations = testResults.reduce((sum, result) => {
      return sum + (result.annotations ? Object.keys(result.annotations).length : 0);
    }, 0);
    
    return totalAnnotations >= 10;
  } catch (error) {
    console.error('Error checking annotations:', error);
    return false;
  }
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
    (() => {
      const combinations = getRandomCombination();
      return {
        passages: combinations.map(c => c.passage),
        methods: combinations.map(c => c.method)
      };
    })() : 
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
  
  console.log(`Getting test for progress ${progress}: Passage ${passageId}, Method ${method}`);
  
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
  if (!customPassages || customPassages.length < 1) {
    throw new Error(`Invalid passages: must provide at least 1 passage ID`);
  }
  
  // Validate methods
  if (!customMethods || customMethods.length < 1) {
    throw new Error(`Invalid methods: must provide at least 1 method name`);
  }
  
  // Ensure arrays are the same length
  if (customPassages.length !== customMethods.length) {
    throw new Error(`Passages and methods must have the same length`);
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
  // Get passages based on seed value - use 10 passages instead of 6
  const passages = getRandomPassageSet(passageSeed);
  
  // Get methods based on rotation index and distribute across tests
  const methodRotation = getMethodRotationByIndex(methodRotationIndex);
  const methods: ClozeMethod[] = [];
  
  // Distribute methods for 10 tests (approximately 3-3-4 distribution)
  const counts = [3, 3, 4]; // 3 + 3 + 4 = 10 total tests
  
  for (let i = 0; i < methodRotation.length; i++) {
    for (let j = 0; j < counts[i]; j++) {
      methods.push(methodRotation[i]);
    }
  }
  
  // Shuffle to avoid patterns
  methods.sort(() => Math.random() - 0.5);
  
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