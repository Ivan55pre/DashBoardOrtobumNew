import React, { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Menu } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useUserOrganizations } from '../hooks/useUserOrganizations'
import { useReportItems } from '../hooks/useReportItems'
import { formatCurrency } from '../utils/formatters'

// Interface based on CashBankReport.tsx
interface CashBankReportData {
  id: string
  account_id: string | null
  parent_account_id: string | null
  subconto: string | null
  account_name: string | null
  parent_id: string | null
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

const TelegramCashBankReport: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<CashBankReportData[]>([])
  const [loading, setLoading] = useState(true)
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
    let itemsToProcess: CashBankReportData[] = []
    const isConsolidatedView = (organizations?.length ?? 0) > 1

    if (hasRealData) {
      itemsToProcess = reportItems
      if (isConsolidatedView) {
        setActiveOrganizationName('Все организации')
      } else if (organizations?.length === 1) {
        setActiveOrganizationName(organizations[0].name)
      }
    } else {
      if (reportError) {
        console.error('Error loading report data:', reportError)
        setActiveOrganizationName('Ошибка загрузки отчета')
      } else {
        setActiveOrganizationName(isConsolidatedView ? 'Все организации' : organizations?.[0]?.name || 'Нет данных')
      }
    }

    const hierarchyData = buildHierarchy(itemsToProcess, isConsolidatedView)
    setData(hierarchyData)
    
    const initialExpanded = new Set<string>()
    itemsToProcess.forEach(item => {
      // Expand first few levels by default
      if (item.level <= 2) initialExpanded.add(item.id)
    })
    setExpandedRows(initialExpanded)
  }, [loading, reportItems, reportError, organizations, orgsError, reportDate])

  // buildHierarchy function adapted from CashBankReport.tsx
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
          // For consolidated view, we wrap organization-level totals
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
      // Single organization view
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

  const handleDesktopRedirect = () => {
    const currentUrl = window.location.href.replace(/\/telegram-cash-bank.*$/, '/reports')
    window.open(currentUrl, '_blank')
  }

  // renderRow function adapted from TelegramTurnoverReport and CashBankReport (mobile)
  const renderRow = (item: CashBankReportData): React.ReactNode => {
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
                    {item.account_name}
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
                {formatCurrency(item.balance_current)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Начало: {formatCurrency(item.balance_start)}
              </div>
              {item.income_amount > 0 && (
                <div className="text-xs text-green-600">
                  Приход: {formatCurrency(item.income_amount)}
                </div>
              )}
              {item.expense_amount > 0 && (
                <div className="text-xs text-red-600">
                  Расход: {formatCurrency(item.expense_amount)}
                </div>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && item.children?.map((child) => renderRow(child))}
      </React.Fragment>
    )
  }

  // Skeleton from TelegramTurnoverReport
  const TelegramReportSkeleton: React.FC = () => {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded w-3/5"></div>
          </div>
        </div>
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
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <Menu className="w-6 h-6 text-gray-600" />
          <h1 className="text-base font-semibold text-gray-900 truncate">
            {activeOrganizationName 
              ? `Денежные средства (${activeOrganizationName})` 
              : 'Денежные средства'}
          </h1>
        </div>
      </div>

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

export default TelegramCashBankReport