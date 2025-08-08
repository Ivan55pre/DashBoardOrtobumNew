import React, { useState, useEffect } from 'react';
import { supabase } from '../../contexts/AuthContext';
import { useReportDate } from '../../contexts/ReportDateContext';
import WidgetCard from './WidgetCard';
import { BarChart3 } from 'lucide-react';

interface PlanFactWidgetProps {
  organizationIds: string[];
}

interface WidgetData {
  overall_execution_percent: number;
  change_percent: number; // This is change in percentage points (p.p.)
}

const PlanFactWidget: React.FC<PlanFactWidgetProps> = ({ organizationIds }) => {
  const { reportDate } = useReportDate();
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!reportDate || organizationIds.length === 0) {
        setData({ overall_execution_percent: 0, change_percent: 0 });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_widget_data', {
        p_widget_type: 'plan_fact',
        p_report_date: reportDate,
        p_organization_ids: organizationIds,
      });

      if (rpcError) {
        console.error('Error fetching plan/fact widget data:', rpcError);
        setError('Ошибка загрузки');
        setData(null);
      } else {
        setData(rpcData);
      }

      setLoading(false);
    };

    fetchData();
  }, [reportDate, JSON.stringify(organizationIds)]);

  const displayValue = `${(data?.overall_execution_percent ?? 0).toFixed(1)}%`;

  return (
    <WidgetCard
      title="Выручка план-факт"
      icon={BarChart3}
      loading={loading}
      error={error}
      changePercent={data?.change_percent}
      changeType="p.p."
    >
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {displayValue}
      </div>
    </WidgetCard>
  );
};

export default PlanFactWidget;