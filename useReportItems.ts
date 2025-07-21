import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../contexts/AuthContext';

interface UseReportItemsProps {
  organizationId: string | null;
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

export const useReportItems = <T>({ organizationId, reportType, reportDate, orderColumns = [], onNotFound }: UseReportItemsProps) => {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Мемоизируем колбэк, чтобы избежать лишних перезапусков useEffect
  const handleNotFound = useCallback(() => {
    onNotFound?.();
  }, [onNotFound]);

  useEffect(() => {
    const fetchReportItems = async () => {
      if (!organizationId || !reportDate) {
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
          .select('id')
          .eq('organization_id', organizationId)
          .eq('report_type', reportType)
          .eq('report_date', reportDate)
          .maybeSingle();

        if (metaError) throw metaError;

        if (reportMeta?.id) {
          // 2. Если метаданные есть, получаем данные отчета
          const tableName = reportTypeToTableMap[reportType];
          let query = supabase.from(tableName).select('*').eq('report_id', reportMeta.id);

          // Применяем сортировку
          orderColumns.forEach(order => {
            query = query.order(order.column, order.options);
          });

          const { data: reportItems, error: itemsError } = await query;
          if (itemsError) throw itemsError;
          setData(reportItems as T[]);
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
  }, [organizationId, reportType, reportDate, handleNotFound, JSON.stringify(orderColumns)]); // JSON.stringify для стабильности объекта

  return { data, isLoading, error };
};