import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  isLoading: boolean;
  error?: Error | null;
  className?: string;
  onRetry?: () => void;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ title, children, isLoading, error, className = '', onRetry }) => {
  return (
    <div className={`card p-6 flex flex-col ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="flex-grow flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        ) : error ? (
          <div className="text-center text-red-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
            <p className="font-semibold">Ошибка загрузки</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-full break-words">{error.message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="btn-secondary btn-sm mt-4 flex items-center mx-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default DashboardWidget;