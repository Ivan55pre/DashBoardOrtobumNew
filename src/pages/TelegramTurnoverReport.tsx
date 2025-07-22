import React, { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Menu } from 'lucide-react'
import { useUserOrganizations } from '../hooks/useUserOrganizations'
import { useReportItems } from '../hooks/useReportItems'
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
  const [data, setData] = useState<InventoryTurnoverData[]>([])
  const [loading, setLoading] = useState(true) // Combined loading state
  const [reportDate, _setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [activeOrganizationName, setActiveOrganizationName] = useState<string | null>(null)

  const generateUUID = (): string => { // Helper function to generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

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

    // Case 1: Error loading organizations. Show error and sample data.
    if (orgsError) {
      console.error('Error loading organizations:', orgsError)
      const sample = flattenHierarchy(getSampleData())
      setData(buildHierarchy(sample, false))
      setActiveOrganizationName('Ошибка (демо-данные)')
      setExpandedRows(new Set(sample.filter(i => i.level <= 2).map(i => i.id)))
      return
    }

    // Case 2: No organizations for the user. Show empty state.
    if (organizations && organizations.length === 0) {
      setData([])
      setActiveOrganizationName(null) // Or "Нет организаций"
      return
    }

    // Case 3: We have organizations, now check for report data.
    const hasRealData = reportItems && reportItems.length > 0 && !reportError
    let itemsToProcess: InventoryTurnoverData[]
    const isConsolidatedView = (organizations?.length ?? 0) > 1

    if (hasRealData) {
      itemsToProcess = reportItems
      if (isConsolidatedView) {
        setActiveOrganizationName('Все организации')
      } else if (organizations?.length === 1) {
        setActiveOrganizationName(organizations[0].name)
      }
    } else {
      // No real data found, or there was an error fetching it. Use sample data.
      if (reportError) console.error('Error loading report data:', reportError)
      console.warn(`No turnover reports found for selected orgs on ${reportDate}. Falling back to sample data.`)
      itemsToProcess = flattenHierarchy(getSampleData())
      setActiveOrganizationName('Демо-данные')
    }

    const hierarchyData = buildHierarchy(itemsToProcess, isConsolidatedView)
    setData(hierarchyData)

    const initialExpanded = new Set<string>()
    itemsToProcess.forEach(item => {
      if (item.level <= 2) initialExpanded.add(item.id)
    })
    setExpandedRows(initialExpanded)
  }, [loading, reportItems, reportError, organizations, orgsError, reportDate])

  const flattenHierarchy = (items: InventoryTurnoverData[]): InventoryTurnoverData[] => {
    const result: InventoryTurnoverData[] = []
    
    const flatten = (items: InventoryTurnoverData[]) => {
      items.forEach(item => {
        result.push(item)
        if (item.children && item.children.length > 0) {
          flatten(item.children)
        }
      })
    }
    
    flatten(items)
    return result
  }

  const getSampleData = (organizationName: string = 'ООО "ОРТОБУМ"'): InventoryTurnoverData[] => {
    // Generate UUIDs for the sample data
    const uuid1 = generateUUID()
    const uuid2 = generateUUID()
    const uuid3 = generateUUID()
    const uuid4 = generateUUID()
    const uuid5 = generateUUID()
    //const _uuid6 = generateUUID()
    //const _uuid7 = generateUUID()
    //const _uuid8 = generateUUID()
    //const _uuid9 = generateUUID()
    //const _uuid10 = generateUUID()
    //const _uuid11 = generateUUID()
    const uuid12 = generateUUID()
    const uuid13 = generateUUID()
    const uuid14 = generateUUID()
    const uuid15 = generateUUID()

    return [
      {
        id: uuid1,
        category_name: 'Итого',
        parent_category_id: null,
        quantity_pairs: 278235531,
        balance_rub: 31917714,
        dynamics_start_month_rub: 31917714,
        dynamics_start_month_percent: 13.0,
        dynamics_start_year_rub: 31917714,
        dynamics_start_year_percent: 13.0,
        turnover_days: 96,
        level: 0,
        is_total_row: true,
        children: [
          {
            id: uuid2,
            category_name: organizationName,
            parent_category_id: uuid1,
            quantity_pairs: 154455809,
            balance_rub: 29409249,
            dynamics_start_month_rub: 29409249,
            dynamics_start_month_percent: 23.5,
            dynamics_start_year_rub: 29409249,
            dynamics_start_year_percent: 23.5,
            turnover_days: 198,
            level: 1,
            is_total_row: false,
            children: [
              {
                id: uuid3,
                category_name: 'Обувь на собственных складах',
                parent_category_id: uuid2,
                quantity_pairs: 42645,
                balance_rub: 22871516,
                dynamics_start_month_rub: 22871516,
                dynamics_start_month_percent: 47.6,
                dynamics_start_year_rub: 22871516,
                dynamics_start_year_percent: 47.6,
                turnover_days: 536,
                level: 2,
                is_total_row: false,
                children: [
                  {
                    id: uuid4,
                    category_name: 'Ортопедическая и комфортная обувь, Ортопедическая обувь взрослая',
                    parent_category_id: uuid3,
                    quantity_pairs: 3793,
                    balance_rub: 5193095,
                    dynamics_start_month_rub: -336938,
                    dynamics_start_month_percent: -6.1,
                    dynamics_start_year_rub: -336938,
                    dynamics_start_year_percent: -6.1,
                    turnover_days: 0,
                    level: 3,
                    is_total_row: false,
                    children: [
                      {
                        id: uuid5,
                        category_name: 'Ботинки женские',
                        parent_category_id: uuid4,
                        quantity_pairs: 416,
                        balance_rub: 1015442,
                        dynamics_start_month_rub: -44429,
                        dynamics_start_month_percent: -4.2,
                        dynamics_start_year_rub: -44429,
                        dynamics_start_year_percent: -4.2,
                        turnover_days: 0,
                        level: 4,
                        is_total_row: false
                      }
                    ]
                  }
                ]
              },
              {
                id: uuid12,
                category_name: 'Обувь на складах комиссионеров',
                parent_category_id: uuid2,
                quantity_pairs: 40521,
                balance_rub: 69833043,
                dynamics_start_month_rub: 3864693,
                dynamics_start_month_percent: 5.4,
                dynamics_start_year_rub: 3864693,
                dynamics_start_year_percent: 5.4,
                turnover_days: 121,
                level: 2,
                is_total_row: false,
                children: [
                  {
                    id: uuid13,
                    category_name: 'РВБ ООО',
                    parent_category_id: uuid12,
                    quantity_pairs: 13159,
                    balance_rub: 22268438,
                    dynamics_start_month_rub: 198757,
                    dynamics_start_month_percent: 0.8,
                    dynamics_start_year_rub: 198757,
                    dynamics_start_year_percent: 0.8,
                    turnover_days: 84,
                    level: 3,
                    is_total_row: false
                  },
                  {
                    id: uuid14,
                    category_name: 'ИНТЕРНЕТ РЕШЕНИЯ ООО',
                    parent_category_id: uuid12,
                    quantity_pairs: 11029,
                    balance_rub: 19040822,
                    dynamics_start_month_rub: 3659411,
                    dynamics_start_month_percent: 21.1,
                    dynamics_start_year_rub: 3659411,
                    dynamics_start_year_percent: 21.1,
                    turnover_days: 82,
                    level: 3,
                    is_total_row: false
                  },
                  {
                    id: uuid15,
                    category_name: 'КУПИШУЗ ООО',
                    parent_category_id: uuid12,
                    quantity_pairs: 1774,
                    balance_rub: 3052024,
                    dynamics_start_month_rub: -948728,
                    dynamics_start_month_percent: -29.5,
                    dynamics_start_year_rub: -948728,
                    dynamics_start_year_percent: -29.5,
                    turnover_days: 170,
                    level: 3,
                    is_total_row: false
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }

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

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num)
  }

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num) + ' ₽'
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
    const currentUrl = window.location.href.replace('/telegram-turnover', '/reports')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
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
        {data.map((item) => renderRow(item))}
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
