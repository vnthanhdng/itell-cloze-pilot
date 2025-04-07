import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

type MethodId = string;

interface FinalSurveyProps {
  completedMethods: MethodId[];
  onComplete: (results: {
    methodRanking: MethodId[];
    mostEngaging: MethodId;
    mostHelpful: MethodId;
    feedback?: string;
  }) => void;
}

// Define the drag item type
const ItemTypes = {
  METHOD: 'method'
};

interface DraggableMethodProps {
  methodId: MethodId;
  index: number;
  moveMethod: (dragIndex: number, hoverIndex: number) => void;
}

// Display names for the methods
const methodNames: Record<string, string> = {
  'A': 'Contextual Blanks',
  'B': 'Extended Contextual Blanks',
  'C': 'Keyword Blanks'
};

// Draggable method component for ranking
const DraggableMethod: React.FC<DraggableMethodProps> = ({ methodId, index, moveMethod }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.METHOD,
    item: { type: ItemTypes.METHOD, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: ItemTypes.METHOD,
    hover: (item: { index: number }, monitor) => {
      if (item.index === index) {
        return;
      }
      moveMethod(item.index, index);
      item.index = index;
    }
  });

  // Get friendly method name or default to "Method X"
  const displayName = methodNames[methodId] || `Method ${methodId}`;

  return (
    <div
      ref={(node) => {
        if (node) {
          drag(drop(node));
        }
      }}
      className={`p-3 mb-2 bg-white border rounded-md shadow-sm ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex items-center">
        <span className="mr-2 text-gray-500">{index + 1}.</span>
        <span className="font-medium">{displayName}</span>
      </div>
    </div>
  );
};

export default function FinalSurvey({ completedMethods, onComplete }: FinalSurveyProps) {
  console.log('FinalSurvey - completedMethods:', completedMethods);
  
  // Initialize state with the methods in the order they were completed
  const [methodRanking, setMethodRanking] = useState<MethodId[]>([]);
  const [mostEngaging, setMostEngaging] = useState<MethodId>('');
  const [mostHelpful, setMostHelpful] = useState<MethodId>('');
  const [feedback, setFeedback] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize the state from props
  useEffect(() => {
    if (completedMethods && completedMethods.length > 0) {
      setMethodRanking([...completedMethods]);
      setMostEngaging(completedMethods[0]);
      setMostHelpful(completedMethods[0]);
    }
  }, [completedMethods]);

  // Function to move a method in the ranking
  const moveMethod = (dragIndex: number, hoverIndex: number) => {
    const draggedMethod = methodRanking[dragIndex];
    const newRanking = [...methodRanking];
    newRanking.splice(dragIndex, 1);
    newRanking.splice(hoverIndex, 0, draggedMethod);
    setMethodRanking(newRanking);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that we have all required data
    if (methodRanking.length === 0) {
      setValidationError('Please rank all methods before submitting.');
      return;
    }
    
    if (!mostEngaging) {
      setValidationError('Please select the most engaging method.');
      return;
    }
    
    if (!mostHelpful) {
      setValidationError('Please select the most helpful method.');
      return;
    }
    
    setValidationError(null);
    
    // Log submission data for debugging
    console.log('FinalSurvey - Submitting:', {
      methodRanking,
      mostEngaging,
      mostHelpful,
      feedback
    });
    
    onComplete({
      methodRanking,
      mostEngaging,
      mostHelpful,
      feedback
    });
  };

  // If we don't have enough methods, show an error
  if (!completedMethods || completedMethods.length < 3) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>Not enough test methods completed. Expected at least 3 methods, found {completedMethods?.length || 0}.</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-3xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-6">Final Survey</h2>
        
        {validationError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{validationError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Method Ranking */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Rank the methods from most preferred (1) to least preferred ({completedMethods.length})
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop to reorder the methods based on your preference.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-md">
              {methodRanking.map((method, index) => (
                <DraggableMethod
                  key={method}
                  methodId={method}
                  index={index}
                  moveMethod={moveMethod}
                />
              ))}
            </div>
          </div>

          {/* Most Engaging Method */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Which method was most engaging?
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {completedMethods.map((method) => (
                <label
                  key={`engaging-${method}`}
                  className={`flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                    mostEngaging === method
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mostEngaging"
                    value={method}
                    checked={mostEngaging === method}
                    onChange={() => setMostEngaging(method)}
                    className="sr-only"
                  />
                  <span>{methodNames[method] || `Method ${method}`}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Most Helpful Method */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Which method was most helpful for learning?
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {completedMethods.map((method) => (
                <label
                  key={`helpful-${method}`}
                  className={`flex items-center justify-center p-3 border rounded-md cursor-pointer ${
                    mostHelpful === method
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mostHelpful"
                    value={method}
                    checked={mostHelpful === method}
                    onChange={() => setMostHelpful(method)}
                    className="sr-only"
                  />
                  <span>{methodNames[method] || `Method ${method}`}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Feedback */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Additional Feedback (Optional)
            </h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md"
              rows={5}
              placeholder="Please share any additional thoughts about your experience comparing the different methods..."
            ></textarea>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Complete Study
            </button>
          </div>
        </form>
      </div>
    </DndProvider>
  );
}