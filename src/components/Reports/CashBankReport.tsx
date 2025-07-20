import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Download, Calendar } from 'lucide-react'
import { supabase } from '../../contexts/AuthContext'
import { useAuth } from '../../contexts/AuthContext'

interface CashBankReportData {
  id: string
  organization_name: string
  account_name: string | null
  parent_id: string | null
  balance_start: number
  income_amount: number
  expense_amount: number
  balance_current: number
  account_type: 'bank' | 'cash' | 'total' | 'organization'
  level: number
  is_total_row: boolean
  children?: CashBankReportData[]
  expanded?: boolean
}

const CashBankReport: React.FC = () => {
  const { user } = useAuth()
  const [data, setData] = useState<CashBankReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  
  // Filter states
  const [selectedOrganization, setSelectedOrganization] = useState<string>('')
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [availableOrganizations, setAvailableOrganizations] = useState<string[]>([])
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([])

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

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, reportDate, selectedOrganization, selectedAccount])

  const loadData = async () => {
    setLoading(true)
    
    try {
      const { data: existingData, error } = await supabase
        .from('cash_bank_reports')
        .select('*')
        .eq('report_date', reportDate)
        .order('level', { ascending: true })
        .order('account_name', { ascending: true })

      if (error) throw error

      if (existingData && existingData.length > 0) {
        // Populate filter options
        const organizations = [...new Set(existingData
          .filter(item => item.level === 1)
          .map(item => item.account_name))]
        setAvailableOrganizations(organizations)

        const accounts = [...new Set(existingData
          .filter(item => item.level === 2)
          .map(item => item.account_name))]
        setAvailableAccounts(accounts)

        // Apply filters
        let filteredData = existingData
        
        if (selectedOrganization) {
          filteredData = filteredData.filter(item => 
            item.account_name === selectedOrganization || 
            item.is_total_row ||
            (item.level > 1 && existingData.some(parent => 
              parent.id === item.parent_id && 
              parent.account_name === selectedOrganization
            ))
          )
        }

        if (selectedAccount) {
          filteredData = filteredData.filter(item => 
            item.account_name === selectedAccount || 
            item.is_total_row ||
            item.level <= 1
          )
        }

        const hierarchyData = buildHierarchy(filteredData)
        setData(hierarchyData)
        
        // Set initial expanded rows for loaded data
        const initialExpanded = new Set<string>()
        filteredData.forEach(item => {
          if (item.level <= 2) {
            initialExpanded.add(item.id)
          }
        })
        setExpandedRows(initialExpanded)
      } else {
        // Создаем демо-данные если их нет
        await createSampleData('Маркова-Дорей Ю.В. ИП')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // Показываем демо-данные в случае ошибки
      const sampleData = getSampleData()
      
      // Populate filter options from sample data
      const flatSample = flattenHierarchy(sampleData)
      const organizations = [...new Set(flatSample //
        .filter(item => item.level === 1)
        .map(item => item.account_name))]
      setAvailableOrganizations(organizations)

      const accounts = [...new Set(flatSample
        .filter(item => item.level === 2)
        .map(item => item.account_name))] //
      setAvailableAccounts(accounts)

      // Apply filters to sample data
      let filteredSample = flatSample
      
      if (selectedOrganization) {
        filteredSample = filteredSample.filter(item =>
          item.account_name === selectedOrganization ||
          item.is_total_row ||
          (item.level > 1 && flatSample.some(parent => 
            parent.id === item.parent_id &&
            parent.account_name === selectedOrganization
          ))
        )
      }

      if (selectedAccount) {
        filteredSample = filteredSample.filter(item => 
          item.account_name === selectedAccount || 
          item.is_total_row ||
          item.level <= 1
        )
      }

      const hierarchyData = buildHierarchy(filteredSample)
      setData(hierarchyData)
      
      // Set initial expanded rows for sample data
      const initialExpanded = new Set<string>()
      filteredSample.forEach(item => {
        if (item.level <= 2) {
          initialExpanded.add(item.id)
        }
      })
      setExpandedRows(initialExpanded)
    } finally {
      setLoading(false)
    }
  }

  const createSampleData = async (organizationName: string) => {
    const sampleData = getSampleData(organizationName)
    const reportItems = flattenHierarchy(sampleData).map(item => ({
      account_name: item.account_name,
      balance_start: item.balance_start,
      income_amount: item.income_amount,
      expense_amount: item.expense_amount,
      balance_current: item.balance_current,
      account_type: item.account_type,
      level: item.level,
      currency: 'RUB',
      is_total_row: item.is_total_row,
    }))
    
    try {
      const { error } = await supabase
        .rpc('upsert_cash_bank_report', {
          p_organization_name: organizationName,
          p_report_date: reportDate,
          p_report_items: reportItems
        })

      if (error) throw error
      
      // Reload data to apply filters
      await loadData()
    } catch (error) {
      console.error('Error creating sample data:', error)
      const sampleData = getSampleData()
      
      // Populate filter options from sample data
      const flatSample = flattenHierarchy(sampleData)
      const organizations = [...new Set(flatSample
        .filter(item => item.level === 1)
        .map(item => item.account_name))]
      setAvailableOrganizations(organizations)

      const accounts = [...new Set(flatSample
        .filter(item => item.level === 2)
        .map(item => item.account_name))]
      setAvailableAccounts(accounts)

      setData(sampleData)
      
      // Set initial expanded rows even on error
      const initialExpanded = new Set<string>()
      const flatSampleData = flattenHierarchy(sampleData)
      flatSampleData.forEach(item => {
        if (item.level <= 2) {
          initialExpanded.add(item.id)
        }
      })
      setExpandedRows(initialExpanded)
    }
  }

  const flattenHierarchy = (items: CashBankReportData[]): CashBankReportData[] => {
    const result: CashBankReportData[] = []
    
    const flatten = (items: CashBankReportData[]) => {
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

  const getSampleData = (organizationName: string = 'Маркова-Дорей Ю.В. ИП'): CashBankReportData[] => {
    // Generate UUIDs for the sample data
    const uuid1 = generateUUID()
    const uuid2 = generateUUID()
    const uuid3 = generateUUID()
    const uuid4 = generateUUID()
    const uuid5 = generateUUID()
    const uuid6 = generateUUID()
    const uuid7 = generateUUID()
    const uuid8 = generateUUID()
    const uuid9 = generateUUID()

    return [
      {
        id: uuid1, // Total row
        organization_name: organizationName,
        account_name: 'Итого',
        parent_id: null,
        balance_start: 7413741,
        income_amount: 0,
        expense_amount: 0,
        balance_current: 7413741,
        account_type: 'total',
        level: 0,
        is_total_row: true,
        children: [
          {
            id: uuid2,
            organization_name: organizationName,
            account_name: organizationName,
            parent_id: uuid1,
            balance_start: 4717137,
            income_amount: 0,
            expense_amount: 0,
            balance_current: 4717137,
            account_type: 'organization',
            level: 1,
            is_total_row: false,
            children: [
              {
                id: uuid3,
                organization_name: organizationName,
                account_name: 'Альфа-банк',
                parent_id: uuid2,
                balance_start: 63882,
                income_amount: 0,
                expense_amount: 0,
                balance_current: 63882,
                account_type: 'bank',
                level: 2,
                is_total_row: false
              },
              {
                id: uuid4,
                organization_name: organizationName,
                account_name: 'НБД',
                parent_id: uuid2,
                balance_start: 275308,
                income_amount: 0,
                expense_amount: 0,
                balance_current: 275308,
                account_type: 'bank',
                level: 2,
                is_total_row: false
              },
              {
                id: uuid5,
                organization_name: organizationName,
                account_name: 'Сбербанк',
                parent_id: uuid2,
                balance_start: 4248450,
                income_amount: 0,
                expense_amount: 0,
                balance_current: 4248450,
                account_type: 'bank',
                level: 2,
                is_total_row: false
              }
            ]
          },
          {
            id: uuid6,
            organization_name: 'ООО "ОРТОБУМ"', // This is a different org, for demo purposes
            account_name: 'ООО "ОРТОБУМ"',
            parent_id: uuid1,
            balance_start: 2696604,
            income_amount: 0,
            expense_amount: 0,
            balance_current: 2696604,
            account_type: 'organization',
            level: 1,
            is_total_row: false,
            children: [
              {
                id: uuid7,
                organization_name: 'ООО "ОРТОБУМ"',
                account_name: 'Альфа-банк',
                parent_id: uuid6,
                balance_start: 1767627,
                income_amount: 0,
                expense_amount: 0,
                balance_current: 1767627,
                account_type: 'bank',
                level: 2,
                is_total_row: false
              },
              {
                id: uuid8,
                organization_name: 'ООО "ОРТОБУМ"',
                account_name: 'Сбербанк 8301',
                parent_id: uuid6,
                balance_start: 851443,
                income_amount: 0,
                expense_amount: 0,
                balance_current: 851443,
                account_type: 'bank',
                level: 2,
                is_total_row: false
              },
              {
                id: uuid9,
                organization_name: 'ООО "ОРТОБУМ"',
                account_name: 'ЮникредитБанк',
                parent_id: uuid6,
                balance_start: 52275,
                income_amount: 0,
                expense_amount: 0,
                balance_current: 52275,
                account_type: 'bank',
                level: 2,
                is_total_row: false
              }
            ]
          }
        ]
      }
    ]
  }

  const buildHierarchy = (flatData: CashBankReportData[]): CashBankReportData[] => {
    const roots: CashBankReportData[] = []
    if (!flatData || flatData.length === 0) return roots

    const parentStack: CashBankReportData[] = []

    // Data must be sorted by level
    const sortedData = [...flatData].sort((a, b) => a.level - b.level || (a.account_name || '').localeCompare(b.account_name || ''))

    for (const item of sortedData) {
      const node = { ...item, children: [] as CashBankReportData[], expanded: true }

      while (parentStack.length > 0 && node.level <= parentStack[parentStack.length - 1].level) {
        parentStack.pop()
      }

      if (parentStack.length === 0) {
        roots.push(node)
      } else {
        const parent = parentStack[parentStack.length - 1]
        parent.children.push(node)
        node.parent_id = parent.id
      }
      parentStack.push(node)
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
                    {item.account_name || item.organization_name}
                  </h3>
                  {item.account_name !== item.organization_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      {item.account_name}
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

    return (
      <React.Fragment key={item.id}>
        <tr className={`hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors ${
          item.is_total_row ? 'bg-gray-100 dark:bg-dark-600 font-semibold' : 
          item.account_type === 'organization' ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''
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
                item.account_type === 'organization' ? 'font-medium text-blue-700 dark:text-blue-300' : ''
              } ${item.level > 0 ? 'text-gray-700 dark:text-gray-300' : ''}`}>
                {item.level > 0 ? item.account_name : item.organization_name}
              </span>
            </div>
          </td>
          <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
            {item.level > 1 ? item.account_name : ''}
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
                Банковские счета рублевые
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
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Все организации</option>
                {availableOrganizations.map(org => (
                  <option key={org} value={org}>{org}</option>
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
          {data.map((item) => renderMobileRow(item))}
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
            value={selectedOrganization}
            onChange={(e) => setSelectedOrganization(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Все организации</option>
            {availableOrganizations.map(org => (
              <option key={org} value={org}>{org}</option>
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
            {data.map((item) => renderDesktopRow(item))}
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
