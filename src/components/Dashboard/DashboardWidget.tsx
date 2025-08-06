import React from 'react';
import { Loader2 } from 'lucide-react';

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  isLoading: boolean;
  error?: Error | null;
  className?: string;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ title, children, isLoading, error, className = '' }) => {
  return (
    <div className={`card p-6 flex flex-col ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="flex-grow flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        ) : error ? (
          <div className="text-center">
            <p className="text-red-500">Ошибка загрузки</p>
            <p className="text-xs text-gray-500 max-w-full truncate">{error.message}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default DashboardWidget;