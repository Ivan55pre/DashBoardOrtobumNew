import React from 'react';
import { Banknote } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useDashboardData } from '../../hooks/useDashboardData';
import { formatCurrency } from '../../utils/formatters';

interface CashBankSummary {
  total_balance_current: number;
}

const CashBankWidget: React.FC = () => {
  const { data, isLoading, error, refetch } = useDashboardData<CashBankSummary>('cash_bank');

  return (
    <DashboardWidget title="Денежные средства" isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="text-center">
        <Banknote className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <p className="text-3xl font-bold text-gray-800 dark:text-white">
          {formatCurrency(data?.total_balance_current)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Общий остаток
        </p>
      </div>
    </DashboardWidget>
  );
};

export default CashBankWidget;