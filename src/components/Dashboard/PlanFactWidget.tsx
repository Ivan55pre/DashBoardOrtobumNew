import React from 'react';
import { Target } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useDashboardData } from '../../hooks/useDashboardData';
import { formatCurrency } from '../../utils/formatters';

interface PlanFactSummary {
  total_plan: number;
  total_fact: number;
  overall_execution_percent: number;
}

const getPercentColor = (percent: number | null | undefined): string => {
    if (percent === null || percent === undefined) return 'text-gray-800 dark:text-white';
    if (percent >= 100) return 'text-green-500';
    if (percent >= 80) return 'text-yellow-500';
    return 'text-red-500';
};

const PlanFactWidget: React.FC = () => {
  const { data, isLoading, error, refetch } = useDashboardData<PlanFactSummary>('plan_fact');

  return (
    <DashboardWidget title="План-факт выручки" isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="text-center">
        <Target className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <p className={`text-3xl font-bold ${getPercentColor(data?.overall_execution_percent)}`}>
          {data?.overall_execution_percent?.toFixed(1) ?? '0.0'}%
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Факт: {formatCurrency(data?.total_fact)} / План: {formatCurrency(data?.total_plan)}
        </p>
      </div>
    </DashboardWidget>
  );
};

export default PlanFactWidget;