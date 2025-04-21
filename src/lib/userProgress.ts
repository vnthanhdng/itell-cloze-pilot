import { updateUser, getUser } from './firebase';
import { User } from '../utils/types';
import { isValidMethod, convertToStandardMethod } from '../utils/methodMapping';

/**
 * Advances the user's progress to the next test
 * @param uid User ID
 * @returns Information about the next test, or null if all tests are complete
 */
export const advanceUserProgress = async (uid: string) => {
  try {
    const user = await getUser(uid);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Log current progress before updating
    console.log(`Advancing progress for user ${uid}. Current progress: ${user.progress}`);
    
    // Increment the progress counter
    const newProgress = user.progress + 1;
    
    // Update the user's progress in the database
    await updateUser(uid, { progress: newProgress });
    
    console.log(`Updated progress for user ${uid} to ${newProgress}`);
    
    // Check if all tests are completed
    if (hasCompletedAllTests(newProgress)) {
      // Mark the completion time
      await updateUser(uid, { endTime: new Date() });
      console.log(`User ${uid} has completed all tests!`);
      return { complete: true };
    }
    
    // Get the next test information
    const { passageId, method } = getNextTest(
      user.assignedPassages, 
      user.assignedMethods, 
      newProgress
    );
    
    console.log(`Next test for user ${uid}: Passage ${passageId}, Method ${method}`);
    
    return {
      complete: false,
      nextTest: {
        passageId,
        apiMethod: method
      }
    };
  } catch (error) {
    console.error('Error advancing user progress:', error);
    throw error;
  }
};

/**
 * Gets the current test for a user
 * @param uid User ID
 * @returns Information about the current test, or null if all tests are complete
 */
export const getCurrentTest = async (uid: string) => {
  try {
    const user = await getUser(uid);
    if (!user) {
      throw new Error('User not found');
    }
    
    console.log(`Getting current test for user ${uid}. Progress: ${user.progress}`);
    console.log(`User data: `, { 
      assignedPassages: user.assignedPassages ? user.assignedPassages.length : 0,
      assignedMethods: user.assignedMethods ? user.assignedMethods.length : 0
    });
    
    // Check if all tests are completed
    if (hasCompletedAllTests(user.progress)) {
      console.log(`User ${uid} has completed all tests.`);
      return { complete: true };
    }
    
    // Get the current test information
    const { passageId, method } = getNextTest(
      user.assignedPassages,
      user.assignedMethods,
      user.progress
    );
    
    console.log(`Current test for user ${uid}: Passage ${passageId}, Method ${method}`);
    
    return {
      complete: false,
      currentTest: {
        passageId,
        method
      }
    };
  } catch (error) {
    console.error('Error getting current test:', error);
    throw error;
  }
};

/**
 * Gets the overall progress statistics for a user
 * @param uid User ID
 */
export const getUserProgressStats = async (uid: string) => {
  try {
    const user = await getUser(uid);
    if (!user) {
      throw new Error('User not found');
    }
    
    const totalTests = 6; // We use 6 tests per user
    const completedTests = user.progress;
    const progressPercentage = (completedTests / totalTests) * 100;
    
    return {
      completedTests,
      totalTests,
      progressPercentage,
      complete: hasCompletedAllTests(user.progress)
    };
  } catch (error) {
    console.error('Error getting user progress stats:', error);
    throw error;
  }
};

/**
 * Check if user has completed all required tests
 * @param progress Current progress count
 * @returns boolean indicating if all tests are complete
 */
export const hasCompletedAllTests = (progress: number) => {
  return progress >= 6; // 6 tests per user
};

/**
 * Gets the next test for a user based on their progress
 * @param assignedPassages Array of passage IDs
 * @param assignedMethods Array of method names
 * @param progress Current progress count
 * @returns Object with passageId and method
 */
export const getNextTest = (
  assignedPassages: number[] | undefined,
  assignedMethods: string[] | undefined,
  progress: number
) => {
  console.log("getNextTest called with:", { progressValue: progress, passages: assignedPassages, methods: assignedMethods });
  
  // Default method and passage if assignments are missing
  if (!assignedPassages || assignedPassages.length === 0 ||
      !assignedMethods || assignedMethods.length === 0) {
    console.warn("Missing assignments, using defaults");
    return { 
      passageId: 1, 
      method: 'contextuality' 
    };
  }
  
  // Ensure progress is within bounds
  if (progress < 0) {
    progress = 0;
  }
  
  if (progress >= assignedPassages.length || progress >= assignedMethods.length) {
    // User has completed all tests, return the last one
    const lastIndex = Math.min(assignedPassages.length - 1, assignedMethods.length - 1);
    console.log(`Progress ${progress} exceeds available tests. Using last valid index: ${lastIndex}`);
    return {
      passageId: assignedPassages[lastIndex],
      method: convertToStandardMethod(assignedMethods[lastIndex])
    };
  }
  
  // Get the passage and method for the current progress level
  const passageId = assignedPassages[progress];
  const method = convertToStandardMethod(assignedMethods[progress]);
  
  console.log(`Next test based on progress ${progress}: Passage ${passageId}, Method ${method}`);
  
  return {
    passageId,
    method
  };
};