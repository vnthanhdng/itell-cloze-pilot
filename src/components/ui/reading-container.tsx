import React from 'react';

interface ReadingContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const ReadingContainer = ({
  children,
  title,
  subtitle,
  className = '',
}: ReadingContainerProps) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className={`max-w-prose mx-auto px-4 bg-white shadow-md rounded-lg ${className}`}>
        {(title || subtitle) && (
          <div className="border-b pb-4 mb-6 pt-6 px-6">
            {title && <h1 className="text-2xl font-bold text-gray-800">{title}</h1>}
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
        )}
        
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};