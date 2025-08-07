import React from 'react';
import CashBankWidget from '../components/Dashboard/CashBankWidget';
import DebtWidget from '../components/Dashboard/DebtWidget';
import PlanFactWidget from '../components/Dashboard/PlanFactWidget';
import InventoryWidget from '../components/Dashboard/InventoryWidget';
import { useReportDate } from '../contexts/ReportDateContext';
import NoOrganizationState from '../components/Layout/NoOrganizationState';
import { useOrganizationCheck } from '../hooks/useOrganizationCheck';
import { useWidgetSettings } from '../hooks/useWidgetSettings';

const WIDGET_MAP: Record<string, React.ReactNode> = {
  cash_bank: <CashBankWidget />,
  debt: <DebtWidget />,
  plan_fact: <PlanFactWidget />,
  inventory: <InventoryWidget />,
};

const Dashboard: React.FC = () => {
  const { reportDate } = useReportDate();
  const { isLoading: isOrgCheckLoading, hasOrganizations } = useOrganizationCheck();
  const { settings: widgetSettings, isLoading: areSettingsLoading } = useWidgetSettings();

  const isLoading = isOrgCheckLoading || areSettingsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!hasOrganizations) {
    return <NoOrganizationState />;
  }

  const visibleWidgets = widgetSettings
    .filter(setting => setting.is_visible)
    .map(setting => WIDGET_MAP[setting.widget_id])
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Сводка по показателям
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Данные на {new Date(reportDate + 'T00:00:00').toLocaleDateString('ru-RU')} г.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {visibleWidgets.map((WidgetComponent, index) => (
          <React.Fragment key={index}>{WidgetComponent}</React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;