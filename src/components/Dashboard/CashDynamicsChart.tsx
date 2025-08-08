import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatNumber } from '../../utils/formatters';
import { AlertTriangle } from 'lucide-react';

interface CashDynamicPoint {
  report_day: string;
  total_balance: number;
}

interface CashDynamicsChartProps {
  data: CashDynamicPoint[];
  isLoading: boolean;
  error: Error | null;
}

const CashDynamicsChart: React.FC<CashDynamicsChartProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="card h-80 flex items-center justify-center">
        <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card h-80 flex flex-col items-center justify-center text-red-500">
        <AlertTriangle className="w-10 h-10 mb-4" />
        <h3 className="text-lg font-semibold">Ошибка загрузки графика</h3>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="card p-6 h-80">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Динамика денежных средств</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis 
            dataKey="report_day" 
            tickFormatter={(dateStr) => format(new Date(dateStr), 'dd MMM', { locale: ru })}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis tickFormatter={(value) => `${formatNumber(value / 1000)}k`} />
          <Tooltip 
            formatter={(value: number) => [formatNumber(value), 'Баланс']}
            labelFormatter={(label: string) => format(new Date(label), 'd MMMM yyyy', { locale: ru })}
          />
          <Legend />
          <Line type="monotone" dataKey="total_balance" name="Общий баланс" stroke="#8884d8" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CashDynamicsChart;