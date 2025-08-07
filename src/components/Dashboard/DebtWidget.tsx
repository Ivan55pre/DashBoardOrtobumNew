import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useDashboardData } from '../../hooks/useDashboardData';
import { formatCurrency } from '../../utils/formatters';

interface DebtSummary {
  total_debt: number;
  total_overdue: number;
  total_credit: number;
}

const DebtWidget: React.FC = () => {
  const { data, isLoading, error, refetch } = useDashboardData<DebtSummary>('debt');

  return (
    <DashboardWidget title="Задолженности" isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="w-full">
        <ArrowLeftRight className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <div className="space-y-3 text-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Нам должны (Дт)</p>
            <p className="text-xl font-semibold text-gray-800 dark:text-white">
              {formatCurrency(data?.total_debt)}
            </p>
            {data && data.total_overdue > 0 && (
              <p className="text-xs text-red-500">
                Просрочено: {formatCurrency(data.total_overdue)}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Мы должны (Кт)</p>
            <p className="text-xl font-semibold text-gray-800 dark:text-white">
              {formatCurrency(data?.total_credit)}
            </p>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default DebtWidget;