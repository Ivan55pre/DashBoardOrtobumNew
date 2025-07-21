import React, { useState, useEffect } from 'react'
import ChartWidget from '../components/Dashboard/ChartWidget'
import DataTable from '../components/Dashboard/DataTable'
import InventoryTurnoverReport from '../components/Reports/InventoryTurnoverReport'
import PlanFactRevenueReport from '../components/Reports/PlanFactRevenueReport'
import InventoryBalanceReport from '../components/Reports/InventoryBalanceReport'
import DebtReport from '../components/Reports/DebtReport'
import CashBankReport from '../components/Reports/CashBankReport'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../contexts/AuthContext'
import NoOrganizationState from '../components/Layout/NoOrganizationState'

const Reports: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasOrganizations, setHasOrganizations] = useState(true)

  useEffect(() => {
    const checkOrgs = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { count, error } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (error) {
        console.error("Error checking organizations", error)
        setHasOrganizations(false) // Assume no orgs on error
      } else {
        setHasOrganizations(count !== null && count > 0)
      }
      setLoading(false)
    }

    checkOrgs()
  }, [user])

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (!hasOrganizations) {
    return <NoOrganizationState />
  }

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
