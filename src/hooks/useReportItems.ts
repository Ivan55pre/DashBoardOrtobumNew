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
        const tableName = reportTypeToTableMap[reportType];

        // WORKAROUND: The 'cash_bank_report_items' table is missing the foreign key relationship
        // to 'report_metadata' in the database schema, which causes the implicit inner join to fail.
        // This block handles this specific case by performing a two-step query:
        // 1. Fetch the relevant report metadata.
        // 2. Fetch the cash/bank items using the report IDs from step 1.
        // This is less efficient but avoids the error until the schema is fixed.
        // This assumes the foreign key column in 'cash_bank_report_items' is named 'report_id'.
        if (reportType === 'cash_bank') {
          // Step 1: Fetch report metadata to get report IDs and organization names.
          const { data: reports, error: reportsError } = await supabase
            .from('report_metadata')
            .select('id, organizations(name)')
            .in('organization_id', organizationIds)
            .eq('report_type', reportType)
            .eq('report_date', reportDate);

          if (reportsError) throw reportsError;

          if (!reports || reports.length === 0) {
            setData(null);
            handleNotFound();
          } else {
            const reportIds = reports.map(r => r.id);
            const reportIdToOrgNameMap = new Map<string, string>(
              reports.map(r => [r.id, r.organizations?.name || 'Unknown Org'])
            );

            // Step 2: Fetch report items using the collected report IDs.
            let itemsQuery = supabase
              .from(tableName)
              .select('*')
              .in('report_id', reportIds); // Assumes FK column is 'report_id'

            orderColumns.forEach(order => {
              itemsQuery = itemsQuery.order(order.column, order.options);
            });

            const { data: reportItems, error: itemsError } = await itemsQuery;
            if (itemsError) throw itemsError;

            if (reportItems && reportItems.length > 0) {
              // Manually attach the organization name to each item.
              const itemsWithOrg = reportItems.map(item => ({
                ...(item as any),
                organization_name: reportIdToOrgNameMap.get((item as any).report_id) || 'Unknown Org',
              }));
              setData(itemsWithOrg as T[]);
            } else {
              setData(null);
              handleNotFound();
            }
          }
        } else {
          // Original logic for all other reports with a valid FK relationship
          let query = supabase
            .from(tableName)
            .select(`*, report_metadata!inner(id, organization_id, report_date, organizations(name))`)
            .in('report_metadata.organization_id', organizationIds)
            .eq('report_metadata.report_type', reportType)
            .eq('report_metadata.report_date', reportDate);

          orderColumns.forEach(order => { query = query.order(order.column, order.options); });

          const { data: reportItems, error: itemsError } = await query;
          if (itemsError) throw itemsError;

          if (reportItems && reportItems.length > 0) {
            const itemsWithOrg = reportItems.map(item => ({ ...(item as any), organization_name: (item as any).report_metadata?.organizations?.name || 'Unknown Org' }));
            setData(itemsWithOrg as T[]);
          } else {
            setData(null);
            handleNotFound();
          }
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
