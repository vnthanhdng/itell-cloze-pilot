import { collection, getCountFromServer, doc, getDoc, setDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { 
  assignUserTests, 
  forceUserAssignment, 
  forceUserAssignmentByIndices,
  getMethodRotationByIndex,
  getRandomPassageSet,
  getRandomCombination,
  METHOD_ROTATIONS
} from './counterbalance';
import { ClozeMethod } from '../utils/methodMapping';
import { updateUser } from './firebase';

// Define a type for the user data
interface UserData {
  assignedPassages?: number[];
  assignedMethods?: ClozeMethod[];
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
    const assignmentResult = await assignUserTests() as { passages: number[]; methods: ClozeMethod[] } | { passage: number; method: ClozeMethod }[];
    let passages: number[] = [];
    let methods: ClozeMethod[] = [];

    if ('passages' in assignmentResult && 'methods' in assignmentResult) {
      passages = assignmentResult.passages;
      methods = assignmentResult.methods;
    } else {
      passages = assignmentResult.map(item => item.passage);
      methods = assignmentResult.map(item => item.method);
    }
    
    console.log(`Assigned to user ${userId}:`, { passages, methods });
    
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
    const passageCounts: Record<number, number> = {};
    // Initialize counters for method rotations
    const methodRotations = Array(METHOD_ROTATIONS.length).fill(0);
    const combinations = {};
    
    users.forEach(user => {
      // If user has assigned passages, count individual passages for distribution analysis
      if (user.assignedPassages && user.assignedPassages.length > 0) {
        user.assignedPassages.forEach(passageId => {
          passageCounts[passageId] = (passageCounts[passageId] || 0) + 1;
        });
      }
      
      // If user has assigned methods, count the rotation
      if (user.assignedMethods && user.assignedMethods.length >= 3) {
        const methodKey = user.assignedMethods.slice(0, 3).join('');
        const rotationMap: {[key: string]: number} = {
          'contextualitycontextuality_pluskeyword': 0,
          'contextualitykeywordcontextuality_plus': 1,
          'contextuality_pluscontextualitykeyword': 2,
          'contextuality_pluskeywordcontextuality': 3,
          'keywordcontextualitycontextuality_plus': 4,
          'keywordcontextuality_pluscontextuality': 5
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
        inProgress: users.filter(user => (user.progress ?? 0) > 0 && (user.progress ?? 0) < 6).length,
        completed: users.filter(user => (user.progress ?? 0) >= 6).length
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
      seedValue: randomSeed, // Random seed value for passage selection
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
    
    // Generate 6 passages using the seed value
    const passages = getRandomPassageSet(seedValue);
    
    // Get a method rotation and distribute it across 6 tests
    const methodRotation = getMethodRotationByIndex(methodRotationIndex);
    const methods: ClozeMethod[] = [];
    
    // Distribute methods from the rotation across 6 tests (2-2-2 distribution)
    const counts = [2, 2, 2]; // 2 + 2 + 2 = 6 total tests
    
    for (let i = 0; i < methodRotation.length; i++) {
      for (let j = 0; j < counts[i]; j++) {
        methods.push(methodRotation[i]);
      }
    }
    
    // Shuffle to avoid patterns
    methods.sort(() => Math.random() - 0.5);
    
    console.log(`Optimized assignment for user ${userId}:`, { passages, methods });
    
    // Save the assignment to the user document
    await updateUser(userId, {
      assignedPassages: passages,
      assignedMethods: methods,
      progress: 0
    });
    
    return {
      assignedPassages: passages,
      assignedMethods: methods
    };
  } catch (error) {
    console.error('Error assigning optimized content:', error);
    
    // Fallback to simple assignment
    const randomCombination = getRandomCombination();
    const passages = randomCombination.map(item => item.passage);
    const methods = randomCombination.map(item => item.method);
    
    await updateUser(userId, {
      assignedPassages: passages,
      assignedMethods: methods,
      progress: 0
    });
    
    return { assignedPassages: passages, assignedMethods: methods };
  }
};