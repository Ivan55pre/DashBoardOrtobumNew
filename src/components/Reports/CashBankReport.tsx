import React, { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import { useUserOrganizations } from '../../hooks/useUserOrganizations'
import { useReportItems } from '../../hooks/useReportItems'
import { useReportDate } from '../../contexts/ReportDateContext'
import ReportSkeleton from './ReportSkeleton'

interface CashBankReportData {
  id: string
  account_id: string | null
  parent_account_id: string | null
  subconto: string | null
  account_name: string | null
  parent_id: string | null // FK на id в этой же таблице
  balance_start: number
  income_amount: number
  expense_amount: number
  balance_current: number
  account_type: 'bank' | 'cash' | 'total' | 'organization'
  level: number
  is_total_row: boolean
  organization_name?: string;
  children?: CashBankReportData[]
  expanded?: boolean
}

const CashBankReport: React.FC = () => {
  const [data, setData] = useState<CashBankReportData[]>([])
  const [loading, setLoading] = useState(true)
  const { reportDate } = useReportDate() // Используем глобальную дату
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)

  const [selectedOrgId, setSelectedOrgId] = useState<string>('') // '' means "All Organizations"
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([])

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

  const { data: reportItems, isLoading: isLoadingReport, error: reportError } = useReportItems<CashBankReportData>({
    organizationIds: targetOrgIds,
    reportType: 'cash_bank',
    reportDate: reportDate,
    orderColumns: [{ column: 'level' }, { column: 'account_name' }],
  })

  useEffect(() => {
    setLoading(isLoadingOrgs || isLoadingReport)
  }, [isLoadingOrgs, isLoadingReport])

  useEffect(() => {
    if (loading) return

    const hasRealData = reportItems && reportItems.length > 0 && !reportError
    let itemsToProcess: CashBankReportData[]

    if (hasRealData) {
      itemsToProcess = reportItems
    } else {
      if (reportError) console.error('Error loading cash_bank report data:', reportError)
      itemsToProcess = []
    }

    const accounts = [...new Set(itemsToProcess
      .filter(item => item.level === 2 && item.account_name)
      .map(item => item.account_name as string)
    )]
    setAvailableAccounts(accounts)

    let filteredData = itemsToProcess
    if (selectedAccount) {
      // Улучшенная логика фильтрации:
      // Собираем все связанные строки (выбранный счет, его потомки и все его предки)
      const finalItems = new Map<string, CashBankReportData>();

      // 1. Находим все строки счетов, соответствующие фильтру
      const selectedAccountItems = itemsToProcess.filter(
        item => item.account_name === selectedAccount && item.level === 2
      );

      // 2. Для каждого найденного счета, добавляем его, его детей и его родителей
      selectedAccountItems.forEach(accountItem => {
        // Добавляем сам счет
        if (accountItem.id) finalItems.set(accountItem.id, accountItem);

        // Добавляем его детей (субконто)
        itemsToProcess.forEach(child => {
          if (child.id && child.parent_id === accountItem.id) {
            finalItems.set(child.id, child);
          }
        });

        // Добавляем его родителей (вплоть до корня)
        let currentParentId = accountItem.parent_id;
        while (currentParentId) {
          const parentItem = itemsToProcess.find(item => item.id === currentParentId);
          if (parentItem && parentItem.id) {
            finalItems.set(parentItem.id, parentItem);
            currentParentId = parentItem.parent_id;
          } else {
            currentParentId = null;
          }
        }
      });

      filteredData = Array.from(finalItems.values());
    }

    const isConsolidatedView = selectedOrgId === '' && (organizations?.length ?? 0) > 1
    const hierarchyData = buildHierarchy(filteredData, isConsolidatedView)
    setData(hierarchyData)

    const initialExpanded = new Set<string>()
    // Если применен фильтр по счету, разворачиваем все узлы в отфильтрованном наборе.
    // Иначе, разворачиваем только верхние уровни по умолчанию.
    if (selectedAccount) {
      filteredData.forEach(item => item.id && initialExpanded.add(item.id));
    } else {
      filteredData.forEach(item => {
        if (item.level <= 2) {
          item.id && initialExpanded.add(item.id)
        }
      })
    }
    setExpandedRows(initialExpanded)
  }, [loading, reportItems, reportError, organizations, selectedOrgId, selectedAccount, reportDate])

  // Функция строит иерархию (дерево) из плоского списка, используя parent_id.
  // Этот метод надежнее, чем построение на основе уровней (level).
  const buildHierarchy = (flatData: any[], isConsolidated: boolean = false): CashBankReportData[] => {
    const map = new Map<string, any>()
    const roots: CashBankReportData[] = []

    flatData.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    if (isConsolidated) {
      const consolidatedTotal: CashBankReportData = {
        id: 'consolidated-total',
        account_name: 'Консолидированный итог',
        account_id: null,
        parent_account_id: null,
        parent_id: null,
        subconto: null,
        balance_start: 0,
        income_amount: 0,
        expense_amount: 0,
        balance_current: 0,
        account_type: 'total',
        level: 0,
        is_total_row: true,
        children: []
      }

      flatData.forEach(item => {
        const node = map.get(item.id)
        if (item.parent_id) {
          const parent = map.get(item.parent_id)
          if (parent) parent.children.push(node)
        } else {
          node.account_name = `${item.organization_name} - ${item.account_name}`
          consolidatedTotal.children?.push(node)
          if (item.is_total_row) {
            consolidatedTotal.balance_start += item.balance_start
            consolidatedTotal.income_amount += item.income_amount
            consolidatedTotal.expense_amount += item.expense_amount
            consolidatedTotal.balance_current += item.balance_current
          }
        }
      })
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

  const exportToCSV = () => {
    const headers = [
      'Организация',
      'Банковский счет',
      'Субконто',
      'Остаток на начало предыдущего рабочего дня',
      'Движение за предыдущий рабочий день Приход',
      'Движение за предыдущий рабочий день Расход',
      'Остаток на начало СЕГОДНЯШНЕГО дня'
    ]

    const flattenData = (items: CashBankReportData[], result: any[] = []): any[] => {
      items.forEach(item => {
        result.push([
          item.organization_name,
          item.account_name,
          item.subconto,
          item.balance_start,
          item.income_amount,
          item.expense_amount,
          item.balance_current
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
    a.download = `cash_bank_report_${reportDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderMobileRow = (item: CashBankReportData): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedRows.has(item.id)
    const paddingLeft = item.level * 16

    return (
      <React.Fragment key={item.id}>
        <div className={`border-b border-gray-200 py-3 px-4 ${
          item.is_total_row ? 'bg-gray-50 font-semibold' : 
          item.account_type === 'organization' ? 'bg-blue-50 font-medium' : 'bg-white'
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
                  } ${item.account_type === 'organization' ? 'text-blue-700' : ''}`}>
                    {item.organization_name || item.account_name}
                  </h3>
                  {item.subconto && (
                    <p className="text-xs text-gray-500 mt-1">
                      {item.subconto}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right ml-4 flex-shrink-0">
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(item.balance_current)} ₽
              </div>
              {item.balance_start !== item.balance_current && (
                <div className="text-xs text-gray-500 mt-1">
                  Остаток на начало: {formatCurrency(item.balance_start)} ₽
                </div>
              )}
              {(item.income_amount !== 0 || item.expense_amount !== 0) && (
                <div className="text-xs text-gray-500 mt-1">
                  {item.income_amount !== 0 && `Приход: ${formatCurrency(item.income_amount)} ₽`}
                  {item.expense_amount !== 0 && `Расход: ${formatCurrency(item.expense_amount)} ₽`}
                </div>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && item.children?.map((child) => renderMobileRow(child))}
      </React.Fragment>
    )
  }

  const renderDesktopRow = (item: CashBankReportData): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedRows.has(item.id)
    const paddingLeft = item.level * 24

    const renderIndentedName = (name: string | null | undefined) => (
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
          item.account_type === 'organization' ? 'font-medium text-blue-700 dark:text-blue-300' : ''
        } ${item.level > 0 ? 'text-gray-700 dark:text-gray-300' : ''}`}>
          {name}
        </span>
      </div>
    );

    return (
      <React.Fragment key={item.id}>
        <tr className={`hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors ${
          item.is_total_row ? 'bg-gray-100 dark:bg-dark-600 font-semibold' : 
          item.account_type === 'organization' ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''
        }`}>
          <td className="px-6 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
            {item.level < 2 ? renderIndentedName(item.organization_name || item.account_name) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
            {item.level === 2 ? renderIndentedName(item.account_name) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
            {item.level >= 3 ? renderIndentedName(item.subconto) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
            {item.balance_start !== 0 ? formatCurrency(item.balance_start) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
            {item.income_amount !== 0 ? formatCurrency(item.income_amount) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white">
            {item.expense_amount !== 0 ? formatCurrency(item.expense_amount) : ''}
          </td>
          <td className="px-6 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">
            {item.balance_current !== 0 ? formatCurrency(item.balance_current) : ''}
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
        filterCount={2}
      />
    )
  }

  // Отображаем ошибку, если она есть
  if (reportError) {
    return (
      <div className="card p-6">
        <div className="text-center py-10">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Ошибка загрузки данных</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{reportError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Перезагрузить страницу
          </button>
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
                Банковские счета рублевые
              </h3>
              <button
                onClick={exportToCSV}
                className="btn-primary text-sm px-3 py-1"
              >
                <Download className="w-4 h-4" />
              </button>
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
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Все счета</option>
                {availableAccounts.map(account => (
                  <option key={account} value={account}>{account}</option>
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
              Нет данных для выбранной даты и параметров
            </div>
          )}
        </div>

        <div className="p-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-700">
          <p>* Отчет показывает остатки денежных средств на банковских счетах и в кассе</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Банковские счета рублевые на {new Date(reportDate).toLocaleDateString('ru-RU')} г.
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

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Все счета</option>
            {availableAccounts.map(account => (
              <option key={account} value={account}>{account}</option>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Банковский счет
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Субконто
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Остаток на начало предыдущего рабочего дня
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Движение за предыдущий рабочий день Приход
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Движение за предыдущий рабочий день Расход
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Остаток на начало СЕГОДНЯШНЕГО дня
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.length > 0 ? (
              data.map((item) => renderDesktopRow(item))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-10 px-6 text-gray-500 dark:text-gray-400">
                  Нет данных для выбранной даты и параметров
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>* Отчет показывает остатки денежных средств на банковских счетах и в кассе</p>
        <p>* Нажмите на стрелки для разворачивания/сворачивания счетов организации</p>
      </div>
    </div>
  )
}

export default CashBankReport
