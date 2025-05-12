import { updateUser, getUser, getTestResults } from './firebase';
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
    
    // Check if user has completed 6 annotations
    const testResults = await getTestResults(uid);
    const totalAnnotations = testResults.reduce((sum, result) => {
      // Count annotations from each test result
      return sum + (result.annotations ? Object.keys(result.annotations).length : 0);
    }, 0);
    
    console.log(`User ${uid} has completed ${totalAnnotations} annotations so far`);
    
    // If user has reached 6 annotations, mark as complete
    if (totalAnnotations >= 6) {
      // Mark the completion time
      await updateUser(uid, { endTime: new Date() });
      console.log(`User ${uid} has completed at least 6 annotations!`);
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
    
    // Check if user has completed 6 annotations - this is the ONLY check that matters
    const testResults = await getTestResults(uid);
    const totalAnnotations = testResults.reduce((sum, result) => {
      const annotationCount = result.annotations ? Object.keys(result.annotations).length : 0;
      console.log(`Test result: ${result.testId}, annotations: ${annotationCount}`);
      return sum + annotationCount;
    }, 0);
    
    console.log(`User ${uid} has completed ${totalAnnotations} annotations total`);
    
    // Check if all tests are completed by annotation count
    if (totalAnnotations >= 6) {
      console.log(`User ${uid} has completed at least 6 annotations. Marked as complete.`);
      return { complete: true };
    }
    
    // If not complete, get the current test information
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
    
    const totalTests = 6; // We use 10 tests per user
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
  return progress >= 6; // 10 tests per user
};

export const hasCompletedEnoughAnnotations = async (uid: string): Promise<boolean> => {
  try {
    const testResults = await getTestResults(uid);
    
    // Log to help with debugging
    console.log(`Checking annotation count for user ${uid}`);
    
    // Count all annotations across all test results
    const totalAnnotations = testResults.reduce((sum, result) => {
      const annotationCount = result.annotations ? Object.keys(result.annotations).length : 0;
      console.log(`Test result ${result.testId}: ${annotationCount} annotations`);
      return sum + annotationCount;
    }, 0);
    
    console.log(`Total annotations for user ${uid}: ${totalAnnotations}`);
    
    // Check if they have at least 6 annotations
    const hasEnough = totalAnnotations >= 6;
    console.log(`User ${uid} has completed enough annotations: ${hasEnough}`);
    
    return hasEnough;
  } catch (error) {
    console.error('Error checking annotations:', error);
    // Default to false if there's an error
    return false;
  }
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