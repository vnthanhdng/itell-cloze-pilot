import { updateUser, getUser } from './firebase';
import { getNextTest, hasCompletedAllTests } from './counterbalance';
import { User } from '../utils/types';

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
    
    // Increment the progress counter
    const newProgress = user.progress + 1;
    
    // Update the user's progress in the database
    await updateUser(uid, { progress: newProgress });
    
    // Check if all tests are completed
    if (hasCompletedAllTests(newProgress)) {
      // Mark the completion time
      await updateUser(uid, { endTime: new Date() });
      return { complete: true };
    }
    
    // Get the next test information
    const { passageId, method } = getNextTest(
      user.assignedPassages, 
      user.assignedMethods, 
      newProgress
    );
    
    return {
      complete: false,
      nextTest: {
        passageId,
        method
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
    
    // Check if all tests are completed
    if (hasCompletedAllTests(user.progress)) {
      return { complete: true };
    }
    
    // Get the current test information
    const { passageId, method } = getNextTest(
      user.assignedPassages,
      user.assignedMethods,
      user.progress
    );
    
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
    
    const totalTests = 4; // A, B, C, D
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