import React, { useState, useEffect } from 'react';
import { GapItem } from '../utils/types';

interface AnnotationComponentProps {
  gaps: GapItem[];
  value: Record<string, string>;
  onChange: (annotations: Record<string, string>) => void;
  isComplete: boolean;
  setIsComplete: (isComplete: boolean) => void;
}

export default function AnnotationComponent({ 
  gaps, 
  value,
  onChange,
  isComplete,
  setIsComplete
}: AnnotationComponentProps) {
  const [annotations, setAnnotations] = useState<Record<string, string>>(value || {});
  
  // Options for the annotation dropdown
  const annotationOptions = [
    { value: 'sentence', label: 'Sentence-predictable' },
    { value: 'passage', label: 'Passage-predictable' },
    { value: 'source', label: 'Source-predictable' },
    { value: 'unpredictable', label: 'Unpredictable' }
  ];
  
  // Check if all gaps have been annotated
  useEffect(() => {
    const allAnnotated = gaps.every((gap, index) => {
      return annotations[index] !== undefined && annotations[index] !== '';
    });
    
    setIsComplete(allAnnotated);
  }, [annotations, gaps, setIsComplete]);
  
  // Handle annotation change
  const handleAnnotationChange = (index: number, value: string) => {
    const newAnnotations = { ...annotations, [index]: value };
    setAnnotations(newAnnotations);
    onChange(newAnnotations);
  };
  
  return (
    <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium mb-4">Information Source Annotation</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          For each gap you completed, identify where you found the information needed to answer:
        </p>
        <ul className="text-sm text-gray-600 ml-5 list-disc">
          <li><strong>Sentence-predictable:</strong> Can be guessed from the sentence it appears in</li>
          <li><strong>Passage-predictable:</strong> Can be guessed from the cloze passage</li>
          <li><strong>Source-predictable:</strong> Can only be guessed with information from the original page</li>
          <li><strong>Unpredictable:</strong> Cannot be predicted without external information</li>
        </ul>
      </div>
      
      <div className="space-y-4">
        {gaps.map((gap, index) => (
          <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white border rounded-md">
            <div className="flex-grow">
              <span className="font-medium">Gap {index + 1}:</span> 
              <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-blue-800">
                {gap.word}
              </span>
              <span className="ml-2 text-gray-500">
                &ldquo;{gap.context.replace(/_+/g, `[${gap.word}]`)}&rdquo;
              </span>
            </div>
            
            <div>
              <select
                value={annotations[index] || ''}
                onChange={(e) => handleAnnotationChange(index, e.target.value)}
                className={`p-2 border rounded-md ${!annotations[index] ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                aria-label={`Annotation for gap ${gap.word}`}
              >
                <option value="">Select source...</option>
                {annotationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
      
      {!isComplete && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md">
          Please annotate all gaps before proceeding.
        </div>
      )}
    </div>
  );
}