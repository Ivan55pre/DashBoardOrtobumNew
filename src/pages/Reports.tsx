import React from 'react'
import ChartWidget from '../components/Dashboard/ChartWidget'
import DataTable from '../components/Dashboard/DataTable'
import InventoryTurnoverReport from '../components/Reports/InventoryTurnoverReport'
import PlanFactRevenueReport from '../components/Reports/PlanFactRevenueReport'
import InventoryBalanceReport from '../components/Reports/InventoryBalanceReport'
import DebtReport from '../components/Reports/DebtReport'
import CashBankReport from '../components/Reports/CashBankReport'

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Отчеты
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWidget title="Продажи по категориям" type="bar" />
        <ChartWidget title="Динамика роста" type="line" />
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <InventoryBalanceReport />
        <PlanFactRevenueReport />
        <InventoryTurnoverReport />
        <DebtReport />
        <CashBankReport />
        <DataTable title="Детальный отчет по продажам" />
      </div>
    </div>
  )
}

export default Reports