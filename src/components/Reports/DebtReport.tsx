import React, { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, Download, Calendar } from 'lucide-react'
import { useUserOrganizations } from '../../hooks/useUserOrganizations'
import { useReportItems } from '../../hooks/useReportItems'
import ReportSkeleton from './ReportSkeleton'

interface DebtReportData {
  id: string
  client_name: string
  parent_client_id: string | null
  debt_amount: number
  overdue_amount: number
  credit_amount: number
  organization_type: 'contractor' | 'supplier' | 'buyer' | 'group' | 'total'
  level: number
  is_total_row: boolean
  is_group_row: boolean
  organization_name?: string;
  children?: DebtReportData[]
  expanded?: boolean
}

const DebtReport: React.FC = () => {
  const [data, setData] = useState<DebtReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  
  const [selectedOrgId, setSelectedOrgId] = useState<string>('') // '' means "All Organizations"
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [availableCustomers, setAvailableCustomers] = useState<string[]>([])

  const { organizations, isLoading: isLoadingOrgs } = useUserOrganizations()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const targetOrgIds = useMemo(() => {
    if (isLoadingOrgs || !organizations) return null
    return selectedOrgId === '' ? organizations.map(o => o.id) : [selectedOrgId]
  }, [selectedOrgId, organizations, isLoadingOrgs])

  const { data: reportItems, isLoading: isLoadingReport, error: reportError } = useReportItems<DebtReportData>({
    organizationIds: targetOrgIds,
    reportType: 'debt',
    reportDate: reportDate,
    orderColumns: [{ column: 'level' }, { column: 'client_name' }],
  })

  useEffect(() => {
    setLoading(isLoadingOrgs || isLoadingReport)
  }, [isLoadingOrgs, isLoadingReport])

  useEffect(() => {
    if (loading) return

    const hasRealData = reportItems && reportItems.length > 0 && !reportError
    let itemsToProcess: DebtReportData[]

    if (hasRealData) {
      itemsToProcess = reportItems
    } else {
      if (reportError) console.error('Error loading debt report data:', reportError)
      itemsToProcess = []
    }

    const customers = [...new Set(itemsToProcess
      .filter(item => item.level >= 3 && item.client_name)
      .map(item => item.client_name as string)
    )]
    setAvailableCustomers(customers)

    let filteredData = itemsToProcess
    if (selectedCustomer) {
      filteredData = itemsToProcess.filter(item =>
        item.client_name === selectedCustomer ||
        item.is_total_row ||
        item.level <= 2
      )
    }

    const isConsolidatedView = selectedOrgId === '' && (organizations?.length ?? 0) > 1
    const hierarchyData = buildHierarchy(filteredData, isConsolidatedView)
    setData(hierarchyData)

    const initialExpanded = new Set<string>()
    filteredData.forEach(item => {
      if (item.level <= 2) initialExpanded.add(item.id)
    })
    setExpandedRows(initialExpanded)
  }, [loading, reportItems, reportError, organizations, selectedOrgId, selectedCustomer, reportDate])

  const buildHierarchy = (flatData: any[], isConsolidated: boolean = false): DebtReportData[] => {
    const map = new Map()
    const roots: DebtReportData[] = []

    flatData.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    if (isConsolidated) {
      const consolidatedTotal: DebtReportData = {
        id: 'consolidated-total',
        client_name: 'Консолидированный итог',
        parent_client_id: null,
        debt_amount: 0,
        overdue_amount: 0,
        credit_amount: 0,
        organization_type: 'total',
        level: 0,
        is_total_row: true,
        is_group_row: false,
        children: []
      }

      flatData.forEach(item => {
        const node = map.get(item.id)
        if (item.parent_client_id) {
          const parent = map.get(item.parent_client_id)
          if (parent) parent.children.push(node)
        } else {
          node.client_name = `${item.organization_name} - ${item.client_name}`
          consolidatedTotal.children?.push(node)
          if (item.is_total_row) {
            consolidatedTotal.debt_amount += item.debt_amount
            consolidatedTotal.overdue_amount += item.overdue_amount
            consolidatedTotal.credit_amount += item.credit_amount
          }
        }
      })
      roots.push(consolidatedTotal)
    } else {
      // Original logic for single organization view
      flatData.forEach(item => {
        const node = map.get(item.id)
        if (item.parent_client_id) {
          const parent = map.get(item.parent_client_id)
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

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  const exportToCSV = () => {
    const headers = [
      'Организация',
      'Сумма Дт',
      'в т.ч. просроченная Дт',
      'Сумма Кт'
    ]

    const flattenData = (items: DebtReportData[], result: any[] = []): any[] => {
      items.forEach(item => {
        result.push([
          item.client_name,
          item.debt_amount,
          item.overdue_amount,
          item.credit_amount
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
    a.download = `debt_report_${reportDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderMobileRow = (item: DebtReportData): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedRows.has(item.id)
    const paddingLeft = item.level * 16

    return (
      <React.Fragment key={item.id}>
        <div className={`border-b border-gray-200 py-3 px-4 ${
          item.is_total_row ? 'bg-gray-50 font-semibold' : 
          item.is_group_row ? 'bg-blue-50 font-medium' : 'bg-white'
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
                  } ${item.is_group_row ? 'text-blue-700' : ''}`}>
                    {item.client_name}
                  </h3>
                </div>
              </div>
            </div>
            
            <div className="text-right ml-4 flex-shrink-0">
              {item.debt_amount > 0 && (
                <div className="text-sm font-medium text-gray-900">
                  Дт: {formatCurrency(item.debt_amount)} ₽
                </div>
              )}
              {item.overdue_amount > 0 && (
                <div className="text-xs text-red-600 mt-1">
                  в т.ч. просроч.: {formatCurrency(item.overdue_amount)} ₽
                </div>
              )}
              {item.credit_amount > 0 && (
                <div className="text-sm font-medium text-gray-900 mt-1">
                  Кт: {formatCurrency(item.credit_amount)} ₽
                </div>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && item.children?.map((child) => renderMobileRow(child))}
      </React.Fragment>
    )
  }

  const renderDesktopRow = (item: DebtReportData): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedRows.has(item.id)
    const paddingLeft = item.level * 24

    return (
      <React.Fragment key={item.id}>
        <tr className={`hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors ${
          item.is_total_row ? 'bg-gray-100 dark:bg-dark-600 font-semibold' : 
          item.is_group_row ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''
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
                item.is_group_row ? 'font-medium text-blue-700 dark:text-blue-300' : ''
              } ${item.level > 0 ? 'text-gray-700 dark:text-gray-300' : ''}`}>
                {item.client_name}
              </span>
            </div>
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
            {item.debt_amount > 0 ? formatCurrency(item.debt_amount) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
            {item.overdue_amount > 0 ? formatCurrency(item.overdue_amount) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
            {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ''}
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
        filterCount={2}
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
                Задолженности
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

            {/* Mobile Filters */}
            <div className="space-y-2">
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

              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Все клиенты</option>
                {availableCustomers.map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
            </div>
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
          <p>* Дт - дебиторская задолженность (должны нам)</p>
          <p>* Кт - кредиторская задолженность (должны мы)</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Задолженности на {new Date(reportDate).toLocaleDateString('ru-RU')} г.
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Нажмите на стрелки для сворачивания/разворачивания организаций
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

          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Все клиенты</option>
            {availableCustomers.map(customer => (
              <option key={customer} value={customer}>{customer}</option>
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
                Сумма Дт
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                в т.ч. просроченная Дт
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Сумма Кт
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
        <p>* Дт - дебиторская задолженность (должны нам)</p>
        <p>* Кт - кредиторская задолженность (должны мы)</p>
        <p>* Нажмите на стрелки для разворачивания/сворачивания подразделений</p>
      </div>
    </div>
  )
}

export default DebtReport
