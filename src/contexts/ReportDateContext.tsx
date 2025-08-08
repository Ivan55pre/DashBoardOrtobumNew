import React, { createContext, useState, useContext, ReactNode, useMemo, Dispatch, SetStateAction } from 'react'
import { addDays } from 'date-fns'

export interface DateRange {
  from: Date | undefined
  to?: Date | undefined
}

interface ReportDateContextType {
  reportDate: string
  setReportDate: (date: string) => void
  dateRange: DateRange | undefined
  setDateRange: Dispatch<SetStateAction<DateRange | undefined>>
}

// Создаем контекст с undefined по умолчанию
const ReportDateContext = createContext<ReportDateContextType | undefined>(undefined)

// Создаем провайдер, который будет "оберткой" для компонентов
export const ReportDateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Состояние для хранения выбранной даты
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date()
  })

  // Мемоизируем значение контекста, чтобы избежать лишних ререндеров у потребителей
  const value = useMemo(() => ({ reportDate, setReportDate, dateRange, setDateRange }), [reportDate, dateRange])

  return (
    <ReportDateContext.Provider value={value}>
      {children}
    </ReportDateContext.Provider>
  )
}

// Создаем кастомный хук для удобного доступа к контексту
export const useReportDate = () => {
  const context = useContext(ReportDateContext)
  if (context === undefined) {
    // Если компонент используется вне провайдера, выбрасываем ошибку
    throw new Error('useReportDate must be used within a ReportDateProvider')
  }
  return context
}