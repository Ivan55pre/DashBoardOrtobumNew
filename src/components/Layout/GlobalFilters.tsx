import React from 'react';
import { useLocation } from 'react-router-dom';
import { useReportDate } from '../../contexts/ReportDateContext';
import OrganizationFilter from './OrganizationFilter';

// A mock DatePicker component since the original is not provided.
// In a real scenario, this would be a proper date picker component.
const DatePicker: React.FC = () => {
  const { reportDate, setReportDate } = useReportDate();

  return (
    <div>
      <label htmlFor="report-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Дата отчета
      </label>
      <input
        type="date"
        id="report-date"
        value={reportDate}
        onChange={(e) => setReportDate(e.target.value)}
        className="form-input block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-dark-800 dark:border-gray-600 dark:text-white"
      />
    </div>
  );
};


const GlobalFilters: React.FC = () => {
  const location = useLocation();

  // Only show filters on the dashboard page for now.
  if (location.pathname !== '/') {
    return null;
  }

  return (
    <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <DatePicker />
        <OrganizationFilter />
      </div>
    </div>
  );
};

export default GlobalFilters;