import React, { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import { useUserOrganizations } from '../../hooks/useUserOrganizations'
import { useReportItems } from '../../hooks/useReportItems'
import { useReportDate } from '../../contexts/ReportDateContext'
import ReportSkeleton from './ReportSkeleton'

interface InventoryBalanceData {
  id: string
  category_name: string
  parent_category_id: string | null
  quantity_pairs: number
  balance_rub: number
  dynamics_start_month_rub: number
  dynamics_start_month_percent: number
  dynamics_start_year_rub: number
  dynamics_start_year_percent: number
  level: number
  is_total_row: boolean
  organization_name?: string;
  children?: InventoryBalanceData[]
  expanded?: boolean
}

const InventoryBalanceReport: React.FC = () => {
  const [data, setData] = useState<InventoryBalanceData[]>([])
  const [loading, setLoading] = useState(true)
  const { reportDate } = useReportDate() // Используем глобальную дату
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)

  const [selectedOrgId, setSelectedOrgId] = useState<string>('') // '' means "All Organizations"

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

  const { data: reportItems, isLoading: isLoadingReport, error: reportError } = useReportItems<InventoryBalanceData>({
    organizationIds: targetOrgIds,
    reportType: 'inventory_turnover', // This report uses the same data source as turnover
    reportDate: reportDate,
    orderColumns: [{ column: 'level' }, { column: 'category_name' }],
  })

  useEffect(() => {
    setLoading(isLoadingOrgs || isLoadingReport)
  }, [isLoadingOrgs, isLoadingReport])

  useEffect(() => {
    if (loading) return

    const hasRealData = reportItems && reportItems.length > 0 && !reportError
    let itemsToProcess: InventoryBalanceData[]

    if (hasRealData) {
      itemsToProcess = reportItems
    } else {
      if (reportError) console.error('Error loading inventory balance report data:', reportError)
      itemsToProcess = []
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

  const buildHierarchy = (flatData: any[], isConsolidated: boolean = false): InventoryBalanceData[] => {
    const map = new Map()
    const roots: InventoryBalanceData[] = []

    flatData.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    if (isConsolidated) {
      const consolidatedTotal: InventoryBalanceData = {
        id: 'consolidated-total',
        category_name: 'Консолидированный итог',
        parent_category_id: null,
        quantity_pairs: 0,
        balance_rub: 0,
        dynamics_start_month_rub: 0,
        dynamics_start_month_percent: 0,
        dynamics_start_year_rub: 0,
        dynamics_start_year_percent: 0,
        level: 0,
        is_total_row: true,
        children: []
      }

      flatData.forEach(item => {
        const node = map.get(item.id)
        if (item.parent_category_id) {
          const parent = map.get(item.parent_category_id)
          if (parent) {
            parent.children.push(node)
          }
        } else { // These are the root items for each organization
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
    return `${sign}${num.toFixed(2)}%`
  }

  const getPercentColor = (percent: number): string => {
    if (percent > 0) return 'text-green-600 dark:text-green-400'
    if (percent < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const exportToCSV = () => {
    const headers = [
      'Номенклатура',
      'Количество',
      'Сумма',
      'Динамика с нач. месяца, руб',
      'Динамика с нач. месяца, %',
      'Динамика с нач. года, руб',
      'Динамика с нач. года, %'
    ]

    const flattenData = (items: InventoryBalanceData[], result: any[] = []): any[] => {
      items.forEach(item => {
        result.push([
          item.category_name,
          item.quantity_pairs,
          item.balance_rub,
          item.dynamics_start_month_rub,
          item.dynamics_start_month_percent,
          item.dynamics_start_year_rub,
          item.dynamics_start_year_percent
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
    a.download = `inventory_balance_${reportDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderMobileRow = (item: InventoryBalanceData): React.ReactNode => {
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
                  {item.quantity_pairs !== 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Количество: {formatNumber(item.quantity_pairs)}
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
                {formatPercent(item.dynamics_start_month_percent)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                С нач. года:
              </div>
              <div className={`text-xs font-medium ${getPercentColor(item.dynamics_start_year_percent)}`}>
                {formatPercent(item.dynamics_start_year_percent)}
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && item.children?.map((child) => renderMobileRow(child))}
      </React.Fragment>
    )
  }

  const renderDesktopRow = (item: InventoryBalanceData): React.ReactNode => {
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
            {item.quantity_pairs !== 0 ? formatNumber(item.quantity_pairs) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
            {formatCurrency(item.balance_rub)}
          </td>
          <td className={`px-6 py-3 text-sm text-right ${getPercentColor(item.dynamics_start_month_rub)}`}>
            {formatCurrency(item.dynamics_start_month_rub)}
          </td>
          <td className={`px-6 py-3 text-sm text-right font-medium ${getPercentColor(item.dynamics_start_month_percent)}`}>
            {formatPercent(item.dynamics_start_month_percent)}
          </td>
          <td className={`px-6 py-3 text-sm text-right ${getPercentColor(item.dynamics_start_year_rub)}`}>
            {formatCurrency(item.dynamics_start_year_rub)}
          </td>
          <td className={`px-6 py-3 text-sm text-right font-medium ${getPercentColor(item.dynamics_start_year_percent)}`}>
            {formatPercent(item.dynamics_start_year_percent)}
          </td>
        </tr>
        {hasChildren && isExpanded && item.children?.map((child) => renderDesktopRow(child))}
      </React.Fragment>
    )
  }

  if (loading) {
    return (
      <ReportSkeleton
        isMobile={isMobile}
        columnCount={7}
        filterCount={1}
      />
    )
  }

  if (isMobile) {
    return (
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Остатки на {new Date(reportDate).toLocaleDateString('ru-RU')} г.
              </h3>
              <button 
                onClick={exportToCSV}
                className="btn-primary text-sm px-3 py-1"
              >
                <Download className="w-4 h-4" />
              </button>
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
          {data.length > 0 ? (
            data.map((item) => renderMobileRow(item))
          ) : (
            <div className="text-center py-10 px-4 text-gray-500 dark:text-gray-400">
              Нет данных для отображения.
            </div>
          )}
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
            Остатки на {new Date(reportDate).toLocaleDateString('ru-RU')} г.
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Нажмите на стрелки для сворачивания/разворачивания категорий
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
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
                Номенклатура
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Количество
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Сумма
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Динамика с нач. месяца, руб
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Динамика с нач. месяца, %
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Динамика с нач. года, руб
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Динамика с нач. года, %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.length > 0 ? (
              data.map((item) => renderDesktopRow(item))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-10 px-6 text-gray-500 dark:text-gray-400">
                  Нет данных для отображения.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>* Положительные значения динамики отображаются зеленым цветом, отрицательные - красным</p>
        <p>* Нажмите на стрелки для разворачивания/сворачивания категорий номенклатуры</p>
      </div>
    </div>
  )
}

export default InventoryBalanceReport
