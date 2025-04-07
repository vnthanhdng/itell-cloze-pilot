export type ClozeMethod = 'contextuality' | 'contextuality_plus' | 'keyword';

/**
 * Map from legacy method codes to standardized method names
 */
export const METHOD_CODE_MAP: Record<string, ClozeMethod> = {
  'A': 'contextuality',
  'B': 'contextuality_plus',
  'C': 'keyword',
};

/**
 * Convert a method code or name to the standardized method name
 * @param method Method code or name to convert
 * @returns Standardized method name
 */
export const convertToStandardMethod = (method: string): ClozeMethod => {
  // If it's already a valid method name, return it
  if (isValidMethod(method)) {
    return method as ClozeMethod;
  }
  
  // Otherwise, try to convert from legacy code
  return METHOD_CODE_MAP[method] || 'contextuality'; // Default to contextuality if unknown
};

/**
 * Get a human-readable label for a method
 */
export const getMethodLabel = (method: string): string => {
  // First convert to standardized method name
  const standardMethod = convertToStandardMethod(method);
  
  const labels: Record<ClozeMethod, string> = {
    'contextuality': 'Context-Based Gaps',
    'contextuality_plus': 'Extended Context Gaps',
    'keyword': 'Keyword-Based Gaps',
  };
  
  return labels[standardMethod];
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
  // First convert to standardized method name
  const standardMethod = convertToStandardMethod(method);
  
  const descriptions: Record<ClozeMethod, string> = {
    'contextuality': 'Gaps are chosen based on words that can be predicted from the immediate sentence context.',
    'contextuality_plus': 'Gaps are chosen based on words that can be predicted from broader passage context.',
    'keyword': 'Gaps are chosen based on key terms that are important to understand the text.',
  };
  
  return descriptions[standardMethod];
};