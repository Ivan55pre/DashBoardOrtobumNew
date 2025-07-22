import React, { useState, useEffect } from 'react'
import { ExternalLink, TrendingUp, TrendingDown, Banknote, CreditCard, Package, BarChart3, ChevronsUpDown } from 'lucide-react'
import { supabase } from '../contexts/AuthContext'
import NoOrganizationState from '../components/Layout/NoOrganizationState'
import { useAuth } from '../contexts/AuthContext'
//import { useTelegram } from '../contexts/TelegramContext'

interface DashboardData {
  cashBankTotal: number
  debtTotal: number
  inventoryTotal: number
  planFactExecution: number
  cashBankChange: number
  debtChange: number
  inventoryChange: number
  planFactChange: number
}

interface Organization {
  id: string;
  name: string;
}

const TelegramDashboard: React.FC = () => {
  const { user } = useAuth()
  //const { webApp } = useTelegram()
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    cashBankTotal: 0,
    debtTotal: 0,
    inventoryTotal: 0,
    planFactExecution: 0,
    cashBankChange: 0,
    debtChange: 0,
    inventoryChange: 0,
    planFactChange: 0
  })
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>('') // '' means "All", null means error/no orgs

  const loadDemoData = () => {
    const demoData = {
      cashBankTotal: 7413741,
      debtTotal: 119919250,
      inventoryTotal: 197635082,
      planFactExecution: 71.9,
      cashBankChange: 5.2,
      debtChange: -2.1,
      inventoryChange: 16.42,
      planFactChange: -8.1
    }
    setDashboardData(demoData)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchOrganizations = async () => {
      setLoading(true)
      const { data: orgMembers, error: memberError } = await supabase
        .from('organization_members')
        .select('organizations(id, name)')
        .eq('user_id', user!.id)

      if (memberError) {
        console.error('Error fetching organizations:', memberError)
        setOrganizations([])
        setSelectedOrgId(null) // Set to null to indicate an error state
        loadDemoData()
        return
      }

      const userOrgs = (orgMembers || [])
        .flatMap(m => m.organizations)
        .filter(Boolean) as { id: string; name: string }[]

      setOrganizations(userOrgs)
      // Data loading is triggered by the next useEffect.
    }

    fetchOrganizations()
  }, [user])

  useEffect(() => {
    // Don't load data if orgs haven't been fetched or if there was an error.
    if (selectedOrgId === null) {
      setLoading(false)
      return
    }

    const loadDashboardData = async () => {
      setLoading(true)
      try {
        const targetOrgIds = selectedOrgId === ''
          ? organizations.map(o => o.id)
          : [selectedOrgId]

        if (targetOrgIds.length === 0 && organizations.length > 0) {
          // This case can happen briefly while `organizations` state updates.
          // We wait for the state to be consistent.
          return
        }

        if (targetOrgIds.length === 0 && organizations.length === 0) {
          setDashboardData({ cashBankTotal: 0, debtTotal: 0, inventoryTotal: 0, planFactExecution: 0, cashBankChange: 0, debtChange: 0, inventoryChange: 0, planFactChange: 0 })
          setLoading(false)
          return
        }

        const [cashBankData, debtData, inventoryData, planFactData] = await Promise.all([
          loadCashBankData(targetOrgIds),
          loadDebtData(targetOrgIds),
          loadInventoryData(targetOrgIds),
          loadPlanFactData(targetOrgIds)
        ])
        const newDashboardData = {
          cashBankTotal: cashBankData.total,
          debtTotal: debtData.total,
          inventoryTotal: inventoryData.total,
          planFactExecution: planFactData.execution,
          cashBankChange: cashBankData.change,
          debtChange: debtData.change,
          inventoryChange: inventoryData.change,
          planFactChange: planFactData.change
        }
        setDashboardData(newDashboardData);
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        loadDemoData()
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [selectedOrgId, organizations])

  const loadCashBankData = async (organizationIds: string[]) => {
    try {
      const { data: reportMeta, error: metaError } = await supabase
        .from('report_metadata')
        .select('id')
        .in('organization_id', organizationIds)
        .eq('report_type', 'cash_bank')
        .order('report_date', { ascending: false })

      if (metaError) throw metaError
      if (!reportMeta || reportMeta.length === 0) return { total: 0, change: 0 }

      const reportIds = reportMeta.map(r => r.id)

      const { data, error } = await supabase
        .from('cash_bank_report_items')
        .select('balance_current')
        .in('report_id', reportIds)
        .eq('is_total_row', true)

      if (error) throw error

      const total = (data || []).reduce((sum, item) => sum + (item.balance_current || 0), 0)

      return {
        total: total,
        change: 5.2 // Динамику пока оставляем демо
      }
    } catch (error) {
      console.error('Error loading cash bank data, using demo data.', error)
      return { total: 0, change: 0 }
    }
  }

  const loadDebtData = async (organizationIds: string[]) => {
    try {
      const { data: reportMeta, error: metaError } = await supabase
        .from('report_metadata')
        .select('id')
        .in('organization_id', organizationIds)
        .eq('report_type', 'debt')
        .order('report_date', { ascending: false })

      if (metaError) throw metaError
      if (!reportMeta || reportMeta.length === 0) return { total: 0, change: 0 }

      const reportIds = reportMeta.map(r => r.id)

      const { data, error } = await supabase
        .from('debt_reports_items')
        .select('debt_amount')
        .in('report_id', reportIds)
        .eq('is_total_row', true)

      if (error) throw error

      const total = (data || []).reduce((sum, item) => sum + (item.debt_amount || 0), 0)

      return {
        total: total,
        change: -2.1 // Динамику пока оставляем демо
      }
    } catch (error) {
      console.error('Error loading debt data, using demo data.', error)
      return { total: 0, change: 0 }
    }
  }

  const loadInventoryData = async (organizationIds: string[]) => {
    try {
      const { data: reportMeta, error: metaError } = await supabase
        .from('report_metadata')
        .select('id')
        .in('organization_id', organizationIds)
        .eq('report_type', 'inventory_turnover')
        .order('report_date', { ascending: false })

      if (metaError) throw metaError
      if (!reportMeta || reportMeta.length === 0) return { total: 0, change: 0 }

      const reportIds = reportMeta.map(r => r.id)

      const { data, error } = await supabase
        .from('inventory_turnover_report_items')
        .select('balance_rub')
        .in('report_id', reportIds)
        .eq('is_total_row', true)

      if (error) throw error

      const total = (data || []).reduce((sum, item) => sum + (item.balance_rub || 0), 0)

      return {
        total: total,
        change: 16.42 // Динамику пока оставляем демо
      }
    } catch (error) {
      console.error('Error loading inventory data, using demo data.', error)
      return { total: 0, change: 0 }
    }
  }

  const loadPlanFactData = async (organizationIds: string[]) => {
    try {
      const { data: reportMeta, error: metaError } = await supabase
        .from('report_metadata')
        .select('id')
        .in('organization_id', organizationIds)
        .eq('report_type', 'plan_fact')
        .order('report_date', { ascending: false })

      if (metaError) throw metaError
      if (!reportMeta || reportMeta.length === 0) return { execution: 0, change: 0 }

      const reportIds = reportMeta.map(r => r.id)

      const { data, error } = await supabase
        .from('plan_fact_reports_items')
        .select('execution_percent')
        .in('report_id', reportIds)
        .eq('period_type', 'month')
        .eq('is_total_row', true)

      if (error) throw error

      const values = (data || []).map(item => item.execution_percent || 0)
      const execution = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0

      return {
        execution: execution,
        change: -8.1 // Динамику пока оставляем демо
      }
    } catch (error) {
      console.error('Error loading plan-fact data, using demo data.', error)
      return { execution: 0, change: 0 }
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' ₽'
  }

  const formatPercent = (num: number): string => {
    const sign = num > 0 ? '+' : ''
    return `${sign}${num.toFixed(1)}%`
  }

  const getPercentColor = (percent: number): string => {
    if (percent > 0) return 'text-green-600'
    if (percent < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const handleDesktopRedirect = () => {
    const currentUrl = window.location.href.replace('/telegram-dashboard', '/')
    window.open(currentUrl, '_blank')
  }

  const KPICard = ({ title, value, change, trend, icon: Icon, color }: any) => (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {title}
            </h3>
            <p className="text-lg font-bold text-gray-900">
              {loading ? '...' : value}
            </p>
          </div>
        </div>
        
        <div className={`flex items-center space-x-1 ${getPercentColor(trend)}`}>
          {trend > 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {loading ? '...' : change}
          </span>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!loading && organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <NoOrganizationState />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Business Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Сводка по основным показателям
          </p>
        </div>
        <div className="relative">
          <select
            value={selectedOrgId || ''}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full appearance-none bg-gray-100 border border-gray-200 text-gray-700 py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
          >
            <option value="">Все организации</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <ChevronsUpDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {/* KPI Cards */}
        <div className="space-y-0">
          <KPICard
            title="Остатки на РС и кассе"
            value={formatCurrency(dashboardData.cashBankTotal)}
            change={formatPercent(dashboardData.cashBankChange)}
            trend={dashboardData.cashBankChange}
            icon={Banknote}
            color="bg-blue-500"
          />
          
          <KPICard
            title="Задолженности"
            value={formatCurrency(dashboardData.debtTotal)}
            change={formatPercent(dashboardData.debtChange)}
            trend={dashboardData.debtChange}
            icon={CreditCard}
            color="bg-red-500"
          />
          
          <KPICard
            title="Товарные запасы"
            value={formatCurrency(dashboardData.inventoryTotal)}
            change={formatPercent(dashboardData.inventoryChange)}
            trend={dashboardData.inventoryChange}
            icon={Package}
            color="bg-green-500"
          />
          
          <KPICard
            title="Выполнение плана"
            value={`${dashboardData.planFactExecution.toFixed(1)}%`}
            change={formatPercent(dashboardData.planFactChange)}
            trend={dashboardData.planFactChange}
            icon={BarChart3}
            color="bg-purple-500"
          />
        </div>

        {/* Summary Section */}
        <div className="bg-white border-b border-gray-200 p-4 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Детальная информация
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Денежные средства:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(dashboardData.cashBankTotal)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Дебиторская задолженность:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(dashboardData.debtTotal)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Стоимость запасов:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(dashboardData.inventoryTotal)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">План продаж выполнен на:</span>
              <span className={`text-sm font-medium ${
                dashboardData.planFactExecution >= 100 ? 'text-green-600' : 
                dashboardData.planFactExecution >= 80 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {dashboardData.planFactExecution.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Быстрые действия
          </h2>
          
          <div className="space-y-2">
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Остатки товаров</span>
              </div>
            </button>
            
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Оборачиваемость</span>
              </div>
            </button>
            
            <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Задолженности</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop redirect button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleDesktopRedirect}
          className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Перейти к Desktop версии</span>
        </button>
      </div>
    </div>
  )
}

export default TelegramDashboard
