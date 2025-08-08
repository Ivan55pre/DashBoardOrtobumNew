import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  icon: React.ElementType;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}

const WidgetCard: React.FC<WidgetCardProps> = ({ title, icon: Icon, loading, error, children }) => {
  return (
    <div className="card p-6 flex flex-col justify-between h-40">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">{title}</h3>
          <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
            <Icon className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ) : error ? (
          <div className="flex items-center text-red-500">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default WidgetCard;