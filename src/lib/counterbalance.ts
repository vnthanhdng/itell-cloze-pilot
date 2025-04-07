import { getUser, updateUser } from './firebase';

// Define the passage sets
const PASSAGE_SETS = [
  [1, 6, 11],   // Set 1
  [2, 7, 12],   // Set 2
  [3, 8, 13],   // Set 3
  [4, 9, 14],   // Set 4
  [5, 10, 15]   // Set 5
];

// Define the method rotation
const METHOD_ROTATIONS = [
  ['A', 'B', 'C'],  // Rotation 1
  ['A', 'C', 'B'],  // Rotation 2
  ['B', 'A', 'C'],  // Rotation 3
  ['B', 'C', 'A'],  // Rotation 4
  ['C', 'A', 'B'],  // Rotation 5
  ['C', 'B', 'A']   // Rotation 6
];

// Default passages and methods if none are assigned
const DEFAULT_PASSAGES = [1, 6, 11];
const DEFAULT_METHODS = ['A', 'B', 'C'];

/**
 * Assigns passages and methods to a new user
 * Uses a counter-balancing approach to ensure even distribution
 */
export const assignUserTests = async () => {
  try {
    // Get the total number of users to determine the assignment pattern
    // This is a simplified version - in a real app, you would count users in Firestore
    const userCount = Math.floor(Math.random() * 30); // Simulate random user count for testing
    
    // Calculate which passage set and method rotation to assign
    const passageSetIndex = userCount % PASSAGE_SETS.length;
    const methodRotationIndex = userCount % METHOD_ROTATIONS.length;
    
    const passages = PASSAGE_SETS[passageSetIndex];
    const methods = METHOD_ROTATIONS[methodRotationIndex];
    
    console.log(`Assigned: passages=${passages}, methods=${methods}`);
    
    return { passages, methods };
  } catch (error) {
    console.error('Error assigning user tests:', error);
    // Return defaults in case of error
    return { 
      passages: DEFAULT_PASSAGES, 
      methods: DEFAULT_METHODS 
    };
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
  // Safety check: handle undefined or empty arrays
  const passages = assignedPassages && assignedPassages.length > 0 
    ? assignedPassages 
    : DEFAULT_PASSAGES;
  
  const methods = assignedMethods && assignedMethods.length > 0 
    ? assignedMethods 
    : DEFAULT_METHODS;
  
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
 * Force a specific assignment for testing purposes
 */
export const forceUserAssignment = async (
  userId: string, 
  passageSetIndex: number, 
  methodRotationIndex: number
) => {
  if (passageSetIndex < 0 || passageSetIndex >= PASSAGE_SETS.length) {
    throw new Error(`Invalid passage set index: ${passageSetIndex}`);
  }
  
  if (methodRotationIndex < 0 || methodRotationIndex >= METHOD_ROTATIONS.length) {
    throw new Error(`Invalid method rotation index: ${methodRotationIndex}`);
  }
  
  const assignedPassages = PASSAGE_SETS[passageSetIndex];
  const assignedMethods = METHOD_ROTATIONS[methodRotationIndex];
  
  await updateUser(userId, {
    assignedPassages,
    assignedMethods,
    passageSetIndex,
    methodRotationIndex,
    progress: 0
  });
  
  return {
    assignedPassages,
    assignedMethods
  };
};