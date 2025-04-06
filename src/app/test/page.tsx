'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { TestResult, FinalSurvey } from '../../utils/types';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const [finalSurveys, setFinalSurveys] = useState<FinalSurvey[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // For simplicity, we'll consider the first user as admin
        // In a real app, you'd check a proper admin flag
        setIsAdmin(true);
        await loadData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load dashboard data
  const loadData = async () => {
    try {
      // Get all test results
      const testResultsSnapshot = await getDocs(collection(db, 'testResults'));
      const testResultsData = testResultsSnapshot.docs.map(doc => ({
        testId: doc.id,
        ...doc.data()
      })) as TestResult[];
      setTestResults(testResultsData);

      // Get all survey responses
      const surveyResponsesSnapshot = await getDocs(collection(db, 'surveyResponses'));
      const surveyResponsesData = surveyResponsesSnapshot.docs.map(doc => ({
        responseId: doc.id,
        ...doc.data()
      })) as SurveyResponse[];
      setSurveyResponses(surveyResponsesData);

      // Get all final surveys
      const finalSurveysSnapshot = await getDocs(collection(db, 'finalSurveys'));
      const finalSurveysData = finalSurveysSnapshot.docs.map(doc => ({
        ...doc.data()
      })) as FinalSurvey[];
      setFinalSurveys(finalSurveysData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate method performance metrics
  const calculateMethodStats = () => {
    const methodStats: Record<string, {
      averageScore: number;
      averageDifficulty: number;
      averageEngagement: number;
      averageHelpfulness: number;
      averageLikelihood: number;
      count: number;
    }> = {};

    // Initialize stats for each method
    const methods = ['A', 'B', 'C', 'D'];
    methods.forEach(method => {
      methodStats[method] = {
        averageScore: 0,
        averageDifficulty: 0,
        averageEngagement: 0,
        averageHelpfulness: 0,
        averageLikelihood: 0,
        count: 0
      };
    });

    // Calculate average scores
    methods.forEach(method => {
      const methodResults = testResults.filter(result => result.methodId === method);
      if (methodResults.length > 0) {
        methodStats[method].averageScore = methodResults.reduce((sum, result) => sum + result.score, 0) / methodResults.length;
        methodStats[method].count = methodResults.length;
      }

      // Get survey responses for this method
      const methodSurveys = surveyResponses.filter(response => response.methodId === method);
      if (methodSurveys.length > 0) {
        methodStats[method].averageDifficulty = methodSurveys.reduce((sum, survey) => 
          sum + survey.responses.difficulty, 0) / methodSurveys.length;
        
        methodStats[method].averageEngagement = methodSurveys.reduce((sum, survey) => 
          sum + survey.responses.engagement, 0) / methodSurveys.length;
        
        methodStats[method].averageHelpfulness = methodSurveys.reduce((sum, survey) => 
          sum + survey.responses.helpfulness, 0) / methodSurveys.length;
        
        methodStats[method].averageLikelihood = methodSurveys.reduce((sum, survey) => 
          sum + survey.responses.likelihood, 0) / methodSurveys.length;
      }
    });
    
    return methodStats;
  };
  
  // Calculate final survey rankings
  const calculateMethodRankings = () => {
    if (finalSurveys.length === 0) return null;
    
    const rankCounts = {
      A: { rank1: 0, rank2: 0, rank3: 0, rank4: 0 },
      B: { rank1: 0, rank2: 0, rank3: 0, rank4: 0 },
      C: { rank1: 0, rank2: 0, rank3: 0, rank4: 0 },
      D: { rank1: 0, rank2: 0, rank3: 0, rank4: 0 }
    };
    
    // Count rankings for each method
    finalSurveys.forEach(survey => {
      survey.methodRanking.forEach((method, index) => {
        const rankKey = `rank${index + 1}` as keyof typeof rankCounts.A;
        rankCounts[method as keyof typeof rankCounts][rankKey]++;
      });
    });
    
    // Count "most engaging" and "most helpful" votes
    const mostEngaging = {
      A: 0,
      B: 0,
      C: 0,
      D: 0
    };
    
    const mostHelpful = {
      A: 0,
      B: 0,
      C: 0,
      D: 0
    };
    
    finalSurveys.forEach(survey => {
      mostEngaging[survey.mostEngaging as keyof typeof mostEngaging]++;
      mostHelpful[survey.mostHelpful as keyof typeof mostHelpful]++;
    });
    
    return { rankCounts, mostEngaging, mostHelpful };
  };
  
  // Format number to 2 decimal places
  const formatNumber = (num: number) => {
    return Math.round(num * 100) / 100;
  };
  
  // Export data as CSV
  const exportData = () => {
    // Test results CSV
    let testCsv = 'TestID,UserID,MethodID,PassageID,Score,TimeSpent,Timestamp\n';
    testResults.forEach(result => {
      testCsv += `${result.testId},${result.userId},${result.methodId},${result.passageId},${result.score},${result.timeSpent},${result.timeStamp}\n`;
    });
    
    // Survey responses CSV
    let surveyCsv = 'ResponseID,UserID,TestID,MethodID,Difficulty,Engagement,Helpfulness,Likelihood,Comments,Timestamp\n';
    surveyResponses.forEach(response => {
      surveyCsv += `${response.responseId},${response.userId},${response.testId},${response.methodId},${response.responses.difficulty},${response.responses.engagement},${response.responses.helpfulness},${response.responses.likelihood},"${response.comments || ''}",${response.timestamp}\n`;
    });
    
    // Final surveys CSV
    let finalCsv = 'UserID,Rank1,Rank2,Rank3,Rank4,MostEngaging,MostHelpful,Feedback,Timestamp\n';
    finalSurveys.forEach(survey => {
      finalCsv += `${survey.userId},${survey.methodRanking[0]},${survey.methodRanking[1]},${survey.methodRanking[2]},${survey.methodRanking[3]},${survey.mostEngaging},${survey.mostHelpful},"${survey.feedback || ''}",${survey.timestamp}\n`;
    });
    
    // Create and download the files
    const download = (data: string, filename: string) => {
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    
    download(testCsv, 'test-results.csv');
    download(surveyCsv, 'survey-responses.csv');
    download(finalCsv, 'final-surveys.csv');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-lg mb-2">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Access denied. You need administrator privileges to view this page.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const methodStats = calculateMethodStats();
  const rankings = calculateMethodRankings();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">iTELL Cloze Test Dashboard</h1>
        
        <button
          onClick={exportData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Export Data (CSV)
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Participants</h3>
          <p className="text-3xl font-bold">{new Set(testResults.map(r => r.userId)).size}</p>
          <p className="text-gray-500 text-sm">Total participants</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Tests Completed</h3>
          <p className="text-3xl font-bold">{testResults.length}</p>
          <p className="text-gray-500 text-sm">Total tests completed</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Final Surveys</h3>
          <p className="text-3xl font-bold">{finalSurveys.length}</p>
          <p className="text-gray-500 text-sm">Completed final surveys</p>
        </div>
      </div>
      
      {/* Method Comparison */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Method Comparison</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Helpfulness</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Likelihood</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(methodStats).map(([method, stats]) => (
                <tr key={method}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">Method {method}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{stats.count}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatNumber(stats.averageScore)}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatNumber(stats.averageDifficulty)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatNumber(stats.averageEngagement)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatNumber(stats.averageHelpfulness)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatNumber(stats.averageLikelihood)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Rankings from Final Survey */}
      {rankings && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Method Rankings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Preference Ranking</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank 1</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank 2</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank 3</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank 4</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(rankings.rankCounts).map(([method, ranks]) => (
                      <tr key={method}>
                        <td className="px-4 py-2 whitespace-nowrap font-medium">Method {method}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{ranks.rank1}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{ranks.rank2}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{ranks.rank3}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{ranks.rank4}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Most Engaging & Helpful</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Most Engaging</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Most Helpful</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(rankings.mostEngaging).map(([method, count]) => (
                      <tr key={method}>
                        <td className="px-4 py-2 whitespace-nowrap font-medium">Method {method}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{count}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{rankings.mostHelpful[method as keyof typeof rankings.mostHelpful]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}