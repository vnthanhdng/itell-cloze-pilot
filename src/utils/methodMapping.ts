
export type ClozeMethod = 'contextuality' | 'contextuality_plus' | 'keyword';

/**
 * Get a human-readable label for a method
 */
export const getMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    'contextuality': 'Context-Based Gaps',
    'contextuality_plus': 'Extended Context Gaps',
    'keyword': 'Keyword-Based Gaps',
  };
  
  return labels[method] || method;
};

/**
 * Validate if a method name is valid
 */
export const isValidMethod = (method: string): method is ClozeMethod => {
  return ['contextuality', 'contextuality_plus', 'keyword'].includes(method);
};

/**
 * Get description for a method to explain to users
 */
export const getMethodDescription = (method: string): string => {
  const descriptions: Record<string, string> = {
    'contextuality': 'Gaps are chosen based on words that can be predicted from the immediate sentence context.',
    'contextuality_plus': 'Gaps are chosen based on words that can be predicted from broader passage context.',
    'keyword': 'Gaps are chosen based on key terms that are important to understand the text.',
  };
  
  return descriptions[method] || 'A method for generating fill-in-the-blank tests.';
};