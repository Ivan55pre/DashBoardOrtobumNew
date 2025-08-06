import React from 'react';
import { Calendar } from 'lucide-react';
import { useReportDate } from '../../contexts/ReportDateContext';
import { useLocation } from 'react-router-dom';

const GlobalFilters: React.FC = () => {
  const { reportDate, setReportDate } = useReportDate();
  const location = useLocation();

  // Показываем фильтр только на страницах Dashboard и Reports
  const showFilters = location.pathname === '/' || location.pathname === '/reports';

  if (!showFilters) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-4 md:px-6 py-3">
      <div className="flex items-center space-x-4">
        <label htmlFor="global-date-picker" className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Calendar className="w-4 h-4" />
          <span>Дата отчета:</span>
        </label>
        <input
          id="global-date-picker"
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default GlobalFilters;