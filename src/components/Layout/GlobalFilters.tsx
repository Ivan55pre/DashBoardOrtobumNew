import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useReportDate } from '../../contexts/ReportDateContext'
import OrganizationFilter from './OrganizationFilter'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

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

        {/* Date Range Picker for the new chart */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Период для графика</label>
          <Popover>
            <PopoverTrigger asChild>
              <button className="btn-secondary flex items-center space-x-2 w-full sm:w-auto justify-center h-10 px-4">
                <CalendarIcon className="w-4 h-4" />
                <span>{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'dd LLL, y', { locale: ru })} - ${format(dateRange.to, 'dd LLL, y', { locale: ru })}` : format(dateRange.from, 'dd LLL, y', { locale: ru })) : 'Выберите период'}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={ru} />
            </PopoverContent>
          </Popover>
        </div>

        <OrganizationFilter />
      </div>
    </div>
  )
}

export default GlobalFilters