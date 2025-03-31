import React, { useState } from 'react';

interface PostTestSurveyProps {
  methodId: string;
  testId: string;
  onComplete: (responses: {
    difficulty: number;
    engagement: number;
    helpfulness: number;
    likelihood: number;
    comments?: string;
  }) => void;
}

export default function PostTestSurvey({ 
  methodId, 
  testId, 
  onComplete 
}: PostTestSurveyProps) {
  const [difficulty, setDifficulty] = useState<number>(3);
  const [engagement, setEngagement] = useState<number>(3);
  const [helpfulness, setHelpfulness] = useState<number>(3);
  const [likelihood, setLikelihood] = useState<number>(3);
  const [comments, setComments] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onComplete({
      difficulty,
      engagement,
      helpfulness,
      likelihood,
      comments
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Test Feedback</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Difficulty Rating */}
        <div>
          <label className="block text-lg font-medium mb-2">
            How difficult was this test?
          </label>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Very Easy</span>
            <span>Very Difficult</span>
          </div>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={`difficulty-${value}`} className="flex flex-col items-center">
                <input
                  type="radio"
                  name="difficulty"
                  value={value}
                  checked={difficulty === value}
                  onChange={() => setDifficulty(value)}
                  className="form-radio h-4 w-4"
                />
                <span className="mt-1">{value}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Engagement Rating */}
        <div>
          <label className="block text-lg font-medium mb-2">
            How engaging was this format?
          </label>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Not at all</span>
            <span>Very Engaging</span>
          </div>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={`engagement-${value}`} className="flex flex-col items-center">
                <input
                  type="radio"
                  name="engagement"
                  value={value}
                  checked={engagement === value}
                  onChange={() => setEngagement(value)}
                  className="form-radio h-4 w-4"
                />
                <span className="mt-1">{value}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Helpfulness Rating */}
        <div>
          <label className="block text-lg font-medium mb-2">
            How helpful was this for learning?
          </label>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Not Helpful</span>
            <span>Very Helpful</span>
          </div>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={`helpfulness-${value}`} className="flex flex-col items-center">
                <input
                  type="radio"
                  name="helpfulness"
                  value={value}
                  checked={helpfulness === value}
                  onChange={() => setHelpfulness(value)}
                  className="form-radio h-4 w-4"
                />
                <span className="mt-1">{value}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Likelihood Rating */}
        <div>
          <label className="block text-lg font-medium mb-2">
            How likely would you use this in a textbook?
          </label>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Not Likely</span>
            <span>Very Likely</span>
          </div>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={`likelihood-${value}`} className="flex flex-col items-center">
                <input
                  type="radio"
                  name="likelihood"
                  value={value}
                  checked={likelihood === value}
                  onChange={() => setLikelihood(value)}
                  className="form-radio h-4 w-4"
                />
                <span className="mt-1">{value}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-lg font-medium mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={4}
            placeholder="Please share any additional thoughts about this test method..."
          ></textarea>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}