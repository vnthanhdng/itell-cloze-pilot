import React from 'react';

interface AlertProps {
  variant?: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
  className?: string;
}

export const Alert = ({
  variant = 'info',
  children,
  className = '',
}: AlertProps) => {
  const variantStyles = {
    info: 'bg-blue-50 border-blue-500 text-blue-700',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-700',
    error: 'bg-red-50 border-red-500 text-red-700',
    success: 'bg-green-50 border-green-500 text-green-700',
  };

  return (
    <div className={`border-l-4 p-4 ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
};

export const AlertDescription = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={`text-sm ${className}`}>{children}</div>;
};