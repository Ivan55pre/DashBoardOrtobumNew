import React, { useState, useEffect } from 'react';
import { supabase } from '../../contexts/AuthContext';
import { useReportDate } from '../../contexts/ReportDateContext';
import { formatCurrency } from '../../utils/formatters';
import WidgetCard from './WidgetCard';
import { Package } from 'lucide-react';

interface InventoryWidgetProps {
  organizationIds: string[];
}

interface WidgetData {
  total_balance_rub: number;
  change_percent: number;
}

const InventoryWidget: React.FC<InventoryWidgetProps> = ({ organizationIds }) => {
  const { reportDate } = useReportDate();
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!reportDate || organizationIds.length === 0) {
        setData({ total_balance_rub: 0, change_percent: 0 });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_widget_data', {
        p_widget_type: 'inventory',
        p_report_date: reportDate,
        p_organization_ids: organizationIds,
      });

      if (rpcError) {
        console.error('Error fetching inventory widget data:', rpcError);
        setError('Ошибка загрузки');
        setData(null);
      } else {
        setData(rpcData);
      }

      setLoading(false);
    };

    fetchData();
  }, [reportDate, organizationIds]);

  const displayValue = formatCurrency(data?.total_balance_rub ?? 0);

  return (
    <WidgetCard
      title="Товарные запасы"
      icon={Package}
      loading={loading}
      error={error}
      changePercent={data?.change_percent}
    >
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {displayValue}
      </div>
    </WidgetCard>
  );
};

export default InventoryWidget;