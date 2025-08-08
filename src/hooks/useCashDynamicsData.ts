import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../contexts/AuthContext';

export interface CashDynamicPoint {
  report_day: string;
  total_balance: number;
}

interface UseCashDynamicsDataProps {
  organizationIds: string[] | null;
  startDate: string | undefined;
  endDate: string | undefined;
}

export const useCashDynamicsData = ({ organizationIds, startDate, endDate }: UseCashDynamicsDataProps) => {
  const [data, setData] = useState<CashDynamicPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!organizationIds || organizationIds.length === 0 || !startDate || !endDate) {
      setIsLoading(false);
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_cash_flow_dynamics', {
        p_organization_ids: organizationIds,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (rpcError) throw rpcError;

      setData(result || []);
    } catch (e: any) {
      setError(new Error(e.message || `Не удалось загрузить динамику денежных средств.`));
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(organizationIds), startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};