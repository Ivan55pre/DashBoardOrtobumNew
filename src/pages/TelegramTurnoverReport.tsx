import React, { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Menu } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useUserOrganizations } from '../hooks/useUserOrganizations'
import { useReportItems } from '../hooks/useReportItems'
import { formatCurrency, formatNumber, formatPercent, getPercentColor } from '../utils/formatters'
//import { useTelegram } from '../contexts/TelegramContext'

interface InventoryTurnoverData {
  id: string
  category_name: string
  parent_category_id: string | null
  quantity_pairs: number
  balance_rub: number
  dynamics_start_month_rub: number
  dynamics_start_month_percent: number
  dynamics_start_year_rub: number
  dynamics_start_year_percent: number
  turnover_days: number
  level: number
  is_total_row: boolean
  organization_name?: string;
  children?: InventoryTurnoverData[]
  expanded?: boolean
}

const TelegramTurnoverReport: React.FC = () => {
  //const { webApp } = useTelegram()
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<InventoryTurnoverData[]>([])
  const [loading, setLoading] = useState(true) // Combined loading state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [activeOrganizationName, setActiveOrganizationName] = useState<string | null>(null)
  const reportDate = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return searchParams.get('date') || yesterday.toISOString().split('T')[0];
  }, [searchParams])

  const { organizations, isLoading: isLoadingOrgs, error: orgsError } = useUserOrganizations()

  const targetOrgIds = useMemo(() => {
    if (isLoadingOrgs || !organizations) return null
    // For Telegram view, always show all organizations consolidated
    return organizations.map(o => o.id)
  }, [organizations, isLoadingOrgs])

  const { data: reportItems, isLoading: isLoadingReport, error: reportError } = useReportItems<InventoryTurnoverData>({
    organizationIds: targetOrgIds,
    reportType: 'inventory_turnover',
    reportDate: reportDate,
    orderColumns: [{ column: 'level' }, { column: 'category_name' }],
  })

  useEffect(() => {    
    setLoading(isLoadingOrgs || isLoadingReport)
  }, [isLoadingOrgs, isLoadingReport])

  useEffect(() => {
    if (loading) return

    if (orgsError) {
      console.error('Error loading organizations:', orgsError)
      setData([])
      setActiveOrganizationName('Ошибка загрузки организаций')
      return
    }

    if (organizations && organizations.length === 0) {
      setData([])
      setActiveOrganizationName('Нет доступных организаций')
      return
    }

    const hasRealData = reportItems && reportItems.length > 0 && !reportError
    let itemsToProcess: InventoryTurnoverData[] = []
    const isConsolidatedView = (organizations?.length ?? 0) > 1

    if (hasRealData) {
      itemsToProcess = reportItems
      if (isConsolidatedView) {
        setActiveOrganizationName('Все организации')
      } else if (organizations?.length === 1) {
        setActiveOrganizationName(organizations[0].name) // Set the single org name
      }
    } else {
      if (reportError) {
        console.error('Error loading report data:', reportError)
        setActiveOrganizationName('Ошибка загрузки отчета')
      } else {
        // Set active org name even if there's no data, for context
        setActiveOrganizationName(isConsolidatedView ? 'Все организации' : organizations?.[0]?.name || 'Нет данных')
      }
      // itemsToProcess is already an empty array, resulting in an empty report
    }

    const hierarchyData = buildHierarchy(itemsToProcess, isConsolidatedView)
    setData(hierarchyData)
    
    const initialExpanded = new Set<string>()
    itemsToProcess.forEach(item => {
      if (item.level <= 2) initialExpanded.add(item.id)
    })
    setExpandedRows(initialExpanded)
  }, [loading, reportItems, reportError, organizations, orgsError, reportDate])

  const buildHierarchy = (flatData: any[], isConsolidated: boolean = false): InventoryTurnoverData[] => {
    const map = new Map()
    const roots: InventoryTurnoverData[] = []

    flatData.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    if (isConsolidated) {
      const consolidatedTotal: InventoryTurnoverData = {
        id: 'consolidated-total',
        category_name: 'Консолидированный итог',
        parent_category_id: null,
        quantity_pairs: 0,
        balance_rub: 0,
        dynamics_start_month_rub: 0,
        dynamics_start_month_percent: 0,
        dynamics_start_year_rub: 0,
        dynamics_start_year_percent: 0,
        turnover_days: 0,
        level: 0,
        is_total_row: true,
        children: []
      }

      flatData.forEach(item => {
        const node = map.get(item.id)
        if (item.parent_category_id) {
          const parent = map.get(item.parent_category_id)
          if (parent) parent.children.push(node)
        } else {
          node.category_name = `${item.organization_name} - ${item.category_name}`
          consolidatedTotal.children?.push(node)
          if (item.is_total_row) {
            consolidatedTotal.balance_rub += item.balance_rub
            consolidatedTotal.quantity_pairs += item.quantity_pairs
            consolidatedTotal.dynamics_start_month_rub += item.dynamics_start_month_rub
            consolidatedTotal.dynamics_start_year_rub += item.dynamics_start_year_rub
          }
        }
      })
      roots.push(consolidatedTotal)
    } else {
      flatData.forEach(item => {
        const node = map.get(item.id)
        if (item.parent_category_id) {
          const parent = map.get(item.parent_category_id)
          if (parent) parent.children.push(node)
        } else {
          roots.push(node)
        }
      })
    }

    return roots
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const handleDesktopRedirect = () => {
    const currentUrl = window.location.href.replace(/\/telegram-turnover.*$/, '/reports')
    window.open(currentUrl, '_blank')
  }

  const renderRow = (item: InventoryTurnoverData): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedRows.has(item.id)
    const paddingLeft = item.level * 16

    return (
      <React.Fragment key={item.id}>
        <div className={`border-b border-gray-200 py-3 px-4 ${
          item.is_total_row ? 'bg-gray-50 font-semibold' : 'bg-white'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    title={isExpanded ? 'Свернуть' : 'Развернуть'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                ) : (
                  <div className="w-6 h-6 mr-2 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className={`text-sm font-medium text-gray-900 truncate ${
                    item.is_total_row ? 'font-bold' : ''
                  }`}>
                    {item.category_name}
                  </h3>
                  {item.quantity_pairs > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatNumber(item.quantity_pairs)} пар
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right ml-4 flex-shrink-0">
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(item.balance_rub)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                С нач. месяца:
              </div>
              <div className={`text-xs font-medium ${getPercentColor(item.dynamics_start_month_percent)}`}>
                {formatPercent(item.dynamics_start_month_percent)} {formatCurrency(item.dynamics_start_month_rub)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                С нач. года:
              </div>
              <div className={`text-xs font-medium ${getPercentColor(item.dynamics_start_year_percent)}`}>
                {formatPercent(item.dynamics_start_year_percent)} {formatCurrency(item.dynamics_start_year_rub)}
              </div>
              {item.turnover_days > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Оборачиваемость: {item.turnover_days} дн.
                </div>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && item.children?.map((child) => renderRow(child))}
      </React.Fragment>
    )
  }

  const TelegramReportSkeleton: React.FC = () => {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded w-3/5"></div>
          </div>
        </div>
  
        {/* Content */}
        <div className="p-4 space-y-5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-start justify-between space-x-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
              <div className="w-1/3 space-y-2">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-3 bg-gray-300 rounded w-5/6 ml-auto"></div>
                <div className="h-3 bg-gray-300 rounded w-full ml-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return <TelegramReportSkeleton />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <Menu className="w-6 h-6 text-gray-600" />
          <h1 className="text-base font-semibold text-gray-900 truncate">
            {activeOrganizationName 
              ? `Запасы (${activeOrganizationName})` 
              : 'Товарные запасы и оборачиваемость'}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {data.length > 0 ? (
          data.map((item) => renderRow(item))
        ) : !loading && (
          <div className="text-center py-10 px-4">
            <p className="text-gray-500">
              Данные для отчета отсутствуют на {new Date(reportDate).toLocaleDateString('ru-RU')} г.
            </p>
          </div>
        )}
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

export default TelegramTurnoverReport
