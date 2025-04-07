import React from 'react';

interface DebugInfoProps {
  userData: any;
  testResults: any[];
  completedMethods: string[];
  hasCheckedStatus: boolean;
  showSurvey: boolean;
}

export const DebugInfo: React.FC<DebugInfoProps> = ({
  userData,
  testResults,
  completedMethods,
  hasCheckedStatus,
  showSurvey
}) => {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 w-64 bg-gray-800 text-white p-4 overflow-auto max-h-96 text-xs opacity-80 z-50">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="mb-2">
        <strong>User Progress:</strong> {userData?.progress || 'N/A'}
      </div>
      <div className="mb-2">
        <strong>Test Results Count:</strong> {testResults?.length || 0}
      </div>
      <div className="mb-2">
        <strong>Completed Methods:</strong> {completedMethods.join(', ') || 'None'}
      </div>
      <div className="mb-2">
        <strong>Has Checked Status:</strong> {hasCheckedStatus ? 'Yes' : 'No'}
      </div>
      <div className="mb-2">
        <strong>Show Survey:</strong> {showSurvey ? 'Yes' : 'No'}
      </div>
      <div className="mb-2">
        <strong>Redirect Condition:</strong> {userData?.progress < 1 ? 'Yes' : 'No'}
      </div>
      <div className="mb-2">
        <strong>Show Error Condition:</strong> {
          userData && userData.progress >= 1 && 
          (userData.progress < 3 || completedMethods.length < 3) ? 'Yes' : 'No'
        }
      </div>
      <div className="mb-2">
        <strong>Show Survey Condition:</strong> {
          userData && userData.progress >= 3 && 
          completedMethods.length >= 3 ? 'Yes' : 'No'
        }
      </div>
      <h4 className="font-bold mt-4 mb-2">Test Results:</h4>
      <pre className="text-xs whitespace-pre-wrap">
        {JSON.stringify(testResults, null, 2)}
      </pre>
    </div>
  );
};