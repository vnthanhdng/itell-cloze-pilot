import React from 'react';

interface ErrorboxProps {
  title: string;
  description?: string;
  className?: string;
}

export const Errorbox = ({ title, description, className = '' }: ErrorboxProps) => {
  return (
    <div
      className={`bg-red-50 border-l-4 border-red-500 p-4 ${className}`}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {/* Error icon */}
          <svg
            className="h-5 w-5 text-red-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          {description && (
            <div className="mt-2 text-sm text-red-700">{description}</div>
          )}
        </div>
      </div>
    </div>
  );
};