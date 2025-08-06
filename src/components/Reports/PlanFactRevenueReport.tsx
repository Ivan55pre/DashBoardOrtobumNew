import React, { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import { useUserOrganizations } from '../../hooks/useUserOrganizations'
import { useReportItems } from '../../hooks/useReportItems'
import { useReportDate } from '../../contexts/ReportDateContext'
import ReportSkeleton from './ReportSkeleton'

interface PlanFactRevenueData {
  id: string
  category_name: string
  parent_id: string | null
  plan_amount: number
  fact_amount: number
  execution_percent: number
  period_type: 'month' | 'year'
  level: number
  is_total_row: boolean
  is_expandable: boolean
  organization_name?: string;
  children?: PlanFactRevenueData[]
  expanded?: boolean
}

const PlanFactRevenueReport: React.FC = () => {
  const [data, setData] = useState<PlanFactRevenueData[]>([])
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

  const { data: reportItems, isLoading: isLoadingReport, error: reportError } = useReportItems<PlanFactRevenueData>({
    organizationIds: targetOrgIds,
    reportType: 'plan_fact',
    reportDate: reportDate,
    orderColumns: [{ column: 'level' }, { column: 'category_name' }],
  })

  useEffect(() => {
    setLoading(isLoadingOrgs || isLoadingReport)
  }, [isLoadingOrgs, isLoadingReport])

  useEffect(() => {
    if (loading) return

    const hasRealData = reportItems && reportItems.length > 0 && !reportError
    let itemsToProcess: PlanFactRevenueData[]

    if (hasRealData) {
      itemsToProcess = reportItems
    } else {
      if (reportError) console.error('Error loading plan-fact report data:', reportError)
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

  // Функция строит иерархию (дерево) из плоского списка, используя parent_id.
  // Этот метод надежнее, чем построение на основе уровней (level).
  const buildHierarchy = (flatData: any[], isConsolidated: boolean = false): PlanFactRevenueData[] => {
    const map = new Map<string, any>()
    const roots: PlanFactRevenueData[] = []

    flatData.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    if (isConsolidated) {
      const consolidatedTotal: PlanFactRevenueData = {
        id: 'consolidated-total',
        category_name: 'Консолидированный итог',
        parent_id: null,
        plan_amount: 0,
        fact_amount: 0,
        execution_percent: 0,
        period_type: 'month',
        level: 0,
        is_total_row: true,
        is_expandable: true,
        children: []
      }

      flatData.forEach(item => {
        const node = map.get(item.id)
        if (item.parent_id) {
          const parent = map.get(item.parent_id)
          if (parent) parent.children.push(node)
        } else {
          node.category_name = `${item.organization_name} - ${item.category_name}`
          consolidatedTotal.children?.push(node)
          if (item.is_total_row) {
            consolidatedTotal.plan_amount += item.plan_amount
            consolidatedTotal.fact_amount += item.fact_amount
          }
        }
      })

      consolidatedTotal.execution_percent = consolidatedTotal.plan_amount > 0
        ? (consolidatedTotal.fact_amount / consolidatedTotal.plan_amount) * 100
        : 0

      roots.push(consolidatedTotal)
    } else {
      // Original logic for single organization view
      flatData.forEach(item => {
        const node = map.get(item.id)
        if (item.parent_id && map.has(item.parent_id)) {
          const parent = map.get(item.parent_id)
          parent.children.push(node)
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

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  const formatPercent = (num: number): string => {
    return `${num.toFixed(1)}%`
  }

  const getPercentColor = (percent: number): string => {
    if (percent >= 100) return 'text-green-600 dark:text-green-400'
    if (percent >= 80) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const exportToCSV = () => {
    const headers = [
      'Организация',
      'План, ₽',
      'Факт, ₽',
      '% выполнения плана'
    ]

    const flattenData = (items: PlanFactRevenueData[], result: any[] = []): any[] => {
      items.forEach(item => {
        result.push([
          item.category_name,
          item.plan_amount,
          item.fact_amount,
          item.execution_percent
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
    a.download = `plan_fact_revenue_${reportDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderMobileRow = (item: PlanFactRevenueData): React.ReactNode => {
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
                </div>
              </div>
            </div>
            
            <div className="text-right ml-4 flex-shrink-0">
              <div className="text-sm text-gray-500">
                {formatCurrency(item.fact_amount)} из {formatCurrency(item.plan_amount)} ₽
              </div>
              <div className={`text-lg font-bold ${getPercentColor(item.execution_percent)}`}>
                {formatPercent(item.execution_percent)}
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && item.children?.map((child) => renderMobileRow(child))}
      </React.Fragment>
    )
  }

  const renderDesktopRow = (item: PlanFactRevenueData): React.ReactNode => {
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
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
            {formatCurrency(item.plan_amount)}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
            {formatCurrency(item.fact_amount)}
          </td>
          <td className={`px-6 py-3 text-sm text-right font-medium ${getPercentColor(item.execution_percent)}`}>
            {formatPercent(item.execution_percent)}
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
        columnCount={4}
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
                План-факт на {new Date(reportDate).toLocaleDateString('ru-RU')} г.
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
          <p>* Процент выполнения плана: зеленый &ge;100%, желтый &ge;80%, красный &lt;80%</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            План-факт на {new Date(reportDate).toLocaleDateString('ru-RU')} г.
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Нажмите на стрелки для сворачивания/разворачивания организаций
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
                Организация
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                План, ₽
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Факт, ₽
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                % выполнения плана
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.length > 0 ? (
              data.map((item) => renderDesktopRow(item))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-10 px-6 text-gray-500 dark:text-gray-400">
                  Нет данных для отображения.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>* Процент выполнения плана: зеленый &ge;100%, желтый &ge;80%, красный &lt;80%</p>
        <p>* Нажмите на стрелки для разворачивания/сворачивания подразделений</p>
      </div>
    </div>
  )
}

export default PlanFactRevenueReport
