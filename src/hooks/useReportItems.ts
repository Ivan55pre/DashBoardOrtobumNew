import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../contexts/AuthContext';
import { isAdminUser } from '../utils/auth';

interface UseReportItemsProps {
  organizationIds: string[] | null;
  reportType: 'debt' | 'inventory_turnover' | 'plan_fact' | 'cash_bank';
  reportDate: string;
  orderColumns?: { column: string, options?: { ascending: boolean } }[];
  onNotFound?: () => void; // Callback для вызова, когда отчет не найден
}

const reportTypeToTableMap = {
  debt: 'debt_reports_items',
  inventory_turnover: 'inventory_turnover_report_items',
  plan_fact: 'plan_fact_reports_items',
  cash_bank: 'cash_bank_report_items',
};

export const useReportItems = <T>({ organizationIds, reportType, reportDate, orderColumns = [], onNotFound }: UseReportItemsProps) => {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Мемоизируем колбэк, чтобы избежать лишних перезапусков useEffect
  const handleNotFound = useCallback(() => {
    onNotFound?.();
  }, [onNotFound]);

  useEffect(() => {
    const fetchReportItems = async () => {
      if (!organizationIds || organizationIds.length === 0 || !reportDate) {
        setData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setData(null);

      try {
          const tableName = reportTypeToTableMap[reportType];
          let query = supabase
            .from(tableName)
            .select(`*, report_metadata!inner(id, organization_id, report_date, organizations(name))`)
            .eq('report_metadata.report_date', reportDate);
  
          orderColumns.forEach(order => { query = query.order(order.column, order.options); });
  
          const { data: reportItems, error: itemsError } = await query;
          if (itemsError) throw itemsError;
  
          // Фильтрация по организациям, если пользователь не администратор
          // Фильтрация по организациям, если пользователь не администратор
          let filteredItems = reportItems || [];
          if (reportItems && !(await isAdminUser())) {
            filteredItems = reportItems.filter(item =>
              organizationIds?.includes(item.report_metadata.organization_id)
            );
          }
          if (reportItems && !(await isAdminUser())) {
            filteredItems = reportItems.filter(item =>
              organizationIds?.includes(item.report_metadata.organization_id)
            );
          }
  
          if (filteredItems.length > 0) {
            const itemsWithOrg = filteredItems.map(item => ({
              ...item,
              organization_name: item.report_metadata?.organizations?.name || 'Unknown Org'
            }));
            setData(itemsWithOrg as T[]);
          } else {
            setData(null);
            handleNotFound();
          }
      } catch (err: any) {
        console.error(`Error loading ${reportType} report:`, err);
        setError(err);
        handleNotFound(); // Вызываем fallback и при ошибке
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportItems();
  }, [JSON.stringify(organizationIds), reportType, reportDate, handleNotFound, JSON.stringify(orderColumns)]);

  return { data, isLoading, error };
};
