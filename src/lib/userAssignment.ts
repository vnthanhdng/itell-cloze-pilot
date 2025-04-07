import { collection, getCountFromServer, doc, getDoc, setDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { 
  assignUserTests, 
  forceUserAssignment, 
  forceUserAssignmentByIndices,
  getMethodRotationByIndex,
  getRandomPassageSet,
  METHOD_ROTATIONS
} from './counterbalance';

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
    
    // For passages, track which ones are used most frequently
    const passageCounts = {};
    // Initialize counters for method rotations
    const methodRotations = Array(METHOD_ROTATIONS.length).fill(0);
    const combinations = {};
    
    users.forEach(user => {
      // If user has assigned passages, count individual passages for distribution analysis
      if (user.assignedPassages?.length > 0) {
        user.assignedPassages.forEach(passageId => {
          passageCounts[passageId] = (passageCounts[passageId] || 0) + 1;
        });
      }
      
      // If user has assigned methods, count the rotation
      if (user.assignedMethods?.length >= 3) {
        const methodKey = user.assignedMethods.join('');
        const rotationMap: {[key: string]: number} = {
          'ABC': 0, 'ACB': 1, 'BAC': 2, 
          'BCA': 3, 'CAB': 4, 'CBA': 5
        };
        
        const rotationIndex = rotationMap[methodKey] !== undefined 
          ? rotationMap[methodKey] 
          : 0;
          
        methodRotations[rotationIndex]++;
      }
    });
    
    return {
      totalUsers: users.length,
      passageCounts, // Individual passage distribution
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
    
    // For passages, we'll use random selection to maintain diversity
    // So we don't need to find the optimal passage set index
    
    // Find the method rotation with the fewest assignments
    const minMethodRotationIndex = distribution.methodRotations.indexOf(
      Math.min(...distribution.methodRotations)
    );
    
    // Generate a random seed value for passage selection
    const randomSeed = Math.floor(Math.random() * 1000);
    
    return {
      seedValue: randomSeed, // Just a random seed value, not actually used
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
    // Get optimized assignment indices
    const { seedValue, methodRotationIndex } = await getOptimizedAssignment();
    
    console.log(`Optimized assignment for user ${userId}:`, {
      seedValue, // Just a random seed, not used for passage selection
      methodRotationIndex
    });
    
    // Use the helper function that handles indices properly
    // This will generate random passages but use balanced method rotations
    return await forceUserAssignmentByIndices(userId, seedValue, methodRotationIndex);
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