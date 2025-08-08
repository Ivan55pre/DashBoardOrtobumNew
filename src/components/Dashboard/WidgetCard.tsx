import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  icon: React.ElementType;
  loading: boolean;
  error: string | null;
  changePercent?: number | null;
  changeType?: 'percent' | 'p.p.'; // p.p. for percentage points
  children: React.ReactNode;
}

const WidgetCard: React.FC<WidgetCardProps> = ({ title, icon: Icon, loading, error, changePercent, changeType = 'percent', children }) => {
  
  const renderChange = () => {
    if (loading || error || changePercent === null || typeof changePercent === 'undefined' || changePercent === 0) {
      return null;
    }
    
    const isPositive = changePercent > 0;
    const isNegative = changePercent < 0;
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    const IconComponent = isPositive ? TrendingUp : TrendingDown;
    const unit = changeType === 'percent' ? '%' : ' п.п.';

    return (
      <div className={`flex items-center text-xs font-medium mt-1 ${colorClass}`}>
        <IconComponent className="w-4 h-4 mr-1" />
        <span>
          {isPositive && '+'}{changePercent.toFixed(1)}{unit} vs. вчера
        </span>
      </div>
    );
  };
  
  return (
    // Increased height to h-44 to accommodate the new change indicator
    <div className="card p-6 flex flex-col justify-between h-44">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">{title}</h3>
          <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
            <Icon className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ) : error ? (
          <div className="flex items-center text-red-500">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <>
            {children}
            {renderChange()}
          </>
        )}
      </div>
    </div>
  );
};

export default WidgetCard;