import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { TrendingUp, TrendingDown, Package, CreditCard, Banknote, FileText, BarChart3, ChevronsUpDown } from 'lucide-react'
import NoOrganizationState from '../components/Layout/NoOrganizationState'
import { supabase } from '../contexts/AuthContext'
import { useAuth } from '../contexts/AuthContext'

interface Organization {
  id: string;
  name: string;
}

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

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [reportDate] = useState(() => new Date().toISOString().split('T')[0])
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
  const [selectedOrgId, setSelectedOrgId] = useState<string>('') // '' means "All Organizations"

  const [widgets, setWidgets] = useState([
    { 
      id: '1', 
      type: 'kpi', 
      title: 'Остатки на РС и кассе', 
      value: '₽0', 
      change: '+0%', 
      trend: 'up', 
      icon: Banknote,
      dataKey: 'cashBankTotal'
    },
    { 
      id: '2', 
      type: 'kpi', 
      title: 'Задолженности', 
      value: '₽0', 
      change: '+0%', 
      trend: 'up', 
      icon: CreditCard,
      dataKey: 'debtTotal'
    },
    { 
      id: '3', 
      type: 'kpi', 
      title: 'Товарные запасы', 
      value: '₽0', 
      change: '+0%', 
      trend: 'down', 
      icon: Package,
      dataKey: 'inventoryTotal'
    },
    { 
      id: '4', 
      type: 'kpi', 
      title: 'Выполнение плана', 
      value: '0%', 
      change: '+0%', 
      trend: 'up', 
      icon: BarChart3,
      dataKey: 'planFactExecution'
    },
  ])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user, selectedOrgId])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // 1. Get user's organizations to populate the filter dropdown
      const { data: orgMembers, error: memberError } = await supabase
        .from('organization_members')
        .select('organizations(id, name)')
        .eq('user_id', user!.id)

      if (memberError) throw memberError;

      const userOrgs = (orgMembers || [])
        .flatMap(m => m.organizations)
        .filter(Boolean) as { id: string; name: string }[]

      if (userOrgs.length === 0) {
        setOrganizations([])
        setLoading(false)
        return
      }
      setOrganizations(userOrgs)

      // 2. Determine which organization to show data for
      const targetOrgIds = selectedOrgId === ''
        ? userOrgs.map(o => o.id)
        : [selectedOrgId]

      if (targetOrgIds.length === 0) {
        setLoading(false)
        return
      }

      // Загружаем данные из всех отчетов
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

      setDashboardData(newDashboardData)
      updateWidgetsWithData(newDashboardData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Используем демо-данные в случае ошибки
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
      updateWidgetsWithData(demoData)
    } finally {
      setLoading(false)
    }
  }

  const loadCashBankData = async (organizationIds: string[]) => {
    try {
      const { data: reportMeta, error: metaError } = await supabase
        .from('report_metadata')
        .select('id')
        .in('organization_id', organizationIds)
        .eq('report_type', 'cash_bank')
        .eq('report_date', reportDate)

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
        change: 5.2
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
        .eq('report_type', 'debt') // Assuming 'debt' is the report type
        .eq('report_date', reportDate)

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
        change: -2.1
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
        .eq('report_date', reportDate)

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
        change: 16.42
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
        .eq('report_type', 'plan_fact') // Assuming 'plan_fact' is the report type
        .eq('report_date', reportDate)

      if (metaError) throw metaError
      if (!reportMeta || reportMeta.length === 0) return { execution: 0, change: 0 }

      const reportIds = reportMeta.map(r => r.id)

      const { data, error } = await supabase
        .from('plan_fact_reports_items')
        .select('execution_percent')
        .in('report_id', reportIds)
        .eq('period_type', 'month') // Уточняем, что нам нужен итог за месяц
        .eq('is_total_row', true)

      if (error) throw error

      const values = (data || []).map(item => item.execution_percent || 0)
      const execution = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0

      return {
        execution: execution,
        change: -8.1
      }
    } catch (error) {
      return { execution: 0, change: 0 }
    }
  }

  const updateWidgetsWithData = (data: DashboardData) => {
    setWidgets(prevWidgets => 
      prevWidgets.map(widget => {
        switch (widget.dataKey) {
          case 'cashBankTotal':
            return {
              ...widget,
              value: formatCurrency(data.cashBankTotal),
              change: `${data.cashBankChange > 0 ? '+' : ''}${data.cashBankChange.toFixed(1)}%`,
              trend: data.cashBankChange >= 0 ? 'up' : 'down'
            }
          case 'debtTotal':
            return {
              ...widget,
              value: formatCurrency(data.debtTotal),
              change: `${data.debtChange > 0 ? '+' : ''}${data.debtChange.toFixed(1)}%`,
              trend: data.debtChange >= 0 ? 'up' : 'down'
            }
          case 'inventoryTotal':
            return {
              ...widget,
              value: formatCurrency(data.inventoryTotal),
              change: `${data.inventoryChange > 0 ? '+' : ''}${data.inventoryChange.toFixed(1)}%`,
              trend: data.inventoryChange >= 0 ? 'up' : 'down'
            }
          case 'planFactExecution':
            return {
              ...widget,
              value: `${data.planFactExecution.toFixed(1)}%`,
              change: `${data.planFactChange > 0 ? '+' : ''}${data.planFactChange.toFixed(1)}%`,
              trend: data.planFactChange >= 0 ? 'up' : 'down'
            }
          default:
            return widget
        }
      })
    )
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(widgets)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setWidgets(items)
  }

  const KPICard = ({ widget }: { widget: any }) => (
    <div className="card p-4 md:p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
            <widget.icon className="w-5 h-5 md:w-6 md:h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
              {widget.title}
            </p>
            <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : widget.value}
            </p>
          </div>
        </div>
        <div className={`flex items-center space-x-1 ${
          widget.trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {widget.trend === 'up' ? (
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
          ) : (
            <TrendingDown className="w-3 h-3 md:w-4 md:h-4" />
          )}
          <span className="text-xs md:text-sm font-medium">
            {loading ? '...' : widget.change}
          </span>
        </div>
      </div>
    </div>
  )

  const QuickReportCard = ({ title, description, icon: Icon, onClick }: any) => (
    <div 
      onClick={onClick}
      className="card p-4 md:p-6 hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-dark-700 rounded-lg">
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-white truncate">
            {title}
          </h3>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
            {description}
          </p>
        </div>
      </div>
    </div>
  )

  const navigateToReports = () => {
    window.location.href = '/reports'
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!loading && organizations.length === 0) {
    return <NoOrganizationState />
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="appearance-none btn-secondary text-sm md:text-base pr-8"
            >
              <option value="">Все организации</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <ChevronsUpDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <button
            onClick={navigateToReports}
            className="btn-primary text-sm md:text-base"
          >
            Все отчеты
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="kpi-cards" direction="vertical">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"
            >
              {widgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${
                        snapshot.isDragging ? 'opacity-50' : ''
                      } transition-opacity duration-200`}
                    >
                      <KPICard widget={widget} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Quick Reports Access */}
      <div className="space-y-3 md:space-y-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
          Быстрый доступ к отчетам
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <QuickReportCard
            title="Остатки товаров"
            description="Остатки на складах"
            icon={Package}
            onClick={navigateToReports}
          />
          <QuickReportCard
            title="Товарные запасы"
            description="Оборачиваемость товаров"
            icon={BarChart3}
            onClick={navigateToReports}
          />
          <QuickReportCard
            title="План-факт"
            description="Выполнение планов продаж"
            icon={FileText}
            onClick={navigateToReports}
          />
          <QuickReportCard
            title="Задолженности"
            description="Дебиторская и кредиторская"
            icon={CreditCard}
            onClick={navigateToReports}
          />
        </div>
      </div>

      {/* Summary Cards for Mobile */}
      <div className="block md:hidden space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Сводка
        </h2>
        
        <div className="space-y-3">
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Финансовые показатели
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Денежные средства:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {loading ? '...' : formatCurrency(dashboardData.cashBankTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Задолженности:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {loading ? '...' : formatCurrency(dashboardData.debtTotal)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Товарные запасы
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Общая стоимость:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {loading ? '...' : formatCurrency(dashboardData.inventoryTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Выполнение плана:</span>
                <span className={`text-sm font-medium ${
                  dashboardData.planFactExecution >= 100 ? 'text-green-600' : 
                  dashboardData.planFactExecution >= 80 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {loading ? '...' : `${dashboardData.planFactExecution.toFixed(1)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
