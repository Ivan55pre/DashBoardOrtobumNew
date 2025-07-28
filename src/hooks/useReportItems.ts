import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../contexts/AuthContext';

interface UseReportItemsProps {
  organizationIds: string[] | null;
  reportType: 'debt' | 'inventory_turnover' | 'plan_fact' | 'cash_bank';
  reportDate?: string;
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
      if (!organizationIds || organizationIds.length === 0) {
        setData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        // 1. Загружаем строки отчета через связь с report_metadata,
        //    фильтруя по дате отчета именно в метаданных
        const tableName = reportTypeToTableMap[reportType];
        let query = supabase
          .from(tableName)
          .select(
            `*, report_metadata!inner(id, organization_id, report_date, organizations(name))`
          )
          .in('report_metadata.organization_id', organizationIds)
          .eq('report_metadata.report_type', reportType);

        // Применяем фильтр по дате, только если она указана
        if (reportDate) {
          query = query.eq('report_metadata.report_date', reportDate);
        }

        // Применяем сортировку
        orderColumns.forEach(order => {
          query = query.order(order.column, order.options);
        });

        const { data: reportItems, error: itemsError } = await query;
          if (itemsError) throw itemsError;

          if (reportItems && reportItems.length > 0) {
            // Добавляем имя организации к каждой строке через join
            const itemsWithOrg = reportItems.map(item => {
              const meta = (item as any).report_metadata;
              return {
                ...(item as any),
                organization_name: meta?.organizations?.name || 'Unknown Org',
              };
            });

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