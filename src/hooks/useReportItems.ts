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
// ---
        // восстанавливаем этот фпагмент если // меняю ReportMeta на allReportMeta - чтобы далее работало
        // конкретная дата отчета, если такой нет - ((
          // 1. Получаем метаданные отчета
        const { data: allReportMeta, error: metaError } = await supabase
          .from('report_metadata')
          .select('id, organization_id, organizations(name)')
          .in('organization_id', organizationIds)
          .eq('report_type', reportType)
          .eq('report_date', reportDate); // знак =

        if (metaError) throw metaError;

        if (allReportMeta && allReportMeta.length > 0) {
          // 2. Если метаданные есть, получаем данные отчета
// ---

// ---
/* // восстанавливаем этот фпагмент если
        // 1. Получаем все метаданные отчетов до указанной даты, чтобы найти самую последнюю доступную.
        const { data: allReportMeta, error: metaError } = await supabase
          .from('report_metadata')
          .select('id, organization_id, report_date, organizations(name)')
          .in('organization_id', organizationIds)
          .eq('report_type', reportType)
          .lte('report_date', reportDate); // знак <=

        if (metaError) throw metaError;

        if (allReportMeta && allReportMeta.length > 0) {
  */
 // ---
        // 2. На клиенте находим самую последнюю запись для каждой организации.
          // Это позволяет показать отчет за вчера, если за сегодня данных еще нет.
          const latestMetaMap = new Map<string, typeof allReportMeta[0]>();
          allReportMeta.forEach(meta => {
            const existing = latestMetaMap.get(meta.organization_id);
            if (!existing || new Date(meta.report_date) > new Date(existing.report_date)) {
              latestMetaMap.set(meta.organization_id, meta);
            }
          });
          const reportMeta = Array.from(latestMetaMap.values());

          // 3. Если метаданные есть, получаем данные отчета
          const reportIds = reportMeta.map(r => r.id);
          const tableName = reportTypeToTableMap[reportType];
          let query = supabase.from(tableName).select('*').in('report_id', reportIds);

          // Применяем сортировку
          orderColumns.forEach(order => {
            query = query.order(order.column, order.options);
          });

          const { data: reportItems, error: itemsError } = await query;
          if (itemsError) throw itemsError;

          // Создаем карту для быстрого поиска имени организации по report_id.
          // Это гораздо эффективнее, чем использовать .find() в цикле (O(N*M) -> O(N+M)).
          const orgNameMap = new Map<string, string>();
          reportMeta.forEach(meta => {
            if (meta.id && (meta as any).organizations?.name) {
              orgNameMap.set(meta.id, (meta as any).organizations.name);
            }
          });

          // Добавляем имя организации к каждой строке, используя созданную карту.
          const itemsWithOrg = (reportItems || []).map(item => ({ ...item, organization_name: orgNameMap.get((item as any).report_id) || 'Unknown Org' }));
          
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