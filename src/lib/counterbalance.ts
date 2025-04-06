import { db } from './firebase';
import { collection, getDocs, query } from 'firebase/firestore';

const METHODS = [
  'contextuality',
  'contextuality_plus',
  'keyword'
];

const TOTAL_PASSAGES = 16;
/**
 * Determines the method order for a new participant
 * based on the counterbalancing principle
 */

export const assignUserTests = async (): Promise<{
  passages: number[];
  methods: string[];
}> => {
  try {
  const usersSnapshot = await getDocs(query(collection(db, 'users')));
  const userCount = usersSnapshot.size;

  const firstPassageIndex = userCount % TOTAL_PASSAGES;
  const secondPassageIndex = (firstPassageIndex + Math.floor(TOTAL_PASSAGES/3)) % TOTAL_PASSAGES;
  const thirdPassageIndex = (secondPassageIndex + Math.floor(TOTAL_PASSAGES/3)) % TOTAL_PASSAGES;

  const passages = [
    firstPassageIndex + 1,
    secondPassageIndex + 1,
    thirdPassageIndex + 1
  ];

  const methodRotation = userCount % 3;
    const methods = [
      METHODS[(0 + methodRotation) % 3],
      METHODS[(1 + methodRotation) % 3],
      METHODS[(2 + methodRotation) % 3]
    ];
    
    return { passages, methods };
  } catch (error) {
    console.error('Error assigning passages and methods:', error);
    // Default to a simple assignment if there's an error
    return { 
      passages: [1, 6, 11], 
      methods: ['contextuality', 'contextuality_plus', 'keyword'] 
    };
  }
};

/**
 * Determines the next test in the sequence for a user
 */
export const getNextTest = (
  assignedPassages: number[],
  assignedMethods: string[],
  currentProgress: number
): { passageId: number | null, method: string | null } => {
  // If the user has completed all tests
  if (currentProgress >= assignedPassages.length) {
    return { passageId: null, method: null };
  }
  
  // Get the next passage and method from the assignments
  const passageId = assignedPassages[currentProgress];
  const method = assignedMethods[currentProgress];
  
  return { passageId, method };
};

/**
 * Checks if a user has completed all tests
 */
export const hasCompletedAllTests = (progress: number): boolean => {
  return progress >= 3;
};