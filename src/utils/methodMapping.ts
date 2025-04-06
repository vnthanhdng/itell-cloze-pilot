/**
 * Maps method IDs (A, B, C, D) to their corresponding API names
 * or maps method names to their API names
 */
export const getMethodApiName = (methodId: string): string => {
    // If the method is already a full name, return it
    if (['contextuality', 'contextuality_plus', 'keyword'].includes(methodId)) {
      return methodId;
    }
    
    // Map method IDs to their API names
    const methodMap: Record<string, string> = {
      'A': 'contextuality',
      'B': 'contextuality_plus',
      'C': 'keyword',

    };
    
    return methodMap[methodId] || methodId;
  };
  
  /**
   * Maps API method names to human-readable labels
   */
  export const getMethodLabel = (methodName: string): string => {
    const labelMap: Record<string, string> = {
      'contextuality': 'Contextuality-based Gaps',
      'contextuality_plus': 'Enhanced Contextuality Gaps',
      'keyword': 'Keyword-based Gaps',
    
      'A': 'Method A',
      'B': 'Method B', 
      'C': 'Method C',
 
    };
    
    return labelMap[methodName] || 'Unknown Method';
  };