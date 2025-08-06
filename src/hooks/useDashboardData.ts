import { useState, useEffect } from 'react';
import { supabase } from '../contexts/AuthContext';
import { useReportDate } from '../contexts/ReportDateContext';

type ReportType = 'cash_bank' | 'debt' | 'plan_fact' | 'inventory';

const reportTypeToRpcMap: Record<ReportType, string> = {
  cash_bank: 'get_cash_bank_dashboard_summary',
  debt: 'get_debt_dashboard_summary',
  plan_fact: 'get_plan_fact_dashboard_summary',
  inventory: 'get_inventory_dashboard_summary',
};

export const useDashboardData = <T>(reportType: ReportType) => {
  const { reportDate } = useReportDate();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!reportDate) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const rpcName = reportTypeToRpcMap[reportType];
        const { data: rpcData, error: rpcError } = await supabase.rpc(rpcName, {
          p_report_date: reportDate,
        });

        if (rpcError) throw rpcError;

        setData(rpcData && rpcData.length > 0 ? rpcData[0] : null);
      } catch (err: any) {
        console.error(`Error fetching dashboard data for ${reportType}:`, err);
        setError(err);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [reportDate, reportType]);

  return { data, isLoading, error };
};