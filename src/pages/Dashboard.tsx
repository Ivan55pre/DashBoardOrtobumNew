import React from 'react';
import CashBankWidget from '../components/Dashboard/CashBankWidget';
import DebtWidget from '../components/Dashboard/DebtWidget';
import PlanFactWidget from '../components/Dashboard/PlanFactWidget';
import InventoryWidget from '../components/Dashboard/InventoryWidget';
import { useReportDate } from '../contexts/ReportDateContext';

const Dashboard: React.FC = () => {
  const { reportDate } = useReportDate();

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
        <CashBankWidget />
        <DebtWidget />
        <PlanFactWidget />
        <InventoryWidget />
      </div>
    </div>
  );
};

export default Dashboard;