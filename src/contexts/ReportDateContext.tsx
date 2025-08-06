import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';

interface ReportDateContextType {
  reportDate: string;
  setReportDate: (date: string) => void;
}

// Создаем контекст с undefined по умолчанию
const ReportDateContext = createContext<ReportDateContextType | undefined>(undefined);

// Создаем провайдер, который будет "оберткой" для компонентов
export const ReportDateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Состояние для хранения выбранной даты
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Мемоизируем значение контекста, чтобы избежать лишних ререндеров у потребителей
  const value = useMemo(() => ({ reportDate, setReportDate }), [reportDate]);

  return (
    <ReportDateContext.Provider value={value}>
      {children}
    </ReportDateContext.Provider>
  );
};

// Создаем кастомный хук для удобного доступа к контексту
export const useReportDate = () => {
  const context = useContext(ReportDateContext);
  if (context === undefined) {
    // Если компонент используется вне провайдера, выбрасываем ошибку
    throw new Error('useReportDate must be used within a ReportDateProvider');
  }
  return context;
};