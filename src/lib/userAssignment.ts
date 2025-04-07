import { collection, getCountFromServer, doc, getDoc, setDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { assignUserTests, forceUserAssignment } from './counterbalance';

// Define a type for the user data
interface UserData {
  assignedPassages?: number[];
  assignedMethods?: string[];
  progress?: number;
  [key: string]: any; // For any other fields that might be in the document
}

/**
 * Assigns passages and methods to a new user during registration
 * This function should be called when a new user is created
 */
export const assignContentToNewUser = async (userId: string) => {
  try {
    // Get a count of all users to use for balanced assignment
    const usersRef = collection(db, 'users');
    const snapshot = await getCountFromServer(usersRef);
    const userCount = snapshot.data().count;
    
    console.log(`Assigning content to new user ${userId} (user count: ${userCount})`);
    
    // Use the available assignUserTests function
    const { passages, methods } = await assignUserTests();
    
    // Save the assignment to the user document
    await setDoc(doc(db, "users", userId), {
      assignedPassages: passages,
      assignedMethods: methods,
      progress: 0
    }, { merge: true });
    
    return { passages, methods };
  } catch (error) {
    console.error('Error assigning content to new user:', error);
    throw error;
  }
};

/**
 * Gets a detailed report of the current assignment distribution
 * Useful for admin dashboards to monitor balance
 */
export const getAssignmentDistribution = async () => {
  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const users = usersSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as (UserData & { id: string })[];
    
    // Calculate assignment stats manually
    const passageSets = [0, 0, 0, 0, 0]; // Count for each passage set
    const methodRotations = [0, 0, 0, 0, 0, 0]; // Count for each method rotation
    const combinations = {};
    
    users.forEach(user => {
      // If user has assigned passages, count them
      if (user.assignedPassages) {
        // Simple approach: determine which set by the first passage
        const firstPassage = user.assignedPassages[0];
        if (firstPassage === 1) passageSets[0]++;
        else if (firstPassage === 2) passageSets[1]++;
        else if (firstPassage === 3) passageSets[2]++;
        else if (firstPassage === 4) passageSets[3]++;
        else if (firstPassage === 5) passageSets[4]++;
      }
      
      // If user has assigned methods, count them
      if (user.assignedMethods && user.assignedMethods.length >= 3) {
        const methods = user.assignedMethods.join('');
        if (methods === 'ABC') methodRotations[0]++;
        else if (methods === 'ACB') methodRotations[1]++;
        else if (methods === 'BAC') methodRotations[2]++;
        else if (methods === 'BCA') methodRotations[3]++;
        else if (methods === 'CAB') methodRotations[4]++;
        else if (methods === 'CBA') methodRotations[5]++;
      }
    });
    
    return {
      totalUsers: users.length,
      passageSets,
      methodRotations,
      combinations,
      // Add completion stats
      completion: {
        notStarted: users.filter(user => user.progress === 0).length,
        inProgress: users.filter(user => (user.progress ?? 0) > 0 && (user.progress ?? 0) < 3).length,
        completed: users.filter(user => (user.progress ?? 0) >= 3).length
      }
    };
  } catch (error) {
    console.error('Error getting assignment distribution:', error);
    throw error;
  }
};

/**
 * Gets the next available balanced assignment
 * This is more sophisticated than simply using the user count
 * as it tries to maintain balance even if some users don't complete tests
 */
export const getOptimizedAssignment = async () => {
  try {
    // Get current distribution
    const distribution = await getAssignmentDistribution();
    
    // Find the passage set with the fewest assignments
    const minPassageSetIndex = distribution.passageSets.indexOf(
      Math.min(...distribution.passageSets)
    );
    
    // Find the method rotation with the fewest assignments
    const minMethodRotationIndex = distribution.methodRotations.indexOf(
      Math.min(...distribution.methodRotations)
    );
    
    return {
      passageSetIndex: minPassageSetIndex,
      methodRotationIndex: minMethodRotationIndex
    };
  } catch (error) {
    console.error('Error getting optimized assignment:', error);
    throw error;
  }
};

/**
 * Assigns an optimized passage set and method rotation to a user
 * This is more balanced than the simple counter-based approach
 */
export const assignOptimizedContentToUser = async (userId: string) => {
  try {
    // Get optimized assignment
    const { passageSetIndex, methodRotationIndex } = await getOptimizedAssignment();
    
    console.log(`Optimized assignment for user ${userId}:`, {
      passageSetIndex,
      methodRotationIndex
    });
    
    // Force this assignment
    return await forceUserAssignment(userId, passageSetIndex, methodRotationIndex);
  } catch (error) {
    console.error('Error assigning optimized content:', error);
    
    // Fallback to simple assignment
    console.log("Falling back to simple assignment");
    const { passages, methods } = await assignUserTests();
    
    // Save the assignment to the user document
    await setDoc(doc(db, "users", userId), {
      assignedPassages: passages,
      assignedMethods: methods,
      progress: 0
    }, { merge: true });
    
    return { assignedPassages: passages, assignedMethods: methods };
  }
};