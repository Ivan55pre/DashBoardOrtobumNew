import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import { useReportDate } from '../contexts/ReportDateContext';

/**
 * A custom hook to fetch data for a specific dashboard widget.
 * It handles user organizations, report dates, loading, and error states.
 * @param widgetType The identifier for the widget data to fetch (e.g., 'cash_bank', 'debt').
 * @returns An object containing:
 * - `data`: The fetched data for the widget.
 * - `isLoading`: A boolean indicating if the data is currently being fetched.
 * - `error`: An Error object if the fetch failed, otherwise null.
 * - `refetch`: A function to manually trigger a refetch of the data.
 */
export const useDashboardData = <T>(widgetType: string) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { reportDate } = useReportDate();

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: orgMembers, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const organizationIds = orgMembers.map(m => m.organization_id);
      if (organizationIds.length === 0) {
        throw new Error("Не удалось найти организацию для пользователя.");
      }

      const { data: result, error: rpcError } = await supabase.rpc('get_dashboard_widget_data', {
        p_widget_type: widgetType,
        p_report_date: reportDate,
        p_organization_ids: organizationIds,
      });

      if (rpcError) throw rpcError;

      setData(result as T);
    } catch (e: any) {
      setError(new Error(e.message || `Не удалось загрузить данные для виджета.`));
    } finally {
      setIsLoading(false);
    }
  }, [widgetType, reportDate, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};