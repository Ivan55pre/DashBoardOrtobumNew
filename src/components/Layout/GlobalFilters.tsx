import React from 'react'
import { useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useReportDate } from '../../contexts/ReportDateContext'
import OrganizationFilter from './OrganizationFilter'

const GlobalFilters: React.FC = () => {
  const location = useLocation()
  const { reportDate, setReportDate, dateRange, setDateRange } = useReportDate()

  // Only show filters on the dashboard page for now.
  if (location.pathname !== '/') {
    return null
  }

  return (
    <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Single Date Picker for other reports */}
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

        {/* Date Range Picker for the new chart - using native inputs */}
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Начало периода
          </label>
          <input
            type="date"
            id="start-date"
            value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined }))}
            className="form-input block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-dark-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Конец периода
          </label>
          <input
            type="date"
            id="end-date"
            value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined }))}
            className="form-input block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-dark-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        <OrganizationFilter />
      </div>
    </div>
  )
}

export default GlobalFilters