import React, { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, Download, Calendar } from 'lucide-react'
import { useUserOrganizations } from '../../hooks/useUserOrganizations'
import { useReportItems } from '../../hooks/useReportItems'

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

const InventoryTurnoverReport: React.FC = () => {
  const [data, setData] = useState<InventoryTurnoverData[]>([])
  const [loading, setLoading] = useState(true)
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)

  const [selectedOrgId, setSelectedOrgId] = useState<string>('') // '' means "All Organizations"
  // Helper function to generate UUID v4
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const { organizations, isLoading: isLoadingOrgs } = useUserOrganizations()

  const targetOrgIds = useMemo(() => {
    if (isLoadingOrgs || !organizations) return null
    return selectedOrgId === '' ? organizations.map(o => o.id) : [selectedOrgId]
  }, [selectedOrgId, organizations, isLoadingOrgs])

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

    const hasRealData = reportItems && reportItems.length > 0 && !reportError
    let itemsToProcess: InventoryTurnoverData[]

    if (hasRealData) {
      itemsToProcess = reportItems
    } else {
      if (reportError) console.error('Error loading report data:', reportError)
      console.warn(`No inventory turnover reports found for selected orgs on ${reportDate}. Falling back to sample data.`)
      itemsToProcess = flattenHierarchy(getSampleData())
    }

    const isConsolidatedView = selectedOrgId === '' && (organizations?.length ?? 0) > 1
    const hierarchyData = buildHierarchy(itemsToProcess, isConsolidatedView)
    setData(hierarchyData)

    const initialExpanded = new Set<string>()
    itemsToProcess.forEach(item => {
      if (item.level <= 2) {
        initialExpanded.add(item.id)
      }
    })
    setExpandedRows(initialExpanded)
  }, [loading, reportItems, reportError, organizations, selectedOrgId, reportDate])

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
      // Original logic for single organization view
      flatData.forEach(item => {
        const node = map.get(item.id)
        if (item.parent_category_id) {
          const parent = map.get(item.parent_category_id)
          if (parent) {
            parent.children.push(node)
          }
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
    }).format(num)
  }

  const formatPercent = (num: number): string => {
    const sign = num > 0 ? '+' : ''
    return `${sign}${num.toFixed(1)}%`
  }

  const getPercentColor = (percent: number): string => {
    if (percent > 0) return 'text-green-600 dark:text-green-400'
    if (percent < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const exportToCSV = () => {
    const headers = [
      'Организация',
      'Количество, пар',
      'Остатки, руб',
      'Динамика с нач. месяца, руб',
      'Динамика с нач. месяца, %',
      'Динамика с нач. года, руб',
      'Динамика с нач. года, %',
      'Оборачиваемость, дн.'
    ]

    const flattenData = (items: InventoryTurnoverData[], result: any[] = []): any[] => {
      items.forEach(item => {
        result.push([
          item.category_name,
          item.quantity_pairs,
          item.balance_rub,
          item.dynamics_start_month_rub,
          item.dynamics_start_month_percent,
          item.dynamics_start_year_rub,
          item.dynamics_start_year_percent,
          item.turnover_days
        ])
        if (item.children && item.children.length > 0) {
          flattenData(item.children, result)
        }
      })
      return result
    }

    const csvData = [headers, ...flattenData(data)]
    const csv = csvData.map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory_turnover_${reportDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderMobileRow = (item: InventoryTurnoverData): React.ReactNode => {
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
                  <h3 className={`text-sm font-medium text-gray-900 ${
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
                {formatCurrency(item.balance_rub)} ₽
              </div>
              <div className="text-xs text-gray-500 mt-1">
                С нач. месяца:
              </div>
              <div className={`text-xs font-medium ${getPercentColor(item.dynamics_start_month_percent)}`}>
                {formatPercent(item.dynamics_start_month_percent)} {formatCurrency(item.dynamics_start_month_rub)} ₽
              </div>
              <div className="text-xs text-gray-500 mt-1">
                С нач. года:
              </div>
              <div className={`text-xs font-medium ${getPercentColor(item.dynamics_start_year_percent)}`}>
                {formatPercent(item.dynamics_start_year_percent)} {formatCurrency(item.dynamics_start_year_rub)} ₽
              </div>
              {item.turnover_days > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Оборачиваемость: {item.turnover_days} дн.
                </div>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && item.children?.map((child) => renderMobileRow(child))}
      </React.Fragment>
    )
  }

  const renderDesktopRow = (item: InventoryTurnoverData): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedRows.has(item.id)
    const paddingLeft = item.level * 24

    return (
      <React.Fragment key={item.id}>
        <tr className={`hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors ${
          item.is_total_row ? 'bg-gray-100 dark:bg-dark-600 font-semibold' : ''
        }`}>
          <td className="px-6 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
            <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded transition-colors"
                  title={isExpanded ? 'Свернуть' : 'Развернуть'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              ) : (
                <div className="w-6 h-6 mr-2" />
              )}
              <span className={`${item.is_total_row ? 'font-bold' : ''} ${
                item.level > 0 ? 'text-gray-700 dark:text-gray-300' : ''
              }`}>
                {item.category_name}
              </span>
            </div>
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
            {item.quantity_pairs > 0 ? formatNumber(item.quantity_pairs) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
            {formatCurrency(item.balance_rub)}
          </td>
          <td className={`px-6 py-3 text-sm text-right font-medium ${getPercentColor(item.dynamics_start_month_percent)}`}>
            {formatPercent(item.dynamics_start_month_percent)}
          </td>
          <td className={`px-6 py-3 text-sm text-right ${getPercentColor(item.dynamics_start_month_rub)}`}>
            {formatCurrency(item.dynamics_start_month_rub)}
          </td>
          <td className={`px-6 py-3 text-sm text-right font-medium ${getPercentColor(item.dynamics_start_year_percent)}`}>
            {formatPercent(item.dynamics_start_year_percent)}
          </td>
          <td className={`px-6 py-3 text-sm text-right ${getPercentColor(item.dynamics_start_year_rub)}`}>
            {formatCurrency(item.dynamics_start_year_rub)}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
            {item.turnover_days > 0 ? item.turnover_days : ''}
          </td>
        </tr>
        {hasChildren && isExpanded && item.children?.map((child) => renderDesktopRow(child))}
      </React.Fragment>
    )
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Товарные запасы и оборач...
              </h3>
              <button 
                onClick={exportToCSV}
                className="btn-primary text-sm px-3 py-1"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Mobile Filter */}
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Все организации</option>
              {(organizations || []).map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {data.map((item) => renderMobileRow(item))}
        </div>

        <div className="p-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-700">
          <p>* Положительные значения динамики отображаются зеленым цветом, отрицательные - красным</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Товарные запасы и оборачиваемость на {new Date(reportDate).toLocaleDateString('ru-RU')} г.
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Нажмите на стрелки для сворачивания/разворачивания категорий
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Все организации</option>
            {(organizations || []).map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          
          <button 
            onClick={exportToCSV}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Экспорт</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-dark-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Организация
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Количество, пар
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Остатки, руб
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Динамика с нач. месяца, %
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Динамика с нач. месяца, руб
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Динамика с нач. года, %
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Динамика с нач. года, руб
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Оборачиваемость, дн.
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item) => renderDesktopRow(item))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>* Положительные значения динамики отображаются зеленым цветом, отрицательные - красным</p>
        <p>* Нулевые значения оборачиваемости означают отсутствие движения товара</p>
      </div>
    </div>
  )
}

export default InventoryTurnoverReport
