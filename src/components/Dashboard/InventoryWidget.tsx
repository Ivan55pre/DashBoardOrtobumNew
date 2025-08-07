import React from 'react';
import { Package } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useDashboardData } from '../../hooks/useDashboardData';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface InventorySummary {
  total_balance_rub: number;
  total_quantity_pairs: number;
}

const InventoryWidget: React.FC = () => {
  const { data, isLoading, error, refetch } = useDashboardData<InventorySummary>('inventory');

  return (
    <DashboardWidget title="Товарные запасы" isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="text-center">
        <Package className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        <p className="text-3xl font-bold text-gray-800 dark:text-white">
          {formatCurrency(data?.total_balance_rub)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formatNumber(data?.total_quantity_pairs)} пар
        </p>
      </div>
    </DashboardWidget>
  );
};

export default InventoryWidget;