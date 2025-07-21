import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../contexts/AuthContext';

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
        // 1. Получаем метаданные отчета
        const { data: reportMeta, error: metaError } = await supabase
          .from('report_metadata')
          .select('id, organization_id, organizations(name)')
          .in('organization_id', organizationIds)
          .eq('report_type', reportType)
          .eq('report_date', reportDate);

        if (metaError) throw metaError;

        if (reportMeta && reportMeta.length > 0) {
          // 2. Если метаданные есть, получаем данные отчета
          const reportIds = reportMeta.map(r => r.id);
          const tableName = reportTypeToTableMap[reportType];
          let query = supabase.from(tableName).select('*').in('report_id', reportIds);

          // Применяем сортировку
          orderColumns.forEach(order => {
            query = query.order(order.column, order.options);
          });

          const { data: reportItems, error: itemsError } = await query;
          if (itemsError) throw itemsError;

          // Добавляем имя организации к каждой строке для консолидированного вида
          const itemsWithOrg = (reportItems || []).map(item => {
            const meta = reportMeta.find(m => m.id === (item as any).report_id);
            return { ...item, organization_name: (meta as any)?.organizations?.name || 'Unknown Org' };
          });

          setData(itemsWithOrg as T[]);
        } else {
          setData(null); // Отчет не найден
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